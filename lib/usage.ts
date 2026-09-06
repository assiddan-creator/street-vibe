import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export type Plan = "anon" | "free" | "pro";
export type UsageKind = "translate" | "tts";

const UNLIMITED = 1_000_000;

/**
 * Daily allowance per plan. Anonymous visitors are metered by hashed IP;
 * signed-in users by their Clerk id. Keep these in sync with `consume_usage`
 * in supabase/schema.sql (the SQL function is the source of truth at runtime).
 */
export const DAILY_LIMITS: Record<Plan, Record<UsageKind, number>> = {
  anon: { translate: 4, tts: 2 },
  free: { translate: 10, tts: 5 },
  pro: { translate: UNLIMITED, tts: UNLIMITED },
};

export function dailyLimitFor(plan: Plan, kind: UsageKind): number {
  return DAILY_LIMITS[plan][kind];
}

/** Stable per-visitor key that never stores a raw IP. */
export function clientIpHash(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const salt = process.env.USAGE_IP_SALT || "street-vibe-usage";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 40);
}

/** UTC calendar day — the window all counters reset on. */
function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Clerk user id for the request, or null when auth is off or the visitor is anonymous. */
export async function getRequestUserId(): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null;
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    return userId ?? null;
  } catch {
    return null;
  }
}

export type UsageState = {
  plan: Plan;
  kind: UsageKind;
  used: number;
  limit: number;
  remaining: number;
  /** Whether there is room for the request this state was resolved for. */
  ok: boolean;
  /** false when Supabase isn't configured or errored — caller should fail open. */
  metered: boolean;
};

/** Shape sent to the browser — no internals, safe to render. */
export function publicUsage(u: UsageState) {
  return {
    plan: u.plan,
    kind: u.kind,
    used: u.used,
    limit: u.limit >= UNLIMITED ? null : u.limit,
    remaining: u.limit >= UNLIMITED ? null : Math.max(0, u.remaining),
    unlimited: u.limit >= UNLIMITED,
    metered: u.metered,
  };
}

function failOpen(kind: UsageKind, plan: Plan): UsageState {
  const limit = dailyLimitFor(plan, kind);
  return { plan, kind, used: 0, limit, remaining: limit, ok: true, metered: false };
}

/**
 * Count one use against the caller's daily quota and report whether it's allowed.
 * Increment-first: a blocked call still counts (keeps the check race-free and
 * cheap); with the generous caps above the occasional wasted count on a failed
 * downstream call is acceptable. Fails open on any DB/config problem so metering
 * can never take the product down.
 */
export async function checkAndConsumeUsage(
  req: NextRequest,
  kind: UsageKind
): Promise<UsageState> {
  const userId = await getRequestUserId();

  if (!isSupabaseConfigured()) {
    return failOpen(kind, userId ? "free" : "anon");
  }

  const db = getSupabaseAdmin();
  if (!db) return failOpen(kind, userId ? "free" : "anon");

  try {
    const { data, error } = await db
      .rpc("consume_usage", {
        p_user_id: userId,
        p_ip_hash: userId ? "" : clientIpHash(req),
        p_kind: kind,
        p_day: utcDay(),
      })
      .single();

    const row = data as { plan: Plan; used: number; limit: number; allowed: boolean } | null;
    if (error || !row) {
      console.warn("[usage] consume_usage RPC failed; failing open", {
        message: error?.message,
      });
      return failOpen(kind, userId ? "free" : "anon");
    }

    return {
      plan: row.plan,
      kind,
      used: row.used,
      limit: row.limit,
      remaining: row.limit - row.used,
      ok: row.allowed,
      metered: true,
    };
  } catch (e) {
    console.warn("[usage] consume_usage threw; failing open", {
      message: e instanceof Error ? e.message : String(e),
    });
    return failOpen(kind, userId ? "free" : "anon");
  }
}

/** Read current usage for both kinds without incrementing (for the client meter). */
export async function peekUsage(
  req: NextRequest
): Promise<{ translate: ReturnType<typeof publicUsage>; tts: ReturnType<typeof publicUsage> } | null> {
  if (!isSupabaseConfigured()) return null;
  const db = getSupabaseAdmin();
  if (!db) return null;

  const userId = await getRequestUserId();
  try {
    const { data, error } = await db
      .rpc("peek_usage", {
        p_user_id: userId,
        p_ip_hash: userId ? "" : clientIpHash(req),
        p_day: utcDay(),
      })
      .single();

    const row = data as { plan: Plan; translate_used: number; tts_used: number } | null;
    if (error || !row) return null;

    const build = (kind: UsageKind, used: number): UsageState => {
      const limit = dailyLimitFor(row.plan, kind);
      return { plan: row.plan, kind, used, limit, remaining: limit - used, ok: used < limit, metered: true };
    };
    return {
      translate: publicUsage(build("translate", row.translate_used)),
      tts: publicUsage(build("tts", row.tts_used)),
    };
  } catch {
    return null;
  }
}
