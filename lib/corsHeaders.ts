import type { NextRequest } from "next/server";

/**
 * These API routes are only ever called same-origin by the app's own frontend.
 * Lock CORS to the site origin so other sites can't drive the paid Gemini /
 * ElevenLabs / Replicate endpoints from a browser. (Server-to-server callers
 * ignore CORS entirely — the per-IP rate limit in apiRequestGuard covers those.)
 */
function allowedOrigin(req?: NextRequest): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (site) return site;
  if (req) {
    try {
      return new URL(req.url).origin;
    } catch {
      /* fall through */
    }
  }
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "https://street-vibe.vercel.app";
}

export function corsHeaders(req?: NextRequest): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(req),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}
