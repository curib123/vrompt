import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AIModel, GenerationPolicy, Prisma } from '@prisma/client';
import Joi from 'joi';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderRegistry } from './providers';

const money = Joi.number().min(0).max(1000000).required();
const integer = (max: number) =>
  Joi.number().integer().min(1).max(max).required();
export const modelSchema = Joi.object({
  provider: Joi.string().valid('OPENAI', 'GOOGLE', 'ANTHROPIC').required(),
  providerModelId: Joi.string()
    .pattern(/^[a-zA-Z0-9._:/-]+$/)
    .max(160)
    .required(),
  displayName: Joi.string().max(100).required(),
  description: Joi.string().max(500).allow('').default(''),
  category: Joi.string().max(40).default('general'),
  capabilities: Joi.array()
    .items(
      Joi.string().valid(
        'text',
        'vision',
        'files',
        'coding',
        'reasoning',
        'long_context',
      ),
    )
    .min(1)
    .required(),
  enabled: Joi.boolean().default(false),
  manualAvailable: Joi.boolean().default(true),
  autoAvailable: Joi.boolean().default(false),
  maintenance: Joi.boolean().default(false),
  displayOrder: Joi.number().integer().default(0),
  qualityTier: integer(4),
  routingPriority: Joi.number().integer().min(0).max(100).default(0),
  routingCostScore: money,
  inputPrice: money,
  cachedInputPrice: money,
  outputPrice: money,
  additionalPrices: Joi.object({
    cacheWriteInputPrice: Joi.number().min(0).max(1000000),
  }).default({}),
  currency: Joi.string().valid('USD').default('USD'),
  maxContext: integer(10000000),
  maxOutput: integer(1000000),
  fallbackId: Joi.string().uuid().allow(null).default(null),
  effectiveFrom: Joi.date()
    .iso()
    .default(() => new Date()),
  effectiveUntil: Joi.date()
    .iso()
    .greater(Joi.ref('effectiveFrom'))
    .allow(null)
    .default(null),
});
export const policySchema = Joi.object({
  planId: Joi.string().uuid().required(),
  bucket: Joi.string().max(80).required(),
  modelId: Joi.string().uuid().allow(null).default(null),
  dailyLimit: Joi.number().integer().min(0).max(1000000).required(),
  monthlyLimit: Joi.number().integer().min(0).max(10000000).required(),
  maxInputChars: integer(2000000),
  maxContext: integer(10000000),
  maxOutput: integer(1000000),
  maxFiles: Joi.number().integer().min(0).max(10).required(),
  maxFileBytes: integer(20000000),
  maxDurationSeconds: integer(600),
  concurrency: integer(10),
  ratePerMinute: integer(120),
  enabled: Joi.boolean().default(true),
  routing: Joi.object({
    minimumQualityTier: Joi.number().integer().min(1).max(4).default(1),
    costWeight: Joi.number().min(0).max(100).default(1),
    rules: Joi.array()
      .max(40)
      .items(
        Joi.object({
          task: Joi.string().max(40).required(),
          keywords: Joi.array()
            .items(Joi.string().min(2).max(60))
            .max(40)
            .required(),
          qualityTier: Joi.number().integer().min(1).max(4).required(),
          capabilities: Joi.array()
            .items(
              Joi.string().valid(
                'text',
                'vision',
                'files',
                'coding',
                'reasoning',
                'long_context',
              ),
            )
            .default([]),
        }),
      )
      .default([]),
  }).default({ minimumQualityTier: 1, costWeight: 1, rules: [] }),
});
export function validate<T>(schema: Joi.ObjectSchema, input: unknown): T {
  const result = schema.validate(input, {
    abortEarly: false,
    stripUnknown: false,
  });
  if (result.error)
    throw new BadRequestException(
      result.error.details.map((d) => d.message).join('; '),
    );
  return result.value as T;
}
type Routing = {
  minimumQualityTier: number;
  costWeight: number;
  rules: {
    task: string;
    keywords: string[];
    qualityTier: number;
    capabilities: string[];
  }[];
};
export function rankModels(
  models: AIModel[],
  policy: GenerationPolicy,
  text: string,
  capabilities: string[],
  context: number,
) {
  const routing = policy.routing as unknown as Routing;
  const matched = (routing.rules ?? []).filter((r) =>
    r.keywords.some((k) => text.toLowerCase().includes(k.toLowerCase())),
  );
  const tier = Math.max(
    routing.minimumQualityTier ?? 1,
    ...matched.map((r) => r.qualityTier),
  );
  const required = [
    ...new Set([...capabilities, ...matched.flatMap((r) => r.capabilities)]),
  ];
  return models
    .filter(
      (m) =>
        m.qualityTier >= tier &&
        m.maxContext >= context &&
        required.every((c) => m.capabilities.includes(c)),
    )
    .sort(
      (a, b) =>
        Number(a.routingCostScore) * (routing.costWeight ?? 1) -
        a.routingPriority -
        (Number(b.routingCostScore) * (routing.costWeight ?? 1) -
          b.routingPriority),
    );
}

@Injectable()
export class ModelRegistryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ProviderRegistry,
  ) {}
  async available() {
    const now = new Date();
    return (
      await this.prisma.aIModel.findMany({
        where: {
          enabled: true,
          maintenance: false,
          effectiveFrom: { lte: now },
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
        },
        orderBy: { displayOrder: 'asc' },
      })
    ).filter((m) => this.providers.get(m.provider).available());
  }
  async saveModel(actorId: string, input: unknown, id?: string) {
    const data = validate<Prisma.AIModelUncheckedCreateInput>(
      modelSchema,
      input,
    );
    if (id && data.fallbackId === id)
      throw new BadRequestException('A model cannot fall back to itself');
    if (
      data.fallbackId &&
      !(await this.prisma.aIModel.findUnique({
        where: { id: data.fallbackId },
      }))
    )
      throw new NotFoundException('Fallback model not found');
    return this.prisma.$transaction(async (tx) => {
      const model = id
        ? await tx.aIModel.update({ where: { id }, data })
        : await tx.aIModel.create({ data });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'MODEL_CONFIGURED',
          targetType: 'MODEL',
          targetId: model.id,
          metadata: JSON.parse(JSON.stringify(data)),
        },
      });
      return model;
    });
  }
  async savePolicy(actorId: string, input: unknown) {
    const data = validate<Prisma.GenerationPolicyUncheckedCreateInput>(
      policySchema,
      input,
    );
    if (
      (data.bucket === 'AUTO' && data.modelId) ||
      (data.bucket !== 'AUTO' && data.bucket !== data.modelId)
    )
      throw new BadRequestException(
        'Bucket must be AUTO or the exact model ID',
      );
    return this.prisma.$transaction(async (tx) => {
      const policy = await tx.generationPolicy.upsert({
        where: { planId_bucket: { planId: data.planId, bucket: data.bucket } },
        create: data,
        update: data,
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'GENERATION_POLICY_CONFIGURED',
          targetType: 'GENERATION_POLICY',
          targetId: policy.id,
          metadata: JSON.parse(JSON.stringify(data)),
        },
      });
      return policy;
    });
  }
}
