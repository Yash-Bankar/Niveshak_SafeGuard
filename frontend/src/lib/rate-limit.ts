/**
 * In-memory sliding-window rate limiter.
 *
 * IMPORTANT: state lives in process memory. It RESETS when the server
 * instance restarts and is NOT shared between instances — acceptable for the
 * prototype, not a security guarantee.
 *
 * Later phases must call rateLimit() TWICE per request — once with key
 * `visitor:${id}` and once with key `ip:${ip}` (first entry of
 * x-forwarded-for) — because clearing cookies would otherwise let a client
 * bypass its limit by minting a fresh visitor id. A request is allowed only
 * if BOTH windows allow it.
 */

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= max) {
    buckets.set(key, hits);
    const retryAfterMs = hits[0] + windowMs - now;
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, retryAfterSeconds: 0 };
}

/** First entry of x-forwarded-for, or "unknown". */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded) return "unknown";
  return forwarded.split(",")[0]?.trim() || "unknown";
}
