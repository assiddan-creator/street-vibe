import { Ratelimit } from "@upstash/ratelimit";
import type { Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Distributed rate limiting, opt-in on Upstash Redis env vars. Without them the
 * in-memory limiter in `apiRequestGuard` stays in charge, so this is a no-op
 * until `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set. Create a
 * free database at https://console.upstash.com and paste the REST URL + token.
 */
export function isUpstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  if (!isUpstashConfigured()) {
    redis = null;
    return null;
  }
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL as string,
      token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
    });
  } catch {
    redis = null;
  }
  return redis;
}

/** One sliding-window limiter per (tokens, window) pair, built on first use. */
const limiters = new Map<string, Ratelimit>();

function getLimiter(tokens: number, windowSeconds: number): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  const key = `${tokens}:${windowSeconds}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(tokens, `${windowSeconds} s` as Duration),
      prefix: "sv-rl",
      analytics: false,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

/**
 * True when `bucketKey` is over `tokens` requests in the trailing
 * `windowSeconds`. Returns false (allow) when Upstash isn't configured or the
 * call errors — the guard fails open so a Redis blip can't take the API down.
 */
export async function upstashOverLimit(
  bucketKey: string,
  tokens: number,
  windowSeconds: number
): Promise<boolean> {
  const limiter = getLimiter(tokens, windowSeconds);
  if (!limiter) return false;
  try {
    const { success } = await limiter.limit(bucketKey);
    return !success;
  } catch {
    return false;
  }
}
