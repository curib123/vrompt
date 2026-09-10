import { ModelProvider } from '@prisma/client';

export type ProviderBoundCapability = 'vision' | 'files' | 'image_generation';

const PROVIDER_CAPABILITIES: Record<
  ModelProvider,
  ReadonlySet<ProviderBoundCapability>
> = {
  OPENAI: new Set(['vision', 'files', 'image_generation']),
  GOOGLE: new Set(['vision', 'files', 'image_generation']),
  ANTHROPIC: new Set(['vision', 'files']),
  MISTRAL: new Set(['vision', 'image_generation']),
};

const PROVIDER_BOUND_CAPABILITIES = new Set<ProviderBoundCapability>([
  'vision',
  'files',
  'image_generation',
]);

export function providerSupportsCapability(
  provider: ModelProvider,
  capability: string,
) {
  if (!PROVIDER_BOUND_CAPABILITIES.has(capability as ProviderBoundCapability))
    return true;
  return (
    PROVIDER_CAPABILITIES[provider]?.has(capability as ProviderBoundCapability) ??
    false
  );
}

export function providerCapabilities(provider: ModelProvider) {
  return [...(PROVIDER_CAPABILITIES[provider] ?? [])];
}
