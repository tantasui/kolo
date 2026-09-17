/**
 * A token bucket, per caller, held in memory.
 *
 * **Its limits are the point, so they are stated up front.** This is process
 * memory: a serverless deployment runs several instances and each keeps its own
 * buckets, so the effective ceiling is the limit times however many instances
 * are warm. It is a brake on casual abuse of an unauthenticated route, not a
 * quota, and it is not a defence against anyone determined or distributed. The
 * real ceiling is whatever the upstream API enforces on our token.
 *
 * It is here rather than in a shared store because the thing being protected —
 * one read-only API token — does not justify running Redis, and something that
 * costs nothing and stops the accidental case is worth more than nothing at all.
 */

export interface RateLimitResult {
  ok: boolean;
  /** Whole seconds until the next token, for a `Retry-After` header. */
  retryAfter: number;
  remaining: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export interface RateLimiter {
  check(key: string, now?: number): RateLimitResult;
  /** Buckets currently tracked. Exposed so the pruning can be tested. */
  size(): number;
}

export interface RateLimitOptions {
  /** Most requests allowed in a burst. */
  capacity: number;
  /** Tokens added per second, i.e. the sustained rate. */
  refillPerSecond: number;
  /**
   * How long an idle bucket is kept. Without this the map grows once per
   * distinct caller and never shrinks, which is a memory leak wearing a
   * rate limiter's clothes.
   */
  idleMs?: number;
}

export function createRateLimiter({
  capacity,
  refillPerSecond,
  idleMs = 10 * 60_000,
}: RateLimitOptions): RateLimiter {
  const buckets = new Map<string, Bucket>();
  let lastPrune = 0;

  /** A full bucket is indistinguishable from a new one, so it can be dropped. */
  function prune(now: number) {
    if (now - lastPrune < idleMs) return;
    lastPrune = now;
    for (const [key, bucket] of buckets) {
      if (now - bucket.lastRefill > idleMs) buckets.delete(key);
    }
  }

  return {
    check(key: string, now = Date.now()): RateLimitResult {
      prune(now);

      const bucket = buckets.get(key) ?? { tokens: capacity, lastRefill: now };

      const elapsed = Math.max(0, now - bucket.lastRefill) / 1000;
      bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerSecond);
      bucket.lastRefill = now;

      if (bucket.tokens < 1) {
        buckets.set(key, bucket);
        const wait = (1 - bucket.tokens) / refillPerSecond;
        return { ok: false, retryAfter: Math.max(1, Math.ceil(wait)), remaining: 0 };
      }

      bucket.tokens -= 1;
      buckets.set(key, bucket);
      return { ok: true, retryAfter: 0, remaining: Math.floor(bucket.tokens) };
    },

    size: () => buckets.size,
  };
}

/**
 * Who is calling, as well as a proxy will tell us.
 *
 * `x-forwarded-for` is client-settable and trivially spoofed, so this bounds
 * accidents rather than attackers — see the note at the top of this file.
 * The leftmost entry is the original client where the proxy appends honestly.
 */
export function callerKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-nf-client-connection-ip") ?? headers.get("x-real-ip") ?? "unknown";
}
