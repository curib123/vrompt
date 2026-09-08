import { ProviderFile, ProviderMessage } from './providers';

// Routing estimates, not provider billing counts. Non-ASCII stays conservative.
export function textTokens(text: string) {
  const ascii = text.match(/[\x00-\x7f]/g)?.length ?? 0;
  return (
    Math.ceil(ascii / 3) + Buffer.byteLength(text.replace(/[\x00-\x7f]/g, ''))
  );
}

export function estimateContext(
  messages: ProviderMessage[],
  files: ProviderFile[],
) {
  return (
    messages.reduce((n, m) => n + textTokens(m.content) + 16, 0) +
    files.reduce(
      (n, f) =>
        n +
        textTokens(f.name) +
        32 +
        (f.mimeType === 'text/plain'
          ? textTokens(f.data.toString('utf8'))
          : f.mimeType.startsWith('image/')
            ? 4096
            : f.data.length),
      0,
    )
  );
}

export type RouteSettings = {
  allowedModelIds?: string[];
  attemptTimeoutSeconds?: number;
  maxAttempts?: number;
};

// Process-local health state. Bounded and reset on restart; no provider probes.
export class RoutingHealth {
  private readonly states = new Map<
    string,
    { failures: number; until: number; touched: number }
  >();
  available(id: string, now = Date.now()) {
    return (this.states.get(id)?.until ?? 0) <= now;
  }
  success(id: string) {
    this.states.delete(id);
  }
  failure(id: string, category: string, now = Date.now()) {
    if (
      !/^(HTTP_(429|5\d\d)|NETWORK_ERROR|TIMEOUT|ATTEMPT_TIMEOUT|INTERRUPTED_STREAM|EMPTY_STREAM|EMPTY_RESPONSE|PROVIDER_ERROR)$/.test(
        category,
      )
    )
      return;
    for (const [key, state] of this.states)
      if (now - state.touched > 600_000) this.states.delete(key);
    if (this.states.size >= 1000 && !this.states.has(id))
      this.states.delete(this.states.keys().next().value!);
    const failures = (this.states.get(id)?.failures ?? 0) + 1;
    this.states.set(id, {
      failures,
      until: failures >= 2 || category === 'HTTP_429' ? now + 30_000 : 0,
      touched: now,
    });
  }
}
