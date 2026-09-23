/**
 * Memoize read RPC results until the store is written or the TTL passes.
 *
 * Panels poll every 15s with identical inputs; without this each poll re-reads
 * and re-aggregates whole tables synchronously on the plugin process.
 */
export function createRpcCache(options: {
  generation: () => number;
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
}) {
  const ttlMs = options.ttlMs ?? 30_000;
  const maxEntries = options.maxEntries ?? 64;
  const now = options.now ?? Date.now;
  const entries = new Map<string, { generation: number; at: number; value: Promise<unknown> }>();

  function wrap<I, C, O>(
    name: string,
    handler: (input: I, context: C) => Promise<O>,
  ): (input: I, context: C) => Promise<O> {
    return (input, context) => {
      const key = `${name}\0${JSON.stringify(input ?? null)}`;
      const generation = options.generation();
      const at = now();
      const hit = entries.get(key);
      if (hit && hit.generation === generation && at - hit.at < ttlMs) {
        entries.delete(key);
        entries.set(key, hit);
        return hit.value as Promise<O>;
      }
      const value = handler(input, context);
      entries.delete(key);
      entries.set(key, { generation, at, value });
      value.catch(() => {
        if (entries.get(key)?.value === value) entries.delete(key);
      });
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
      return value;
    };
  }

  return { wrap, clear: () => entries.clear() };
}
