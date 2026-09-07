import { AIModel, GenerationPolicy, Prisma } from '@prisma/client';
import {
  rankModels,
  policySchema,
  supportsCapability,
  validate,
} from './registry.service';
import { periods } from './quota.service';
describe('Routing and reset boundaries', () => {
  const models = [
    {
      id: 'cheap',
      capabilities: ['text'],
      qualityTier: 1,
      maxContext: 2000,
      routingCostScore: new Prisma.Decimal(1),
      routingPriority: 0,
      inputPrice: new Prisma.Decimal(1),
      outputPrice: new Prisma.Decimal(2),
    },
    {
      id: 'strong',
      capabilities: ['text', 'coding'],
      qualityTier: 3,
      maxContext: 10000,
      routingCostScore: new Prisma.Decimal(5),
      routingPriority: 0,
      inputPrice: new Prisma.Decimal(5),
      outputPrice: new Prisma.Decimal(10),
    },
  ] as AIModel[];
  const policy = {
    maxOutput: 512,
    routing: {
      minimumQualityTier: 1,
      costWeight: 1,
      rules: [
        {
          task: 'coding',
          keywords: ['architecture'],
          qualityTier: 3,
          capabilities: ['coding'],
        },
      ],
    },
  } as unknown as GenerationPolicy;
  it('uses cost only after quality and capability requirements', () => {
    expect(
      rankModels(models, policy, 'architecture review', ['text'], 1000).map(
        (m) => m.id,
      ),
    ).toEqual(['strong']);
    expect(rankModels(models, policy, 'hello', ['text'], 1000)[0]?.id).toBe(
      'cheap',
    );
    expect(rankModels(models, policy, 'hello', ['vision'], 1000)).toEqual([]);
  });
  it('resets calendar months correctly across leap day and year boundaries', () => {
    expect(
      periods(new Date('2028-02-29T23:59:59Z')).nextMonth.toISOString(),
    ).toBe('2028-03-01T00:00:00.000Z');
    expect(
      periods(new Date('2026-12-31T23:59:59Z')).nextDay.toISOString(),
    ).toBe('2027-01-01T00:00:00.000Z');
  });
  it('does not let priority overwhelm cost and breaks ties deterministically', () => {
    const ranked = rankModels(
      [
        { ...models[0]!, routingPriority: 0 },
        { ...models[1]!, routingPriority: 100 },
      ],
      policy,
      'hello',
      ['text'],
      1000,
    );
    expect(ranked[0]?.id).toBe('cheap');
    expect(
      rankModels(
        [
          {
            ...models[0]!,
            inputPrice: new Prisma.Decimal(5),
            outputPrice: new Prisma.Decimal(10),
            routingCostScore: new Prisma.Decimal(5),
          },
          { ...models[1]!, routingPriority: 10 },
        ],
        policy,
        'hello',
        ['text'],
        1000,
      )[0]?.id,
    ).toBe('strong');
  });
  it('rejects incomplete or unbounded policies', () => {
    expect(() =>
      validate(policySchema, { bucket: 'AUTO', dailyLimit: -1 }),
    ).toThrow();
  });
  it('uses configured API prices ahead of a stale routing score', () => {
    const ranked = rankModels(
      [
        { ...models[0]!, routingCostScore: new Prisma.Decimal(100) },
        { ...models[1]!, routingCostScore: new Prisma.Decimal(0) },
      ],
      policy,
      'write a welcome email',
      ['text'],
      1000,
    );
    expect(ranked[0]?.id).toBe('cheap');
  });
  it('excludes a configured unavailable capability without breaking legacy models', () => {
    expect(supportsCapability(models[0]!, 'text')).toBe(true);
    expect(
      supportsCapability(
        {
          ...models[1]!,
          capabilityStates: { coding: 'UNAVAILABLE' },
        },
        'coding',
      ),
    ).toBe(false);
  });
});
