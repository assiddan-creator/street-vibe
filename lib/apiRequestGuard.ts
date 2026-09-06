import { NextRequest, NextResponse } from "next/server";

type ApiGuardOptions = {
  limit: number;
  maxBodyBytes: number;
  windowMs?: number;
  /** Optional hard ceiling per client per 24h (defaults to limit * 40). */
  dailyLimit?: number;
};

type RateBucket = {
  count: number;
  resetAt: number;
};

const DAY_MS = 86_400_000;
const buckets = new Map<string, RateBucket>();
const dailyBuckets = new Map<string, RateBucket>();

function hit(map: Map<string, RateBucket>, key: string, windowMs: number, now: number): number {
  const cur = map.get(key);
  const bucket = !cur || cur.resetAt <= now ? { count: 0, resetAt: now + windowMs } : cur;
  bucket.count += 1;
  map.set(key, bucket);
  if (map.size > 5_000) {
    for (const [k, v] of map) if (v.resetAt <= now) map.delete(k);
  }
  return bucket.count;
}

function getClientId(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Lightweight same-origin, body-size, and per-instance burst protection.
 * A shared rate-limit store or Vercel Firewall should be added before a paid public launch.
 */
export function guardApiRequest(
  req: NextRequest,
  routeName: string,
  { limit, maxBodyBytes, windowMs = 60_000, dailyLimit }: ApiGuardOptions
): NextResponse | null {
  const reqOrigin = (() => {
    try {
      return new URL(req.url).origin;
    } catch {
      return "";
    }
  })();
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  // Block a browser fetch from another site. Non-browser callers (no Origin/Referer)
  // pass here and are caught by the rate limits below.
  if (origin && origin !== reqOrigin) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  }
  if (!origin && referer && reqOrigin && !referer.startsWith(reqOrigin)) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  }

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
  }

  const now = Date.now();
  const clientKey = `${routeName}:${getClientId(req)}`;

  const perMin = hit(buckets, clientKey, windowMs, now);
  if (perMin > limit) {
    const resetAt = buckets.get(clientKey)?.resetAt ?? now + windowMs;
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((resetAt - now) / 1000))) } }
    );
  }

  const perDay = hit(dailyBuckets, clientKey, DAY_MS, now);
  if (perDay > (dailyLimit ?? limit * 40)) {
    return NextResponse.json(
      { error: "Daily limit reached. Come back tomorrow." },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
  }

  return null;
}
