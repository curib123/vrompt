import { AIModel, GenerationPolicy, Prisma } from '@prisma/client';
import {
  affordableCandidates,
  autoCredits,
  modelCredits,
  requestCostBound,
} from './credits';
import { supportsCapability } from './registry.service';

const model = (input = 0.15, output = 0.6): AIModel =>
  ({
    id: 'model',
    provider: 'GOOGLE',
    creditCost: 1,
    currency: 'USD',
    inputPrice: new Prisma.Decimal(input),
    cachedInputPrice: new Prisma.Decimal(0),
    outputPrice: new Prisma.Decimal(output),
    additionalPrices: {},
    maxContext: 128000,
    maxOutput: 4096,
    capabilities: ['text', 'image_generation'],
  }) as AIModel;
const policy = (context = 32768, output = 4096): GenerationPolicy =>
  ({
    maxContext: context,
    maxOutput: output,
    routing: { creditCost: 1, maxAttempts: 3 },
  }) as GenerationPolicy;

describe('credit economics', () => {
  it('keeps economical text at one credit and charges premium context/output and cache writes', () => {
    expect(modelCredits(model(), policy())).toBe(1);
    const premium = {
      ...model(1, 5),
      additionalPrices: { cacheWriteInputPrice: 1.25 },
    };
    expect(requestCostBound(premium, policy())).toBeCloseTo(0.06144);
    expect(modelCredits(premium, policy())).toBe(8);
    expect(modelCredits({ ...model(), creditCost: 3 }, policy())).toBe(3);
  });
  it('budgets the sum of fallback attempts, skipping models that cannot fit', () => {
    const candidates = [
      model(5, 10),
      model(0.1, 0.4),
      model(0.1, 0.4),
      model(0.1, 0.4),
    ];
    const selected = affordableCandidates(candidates, policy(32000, 1000));
    expect(selected).toEqual(candidates.slice(1, 3));
    expect(
      selected.reduce(
        (total, m) => total + requestCostBound(m, policy(32000, 1000)),
        0,
      ),
    ).toBeLessThanOrEqual(0.008);
  });
  it('uses model output/context ceilings and rounds up near credit boundaries', () => {
    expect(modelCredits(model(0.125, 0), policy(64000, 1))).toBe(1);
    expect(modelCredits(model(0.125, 0), policy(64001, 1))).toBe(2);
    expect(
      modelCredits(
        { ...model(0.125, 0), maxContext: 64000 },
        policy(100000, 1),
      ),
    ).toBe(1);
  });
  it('fails closed for unpriced models, foreign currencies and unpriced image tools', () => {
    expect(modelCredits(model(0, 0), policy())).toBeNull();
    expect(modelCredits({ ...model(), currency: 'PHP' }, policy())).toBeNull();
    expect(modelCredits(model(), policy(), 'image_generation')).toBeNull();
    expect(supportsCapability(model(), 'image_generation')).toBe(false);
    expect(autoCredits(policy(), 'image_generation')).toBeNull();
    expect(autoCredits({ routing: { creditCost: 0 } })).toBeNull();
  });
  it('charges images separately and does not allow an image fallback to double the budget', () => {
    const image = {
      ...model(0.3, 30),
      additionalPrices: { maxImageOutputCostUsd: 0.25 },
    };
    const pro = {
      ...policy(16384, 2048),
      routing: { creditCost: 1, imageCreditCost: 35, maxAttempts: 2 },
    };
    expect(modelCredits(image, policy(), 'image_generation')).toBe(33);
    expect(supportsCapability(image, 'image_generation')).toBe(true);
    expect(
      affordableCandidates([image, image], pro, 'image_generation'),
    ).toHaveLength(1);
    expect(affordableCandidates([image], pro, 'chat')).toEqual([]);
  });
});
