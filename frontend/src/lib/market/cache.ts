/**
 * Tiny in-memory TTL cache with stale-on-error for market data.
 *
 * If a loader fails while a (possibly expired) entry exists, the stale value
 * is served instead of surfacing the error — keeps the UI alive when Yahoo
 * hiccups. Server-only.
 */

if (typeof window !== "undefined") {
  throw new Error("market/cache is server-only");
}

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  const now = Date.now();
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }
  try {
    const value = await loader();
    store.set(key, { value, expiresAt: now + ttlMs });
    return value;
  } catch (error) {
    if (hit) {
      return hit.value;
    }
    throw error;
  }
}

/** Drop every entry whose key starts with `prefix` (used on auth invalidation). */
export function cacheDeletePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}
