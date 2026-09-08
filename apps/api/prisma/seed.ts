import { MembershipPlan, ModelProvider, PrismaClient } from '@prisma/client';
import {
  creditPlans,
  defaultCreditPolicy,
  pricingExtras,
  publicPlanCodes,
  manualModelsForPlan,
} from './credit-defaults';

const prisma = new PrismaClient();

const modelSeed = [
  {
    provider: ModelProvider.OPENAI,
    providerModelId: 'gpt-4o-mini',
    displayName: 'GPT-4o mini',
    description: 'Fast, economical general-purpose chat.',
    qualityTier: 2,
    routingPriority: 30,
    routingCostScore: 0.2,
    inputPrice: 0.15,
    cachedInputPrice: 0.075,
    outputPrice: 0.6,
    maxContext: 128000,
    maxOutput: 4096,
    capabilities: ['text', 'vision', 'files', 'image_generation'],
  },
  {
    provider: ModelProvider.GOOGLE,
    providerModelId: 'gemini-2.5-flash-lite',
    displayName: 'Gemini 2.5 Flash-Lite',
    description: 'Low-latency model for everyday work and files.',
    qualityTier: 2,
    routingPriority: 20,
    routingCostScore: 0.18,
    inputPrice: 0.1,
    cachedInputPrice: 0.01,
    outputPrice: 0.4,
    maxContext: 1000000,
    maxOutput: 8192,
    capabilities: ['text', 'vision', 'files'],
  },
  {
    provider: ModelProvider.ANTHROPIC,
    providerModelId: 'claude-haiku-4-5-20251001',
    displayName: 'Claude Haiku 4.5',
    description: 'Clear, concise responses with strong instruction following.',
    qualityTier: 2,
    routingPriority: 10,
    routingCostScore: 0.3,
    inputPrice: 1,
    cachedInputPrice: 0.1,
    outputPrice: 5,
    maxContext: 200000,
    maxOutput: 4096,
    capabilities: ['text', 'vision', 'files'],
  },
  {
    provider: ModelProvider.MISTRAL,
    providerModelId: 'mistral-small-latest',
    displayName: 'Mistral Small',
    description: 'Efficient general-purpose chat for everyday tasks.',
    qualityTier: 2,
    routingPriority: 15,
    routingCostScore: 0.16,
    inputPrice: 0.15,
    cachedInputPrice: 0.015,
    outputPrice: 0.6,
    maxContext: 128000,
    maxOutput: 4096,
    capabilities: ['text', 'coding', 'vision', 'image_generation'],
  },
  {
    provider: ModelProvider.GOOGLE,
    providerModelId: 'gemini-2.5-flash-image',
    displayName: 'Gemini 2.5 Flash Image',
    description: 'Image generation and editing with text and image inputs.',
    qualityTier: 2,
    routingPriority: 0,
    routingCostScore: 5,
    inputPrice: 0.3,
    cachedInputPrice: 0.3,
    outputPrice: 30,
    maxContext: 32768,
    maxOutput: 8192,
    capabilities: ['text', 'vision', 'image_generation'],
  },
];

async function main() {
  if (process.env.NODE_ENV === 'production')
    throw new Error(
      'Development seeds are disabled in production. Configure models and plans through the admin panel.',
    );
  const plans = await Promise.all(
    publicPlanCodes.map((code) =>
      prisma.billingPlan.upsert({
        where: { code },
        update: {},
        create: {
          code,
          ...creditPlans[code],
          isActive: true,
          ...(code === 'FREE'
            ? { legacyPlan: MembershipPlan.FREE }
            : code === 'PRO'
              ? { legacyPlan: MembershipPlan.PRO }
              : {}),
        },
      }),
    ),
  );

  const models = [];
  for (const [index, seed] of modelSeed.entries()) {
    const model = await prisma.aIModel.upsert({
      where: {
        provider_providerModelId: {
          provider: seed.provider,
          providerModelId: seed.providerModelId,
        },
      },
      update: {},
      create: {
        ...seed,
        additionalPrices: pricingExtras({ ...seed, additionalPrices: {} }),
        enabled: true,
        autoAvailable: true,
        displayOrder: index,
      },
    });
    models.push(model);
  }

  for (const plan of plans) {
    const code = plan.code as (typeof publicPlanCodes)[number];
    const selections = [undefined, ...manualModelsForPlan(code, models)];
    for (const model of selections) {
      const policy = defaultCreditPolicy(plan.id, code, models, model);
      await prisma.generationPolicy.upsert({
        where: { planId_bucket: { planId: plan.id, bucket: policy.bucket } },
        update: {},
        create: policy,
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
