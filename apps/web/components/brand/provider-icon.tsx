export function ProviderIcon({ provider }: { provider: string }) {
  const key = provider.toLowerCase();
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
