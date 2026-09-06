export function ProviderIcon({ provider }: { provider: string }) {
  const key = provider.toLowerCase();
  if (Object.hasOwn(providerNames, key))
    return (
      <span aria-hidden="true" className={`model-symbol model-symbol-${key}`}>
        <span
          className="provider-logo"
          style={{
            maskImage: `url(/providers/${key}.svg)`,
            WebkitMaskImage: `url(/providers/${key}.svg)`,
          }}
        />
      </span>
    );
  const label =
    key === 'google'
      ? '✦'
      : key === 'anthropic'
        ? 'AI'
        : key === 'openai'
          ? '◎'
          : key === 'auto'
            ? '✦'
            : key.slice(0, 1).toUpperCase();
  return (
    <span aria-hidden="true" className={`model-symbol model-symbol-${key}`}>
      {label}
    </span>
  );
}

export const providerNames: Record<string, string> = {
  openai: 'OpenAI',
  google: 'Gemini',
  anthropic: 'Claude',
  mistral: 'Mistral',
};
