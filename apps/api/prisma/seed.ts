import {
  BillingInterval,
  MembershipPlan,
  ModelProvider,
  PrismaClient,
} from '@prisma/client';

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
    providerModelId: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    description: 'Low-latency model for everyday work and files.',
    qualityTier: 2,
    routingPriority: 20,
    routingCostScore: 0.18,
    inputPrice: 0.1,
    cachedInputPrice: 0.025,
    outputPrice: 0.4,
    maxContext: 1000000,
    maxOutput: 8192,
    capabilities: ['text', 'vision', 'files'],
  },
  {
    provider: ModelProvider.ANTHROPIC,
    providerModelId: 'claude-3-5-haiku-latest',
    displayName: 'Claude 3.5 Haiku',
    description: 'Clear, concise responses with strong instruction following.',
    qualityTier: 2,
    routingPriority: 10,
    routingCostScore: 0.3,
    inputPrice: 0.8,
    cachedInputPrice: 0.08,
    outputPrice: 4,
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
    inputPrice: 0.1,
    cachedInputPrice: 0.03,
    outputPrice: 0.3,
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
  const plans = await Promise.all([
    prisma.billingPlan.upsert({
      where: { code: 'FREE' },
      update: {
        name: 'Free',
        description: 'Try the workspace with a shared model allowance.',
        originalPrice: 0,
        legacyPlan: MembershipPlan.FREE,
        billingInterval: BillingInterval.MONTH,
        isActive: true,
      },
      create: {
        code: 'FREE',
        name: 'Free',
        description: 'Try the workspace with a shared model allowance.',
        originalPrice: 0,
        legacyPlan: MembershipPlan.FREE,
        billingInterval: BillingInterval.MONTH,
        isActive: true,
      },
    }),
    prisma.billingPlan.upsert({
      where: { code: 'PRO' },
      update: {
        name: 'Pro',
        description: 'Higher limits and access to every enabled model.',
        originalPrice: 1900,
        legacyPlan: MembershipPlan.PRO,
        billingInterval: BillingInterval.MONTH,
        isActive: true,
      },
      create: {
        code: 'PRO',
        monthlyCredits: 5000,
        maxProjects: 30,
        maxWorkflows: 50,
        name: 'Pro',
        description: 'Higher limits and access to every enabled model.',
        originalPrice: 1900,
        legacyPlan: MembershipPlan.PRO,
        billingInterval: BillingInterval.MONTH,
        isActive: true,
      },
    }),
  ]);

  const models = [];
  for (const [index, seed] of modelSeed.entries()) {
    const model = await prisma.aIModel.upsert({
      where: {
        provider_providerModelId: {
          provider: seed.provider,
          providerModelId: seed.providerModelId,
        },
      },
      update: {
        ...seed,
        enabled: true,
        autoAvailable:
          index < 2 || seed.capabilities.includes('image_generation'),
        displayOrder: index,
      },
      create: {
        ...seed,
        enabled: true,
        autoAvailable:
          index < 2 || seed.capabilities.includes('image_generation'),
        displayOrder: index,
      },
    });
    models.push(model);
  }

  await prisma.aIModel.update({
    where: { id: models[0]!.id },
    data: { fallbackId: models[1]!.id },
  });

  const guest = await prisma.billingPlan.upsert({
    where: { code: 'GUEST' },
    update: {},
    create: {
      code: 'GUEST',
      name: 'Guest',
      description: 'Temporary Auto text chat',
      originalPrice: 0,
      currency: 'USD',
      billingInterval: BillingInterval.MONTH,
      monthlyCredits: 6,
    },
  });
  await prisma.generationPolicy.upsert({
    where: { planId_bucket: { planId: guest.id, bucket: 'AUTO' } },
    update: {},
    create: {
      planId: guest.id,
      bucket: 'AUTO',
      dailyLimit: 3,
      monthlyLimit: 6,
      maxInputChars: 2000,
      maxContext: 8000,
      maxOutput: 512,
      maxFiles: 0,
      maxFileBytes: 1,
      maxDurationSeconds: 30,
      concurrency: 1,
      ratePerMinute: 2,
      allowedFeatures: ['chat'],
      routing: {
        allowedModelIds: models.slice(0, 2).map((m) => m.id),
        maxAttempts: 1,
        minimumQualityTier: 1,
        costWeight: 1,
        rules: [],
      },
    },
  });
  const modelIds = models.map((model) => model.id);
  for (const plan of plans) {
    const routing = {
      allowedModelIds: models
        .filter(
          (m) =>
            plan.code !== 'FREE' ||
            m.providerModelId === 'gpt-4o-mini' ||
            m.providerModelId === 'gemini-2.0-flash',
        )
        .map((m) => m.id),
      attemptTimeoutSeconds: 30,
      maxAttempts: 3,
      minimumQualityTier: 1,
      costWeight: 1,
      rules: [
        {
          task: 'technical',
          keywords: ['debug', 'refactor', 'architecture', 'algorithm'],
          qualityTier: 2,
          capabilities: ['text'],
        },
      ],
    };
    const buckets = plan.code === 'FREE' ? ['AUTO'] : ['AUTO', ...modelIds];
    for (const bucket of buckets) {
      await prisma.generationPolicy.upsert({
        where: { planId_bucket: { planId: plan.id, bucket } },
        update: {
          modelId: bucket === 'AUTO' ? null : bucket,
          routing,
          allowedFeatures: ['chat', 'image_generation'],
          dailyLimit: plan.code === 'FREE' ? 20 : 200,
          monthlyLimit: plan.code === 'FREE' ? 200 : 5000,
          maxInputChars: plan.code === 'FREE' ? 12000 : 50000,
          maxContext: plan.code === 'FREE' ? 32000 : 128000,
          maxOutput: plan.code === 'FREE' ? 2048 : 8192,
          maxFiles: plan.code === 'FREE' ? 1 : 5,
          maxFileBytes: plan.code === 'FREE' ? 5_000_000 : 20_000_000,
          maxDurationSeconds: 90,
          concurrency: plan.code === 'FREE' ? 1 : 3,
          ratePerMinute: plan.code === 'FREE' ? 6 : 30,
          enabled: true,
        },
        create: {
          planId: plan.id,
          routing,
          bucket,
          modelId: bucket === 'AUTO' ? null : bucket,
          allowedFeatures: ['chat', 'image_generation'],
          dailyLimit: plan.code === 'FREE' ? 20 : 200,
          monthlyLimit: plan.code === 'FREE' ? 200 : 5000,
          maxInputChars: plan.code === 'FREE' ? 12000 : 50000,
          maxContext: plan.code === 'FREE' ? 32000 : 128000,
          maxOutput: plan.code === 'FREE' ? 2048 : 8192,
          maxFiles: plan.code === 'FREE' ? 1 : 5,
          maxFileBytes: plan.code === 'FREE' ? 5_000_000 : 20_000_000,
          maxDurationSeconds: 90,
          concurrency: plan.code === 'FREE' ? 1 : 3,
          ratePerMinute: plan.code === 'FREE' ? 6 : 30,
          enabled: true,
        },
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
