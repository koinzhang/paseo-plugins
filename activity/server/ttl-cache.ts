/** Simple in-memory TTL cache for expensive sync filesystem scans. */
export function createTtlCache<T>(ttlMs: number) {
  let cached: { value: T; expiresAt: number } | null = null;
  return {
    get(compute: () => T): T {
      const now = Date.now();
      if (cached && cached.expiresAt > now) return cached.value;
      const value = compute();
      cached = { value, expiresAt: now + ttlMs };
      return value;
    },
    clear(): void {
      cached = null;
    },
  };
}

/** Keyed TTL cache. */
export function createKeyedTtlCache<T>(ttlMs: number) {
  const map = new Map<string, { value: T; expiresAt: number }>();
  return {
    get(key: string, compute: () => T): T {
      const now = Date.now();
      const hit = map.get(key);
      if (hit && hit.expiresAt > now) return hit.value;
      const value = compute();
      map.set(key, { value, expiresAt: now + ttlMs });
      return value;
    },
    clear(): void {
      map.clear();
    },
  };
}
