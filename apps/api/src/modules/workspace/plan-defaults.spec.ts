import { AIModel, GenerationPolicy } from '@prisma/client';
import {
  creditPlans,
  defaultCreditPolicy,
  manualModelsForPlan,
  publicPlanCodes,
} from '../../../prisma/credit-defaults';
import { affordableCandidates, PROVIDER_USD_PER_CREDIT } from './credits';

const models = [
  { id: 'openai', provider: 'OPENAI', providerModelId: 'gpt-4o-mini' },
  {
    id: 'google',
    provider: 'GOOGLE',
    providerModelId: 'gemini-2.5-flash-lite',
  },
  {
    id: 'claude',
    provider: 'ANTHROPIC',
    providerModelId: 'claude-haiku-4-5-20251001',
  },
  {
    id: 'mistral',
    provider: 'MISTRAL',
    providerModelId: 'mistral-small-latest',
  },
  {
    id: 'image',
    provider: 'GOOGLE',
    providerModelId: 'gemini-2.5-flash-image',
  },
  { id: 'retired', provider: 'GROQ', providerModelId: 'openai/gpt-oss-20b' },
].map((m) => ({
  ...m,
  enabled: true,
  manualAvailable: true,
  currency: 'USD',
  creditCost: 1,
  inputPrice: 0.15,
  cachedInputPrice: 0.075,
  outputPrice: 0.6,
  additionalPrices: {},
  maxContext: 128000,
  maxOutput: 4096,
})) as unknown as AIModel[];

describe('four subscription tiers', () => {
  it('orders the four plans and does not seed guest access', () => {
    expect(creditPlans).not.toHaveProperty('GUEST');
    expect(publicPlanCodes).toEqual(['FREE', 'STARTER', 'PRO', 'MAX']);
    expect(
      publicPlanCodes.map((code) => creditPlans[code].monthlyCredits),
    ).toEqual([30, 100, 250, 600]);
    expect(
      publicPlanCodes.map((code) => creditPlans[code].originalPrice),
    ).toEqual([0, 599, 1199, 2499]);
  });
  it('keeps provider budgets below 20 percent per allowance and 40 percent across two calendar resets', () => {
    for (const code of ['STARTER', 'PRO', 'MAX'] as const) {
      const plan = creditPlans[code];
      expect(
        (plan.monthlyCredits * PROVIDER_USD_PER_CREDIT) /
          (plan.originalPrice / 100),
      ).toBeLessThan(0.2);
      expect(
        (2 * plan.monthlyCredits * PROVIDER_USD_PER_CREDIT) /
          (plan.originalPrice / 100),
      ).toBeLessThan(0.4);
    }
  });
  it('limits Starter to economical manual models and keeps premium access in Pro and Max', () => {
    expect(manualModelsForPlan('FREE', models)).toEqual([]);
    expect(manualModelsForPlan('STARTER', models).map((m) => m.id)).toEqual([
      'openai',
      'google',
      'mistral',
    ]);
    for (const code of ['PRO', 'MAX'] as const)
      expect(manualModelsForPlan(code, models).map((m) => m.id)).toEqual([
        'openai',
        'google',
        'claude',
        'mistral',
        'image',
      ]);
  });
  it('uses only supported Auto providers and retains affordable routes in every tier', () => {
    for (const code of publicPlanCodes) {
      const p = defaultCreditPolicy('plan', code, models) as GenerationPolicy;
      const pool = (p.routing as { allowedModelIds: string[] }).allowedModelIds;
      expect(pool).not.toContain('retired');
      expect(pool).not.toContain('claude');
      expect(
        affordableCandidates(
          models.filter((m) => pool.includes(m.id)),
          p,
        ).length,
      ).toBeGreaterThan(0);
      expect(p.allowedFeatures.includes('image_generation')).toBe(
        ['PRO', 'MAX'].includes(code),
      );
    }
  });
});
