import { PrismaClient } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  creditPlans,
  defaultCreditPolicy,
  pricingExtras,
  manualModelsForPlan,
  supportedProviders,
} from './credit-defaults';
import {
  autoCredits,
  modelCredits,
  requestCostBound,
  PROVIDER_USD_PER_CREDIT,
} from '../src/modules/workspace/credits';

const prisma = new PrismaClient();

async function main() {
  const updatePrices = process.argv.includes('--update-prices');
  if (process.env.NODE_ENV !== 'development')
    throw new Error(
      'This configuration update is for development databases only.',
    );
  const plans = await prisma.billingPlan.findMany({
    where: { code: { in: Object.keys(creditPlans) } },
    include: { generationPolicies: true },
  });
  const models = await prisma.aIModel.findMany();
  if (updatePrices && plans.some((plan) => plan.currency !== 'USD'))
    throw new Error(
      'Default price updates require USD plans; no currency conversion is implied.',
    );
  const currentModels = models.filter(
    (m) =>
      m.enabled &&
      supportedProviders.some((provider) => provider === m.provider),
  );
  const report = (Object.keys(creditPlans) as (keyof typeof creditPlans)[]).map(
    (code) => {
      const plan = plans.find((item) => item.code === code) ?? {
        id: randomUUID(),
        code,
        currency: 'USD',
        ...creditPlans[code],
      };
      const policies = [
        undefined,
        ...manualModelsForPlan(code, currentModels),
      ].map((model) =>
        defaultCreditPolicy(plan.id, code, currentModels, model),
      );
      return { plan, code, policies };
    },
  );
  if (process.argv.includes('--apply')) {
    const protectedSubscriptions = await prisma.billingSubscription.count({
      where: { status: { in: ['ACTIVE', 'PENDING', 'PAST_DUE', 'UNPAID'] } },
    });
    const reservations = await prisma.quotaReservation.count({
      where: { status: 'RESERVED' },
    });
    if (protectedSubscriptions || reservations)
      throw new Error(
        'Existing subscriptions or in-progress generations need a separate migration; no changes made.',
      );
    const directory = resolve('storage');
    await mkdir(directory, { recursive: true });
    const backup = resolve(
      directory,
      `credit-design-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    );
    await writeFile(backup, JSON.stringify({ plans, models }, null, 2), {
      flag: 'wx',
      mode: 0o600,
    });
    await prisma.$transaction(async (tx) => {
      await tx.aIModel.updateMany({
        where: { provider: 'GROQ' },
        data: { enabled: false, autoAvailable: false, manualAvailable: false },
      });
      for (const model of currentModels) {
        await tx.aIModel.update({
          where: { id: model.id },
          data: { additionalPrices: pricingExtras(model) },
        });
      }
      for (const { plan, code, policies } of report) {
        // Price changes require an explicit flag; usage/history always stay intact.
        const { originalPrice, ...defaults } = creditPlans[code];
        const updatedPlan = await tx.billingPlan.upsert({
          where: { code },
          create: { id: plan.id, code, currency: 'USD', ...creditPlans[code] },
          update: {
            ...defaults,
            ...(updatePrices || ['FREE', 'GUEST'].includes(code)
              ? { originalPrice }
              : {}),
          },
        });
        if (
          plan.originalPrice !== updatedPlan.originalPrice ||
          plan.monthlyCredits !== updatedPlan.monthlyCredits
        )
          await tx.pricingHistory.create({
            data: {
              planId: updatedPlan.id,
              changeType: 'DEVELOPMENT_CREDIT_DESIGN_UPDATED',
              before: {
                originalPrice: plan.originalPrice,
                monthlyCredits: plan.monthlyCredits,
                currency: plan.currency,
              },
              after: {
                originalPrice: updatedPlan.originalPrice,
                monthlyCredits: updatedPlan.monthlyCredits,
                currency: updatedPlan.currency,
              },
            },
          });
        await tx.generationPolicy.updateMany({
          where: {
            planId: plan.id,
            bucket: { notIn: policies.map((p) => p.bucket) },
          },
          data: { enabled: false },
        });
        for (const policy of policies) {
          await tx.generationPolicy.upsert({
            where: {
              planId_bucket: { planId: plan.id, bucket: policy.bucket },
            },
            create: policy,
            update: policy,
          });
        }
      }
    });
    console.log(
      `Applied development credit design. Previous configuration saved to ${backup}`,
    );
  } else
    console.log(
      'Preview only. Pass --apply to update the development configuration.',
    );
  for (const { plan, code, policies } of report) {
    console.log(
      `${code}: ${creditPlans[code].monthlyCredits} credits/month, estimated provider budget $${(creditPlans[code].monthlyCredits * PROVIDER_USD_PER_CREDIT).toFixed(2)}`,
    );
    for (const policy of policies) {
      const model = currentModels.find((m) => m.id === policy.modelId);
      const priced = model && {
        ...model,
        additionalPrices: pricingExtras(model),
      };
      const limits = {
        maxContext: policy.maxContext,
        maxOutput: policy.maxOutput,
      };
      const routing = { routing: policy.routing! } as Parameters<
        typeof autoCredits
      >[0];
      console.log(
        JSON.stringify({
          model: model?.displayName ?? 'Auto',
          dailyLimit: policy.dailyLimit,
          chatCredits: priced
            ? modelCredits(priced, limits)
            : autoCredits(routing),
          imageCredits:
            policy.allowedFeatures &&
            (policy.allowedFeatures as string[]).includes('image_generation')
              ? priced
                ? modelCredits(priced, limits, 'image_generation')
                : autoCredits(routing, 'image_generation')
              : null,
          ...(priced
            ? { estimatedChatCostBoundUsd: requestCostBound(priced, limits) }
            : {}),
        }),
      );
    }
    if (!['FREE', 'GUEST'].includes(code))
      console.log(
        `Configured price: ${plan.currency} ${((updatePrices ? creditPlans[code].originalPrice : plan.originalPrice) / 100).toFixed(2)}${updatePrices ? ' (updated default)' : ' (unchanged)'}`,
      );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
