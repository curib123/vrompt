import { AIModel, BillingInterval, Prisma } from '@prisma/client';

export const creditPlans = {
  FREE: {
    name: 'Free',
    displayOrder: 0,
    maxProjects: 0,
    maxWorkflows: 0,
    monthlyCredits: 30,
    originalPrice: 0,
    billingInterval: BillingInterval.MONTH,
    description:
      '30 monthly credits for Auto text chat, with up to 5 messages a day.',
  },
  PRO: {
    name: 'Pro',
    displayOrder: 2,
    maxProjects: 30,
    maxWorkflows: 50,
    monthlyCredits: 250,
    originalPrice: 1199,
    billingInterval: BillingInterval.MONTH,
    description:
      '250 monthly credits for regular work, with manual models, files and image generation.',
  },
  STARTER: {
    name: 'Starter',
    displayOrder: 1,
    maxProjects: 5,
    maxWorkflows: 0,
    monthlyCredits: 100,
    originalPrice: 599,
    billingInterval: BillingInterval.MONTH,
    description:
      '100 monthly credits for everyday questions, economical manual models and one file per message.',
  },
  MAX: {
    name: 'Max',
    displayOrder: 3,
    maxProjects: 100,
    maxWorkflows: 150,
    monthlyCredits: 600,
    originalPrice: 2499,
    billingInterval: BillingInterval.MONTH,
    description:
      '600 monthly credits for bigger workloads, with all supported models, images and more workspace capacity.',
  },
};

export const publicPlanCodes = ['FREE', 'STARTER', 'PRO', 'MAX'] as const;
export const supportedProviders = [
  'OPENAI',
  'GOOGLE',
  'ANTHROPIC',
  'MISTRAL',
] as const;

export const economicalModelIds = new Set([
  'gpt-4o-mini',
  'gemini-2.5-flash-lite',
  'mistral-small-latest',
]);

export function manualModelsForPlan(
  code: keyof typeof creditPlans,
  models: AIModel[],
) {
  return models.filter(
    (model) =>
      model.enabled &&
      model.manualAvailable &&
      supportedProviders.some((provider) => provider === model.provider) &&
      (code === 'PRO' ||
        code === 'MAX' ||
        (code === 'STARTER' && economicalModelIds.has(model.providerModelId))),
  );
}

// Gemini's native image output costs $30 / 1M tokens. $0.25 covers the
// model's 8,192-token output cap; unpriced external image tools stay disabled.
export function pricingExtras(
  model: Pick<AIModel, 'provider' | 'providerModelId' | 'additionalPrices'>,
): Prisma.JsonObject {
  return {
    ...(model.additionalPrices as Prisma.JsonObject),
    ...(model.provider === 'ANTHROPIC' &&
    model.providerModelId === 'claude-haiku-4-5-20251001'
      ? { cacheWriteInputPrice: 1.25 }
      : {}),
    ...(model.provider === 'GOOGLE' &&
    model.providerModelId === 'gemini-2.5-flash-image'
      ? { maxImageOutputCostUsd: 0.25 }
      : {}),
  };
}

export function defaultCreditPolicy(
  planId: string,
  code: keyof typeof creditPlans,
  models: AIModel[],
  model?: AIModel,
): Prisma.GenerationPolicyUncheckedCreateInput {
  const pro = code === 'PRO' || code === 'MAX';
  const starter = code === 'STARTER';
  const paid = pro || starter;
  const auto = !model;
  const imageModels = models.filter(
    (m) =>
      m.provider === 'GOOGLE' && m.providerModelId === 'gemini-2.5-flash-image',
  );
  const imageEnabled =
    pro &&
    (auto
      ? imageModels.length > 0
      : imageModels.some((m) => m.id === model.id));
  return {
    planId,
    bucket: model?.id ?? 'AUTO',
    modelId: model?.id ?? null,
    enabled: paid || auto,
    dailyLimit: code === 'MAX' ? 100 : pro ? 50 : starter ? 15 : 5,
    monthlyLimit: creditPlans[code].monthlyCredits,
    maxInputChars: pro ? 12000 : starter ? 8000 : 4000,
    maxContext: pro ? (auto ? 16384 : 32768) : starter ? 16384 : 8192,
    maxOutput: pro ? (auto ? 2048 : 4096) : starter ? 2048 : 1024,
    maxFiles: pro ? 2 : starter ? 1 : 0,
    maxFileBytes: paid ? 5_000_000 : 1,
    maxDurationSeconds: paid ? 90 : 30,
    concurrency: code === 'MAX' ? 3 : pro ? 2 : 1,
    ratePerMinute: code === 'MAX' ? 30 : pro ? 15 : starter ? 6 : 3,
    allowedFeatures: imageEnabled ? ['chat', 'image_generation'] : ['chat'],
    routing: {
      allowedModelIds: models
        .filter(
          (m) =>
            supportedProviders.some((provider) => provider === m.provider) &&
            (economicalModelIds.has(m.providerModelId) ||
              (pro && imageModels.some((image) => image.id === m.id))),
        )
        .map((m) => m.id),
      creditCost: 1,
      ...(imageEnabled ? { imageCreditCost: 35 } : {}),
      attemptTimeoutSeconds: 30,
      maxAttempts: pro && auto ? 2 : 1,
      minimumQualityTier: 1,
      costWeight: 1,
      rules: [],
    },
  };
}
