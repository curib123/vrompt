import { ModelProvider } from '@prisma/client';

export type ProviderCapability =
  | 'text'
  | 'vision'
  | 'files'
  | 'coding'
  | 'reasoning'
  | 'long_context'
  | 'image_generation'
  | 'prompt_caching';

const PROVIDER_CAPABILITIES: Record<ModelProvider, ReadonlySet<ProviderCapability>> = {
  OPENAI: new Set([
    'text',
    'vision',
    'files',
    'coding',
    'reasoning',
    'long_context',
    'image_generation',
    'prompt_caching',
  ]),
  GOOGLE: new Set([
    'text',
    'vision',
    'files',
    'coding',
    'reasoning',
    'long_context',
    'image_generation',
    'prompt_caching',
  ]),
  ANTHROPIC: new Set([
    'text',
    'vision',
    'files',
    'coding',
    'reasoning',
    'long_context',
    'prompt_caching',
  ]),
  MISTRAL: new Set([
    'text',
    'vision',
    'coding',
    'reasoning',
    'long_context',
    'image_generation',
  ]),
};

export function providerSupportsCapability(
  provider: ModelProvider,
  capability: string,
) {
  return PROVIDER_CAPABILITIES[provider]?.has(capability as ProviderCapability) ?? false;
}

export function providerCapabilities(provider: ModelProvider) {
  return [...(PROVIDER_CAPABILITIES[provider] ?? [])];
}
