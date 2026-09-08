import type { AIModel, GenerationPolicy } from '@prisma/client';

// One credit funds at most $0.008 of estimated provider work. The difference
// from the $0.01 nominal budget leaves 25% headroom for estimation variance.
export const PROVIDER_USD_PER_CREDIT = 0.008;
export type CreditFeature = 'chat' | 'image_generation';
export type PricedModel = Pick<
  AIModel,
  | 'creditCost'
  | 'inputPrice'
  | 'cachedInputPrice'
  | 'outputPrice'
  | 'additionalPrices'
  | 'maxContext'
  | 'maxOutput'
  | 'currency'
>;

export function imageOutputBudget(model: Pick<AIModel, 'additionalPrices'>) {
  const value = Number(
    (model.additionalPrices as Record<string, unknown> | null)
      ?.maxImageOutputCostUsd,
  );
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function requestCostBound(
  model: PricedModel,
  policy: Pick<GenerationPolicy, 'maxContext' | 'maxOutput'>,
  feature: CreditFeature = 'chat',
) {
  if (model.currency !== 'USD') return Infinity;
  const additional = model.additionalPrices as Record<string, unknown> | null;
  const rates = [
    Number(model.inputPrice),
    Number(model.cachedInputPrice),
    Number(additional?.cacheWriteInputPrice ?? 0),
    Number(model.outputPrice),
  ];
  if (
    rates.some((value) => !Number.isFinite(value) || value < 0) ||
    !rates.some((value) => value > 0)
  )
    return Infinity;
  const context = Math.min(policy.maxContext, model.maxContext);
  const output = Math.min(policy.maxOutput, model.maxOutput);
  if (
    !Number.isFinite(context) ||
    context <= 0 ||
    !Number.isFinite(output) ||
    output <= 0
  )
    return Infinity;
  let outputCost = (output * rates[3]!) / 1_000_000;
  if (feature === 'image_generation') {
    const imageBudget = imageOutputBudget(model);
    if (imageBudget === null) return Infinity;
    // The configured image budget covers all output/images/tools for a request.
    outputCost = Math.max(outputCost, imageBudget);
  }
  return (context * Math.max(...rates.slice(0, 3))) / 1_000_000 + outputCost;
}

export function modelCredits(
  model: PricedModel,
  policy: Pick<GenerationPolicy, 'maxContext' | 'maxOutput'>,
  feature: CreditFeature = 'chat',
) {
  const bound = requestCostBound(model, policy, feature);
  if (!Number.isFinite(bound)) return null;
  const floor = Number.isFinite(model.creditCost)
    ? Math.max(1, model.creditCost)
    : 1;
  return Math.max(floor, Math.ceil(bound / PROVIDER_USD_PER_CREDIT - 1e-10));
}

export function autoCredits(
  policy: Pick<GenerationPolicy, 'routing'>,
  feature: CreditFeature = 'chat',
) {
  const routing = (policy.routing ?? {}) as Record<string, unknown>;
  const value = Number(
    feature === 'image_generation'
      ? routing.imageCreditCost
      : (routing.creditCost ?? 1),
  );
  return Number.isInteger(value) && value >= 1 && value <= 100000
    ? value
    : null;
}

export function affordableCandidates<T extends PricedModel>(
  models: T[],
  policy: GenerationPolicy,
  feature: CreditFeature = 'chat',
) {
  const credits = autoCredits(policy, feature);
  if (credits === null) return [];
  let remaining = credits * PROVIDER_USD_PER_CREDIT;
  const routing = (policy.routing ?? {}) as { maxAttempts?: number };
  const limit = Math.max(1, Math.min(5, routing.maxAttempts ?? 2));
  const selected: T[] = [];
  for (const model of models) {
    const bound = requestCostBound(model, policy, feature);
    if (model.creditCost > credits || bound > remaining + 1e-10) continue;
    selected.push(model);
    remaining -= bound;
    if (selected.length === limit) break;
  }
  return selected;
}
