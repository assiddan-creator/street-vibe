import { NextRequest, NextResponse } from "next/server";

type ApiGuardOptions = {
  limit: number;
  maxBodyBytes: number;
  windowMs?: number;
};

type RateBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateBucket>();

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
  { limit, maxBodyBytes, windowMs = 60_000 }: ApiGuardOptions
): NextResponse | null {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  }

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
  }

  const now = Date.now();
  const key = `${routeName}:${getClientId(req)}`;
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count += 1;
  buckets.set(key, bucket);

  if (buckets.size > 2_000) {
    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  if (bucket.count > limit) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))) },
      }
    );
  }

  return null;
}
