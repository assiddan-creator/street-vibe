/**
 * Central vibe → speech tuning metadata for future dialect-aware TTS.
 * Current MiniMax emotion values match legacy `minimaxTtsEmotion` behavior only.
 *
 * TODO: Per-dialect MiniMax voice ids when the API supports richer catalogs.
 * TODO: Per-dialect speech pacing (speed / pause curves) wired from here into `/api/tts`.
 * TODO: Per-dialect Google Cloud TTS text shaping / style hints.
 * TODO: Neighborhood-specific interjection insertion (translate + TTS coordination).
 */

import { isKnownPremiumDialect, type StreetVibeDialectId } from "@/lib/dialectRegistry";

/** Canonical vibe ids (UI may still send legacy keys like `dm` / `flirt`). */
export type StreetVibeId = "friend" | "flirty" | "angry" | "stoned";

export type PauseProfile = "minimal" | "natural" | "relaxed" | "punctuated";

/** Optional per-dialect tweaks — intentionally empty; extension point only. */
export type VibeDialectOverride = Partial<{
  minimaxEmotion: string;
  speechStyleNotes: string;
  googleTextStyleNotes: string[];
  pauseProfile: PauseProfile;
  energyLevel: number;
  warmthLevel: number;
}>;

export type VibeSpeechEntry = {
  minimaxEmotion: string;
  speechStyleNotes: string;
  googleTextStyleNotes: string[];
  pauseProfile: PauseProfile;
  /** 0 = low, 1 = high — descriptive only until wired to engines. */
  energyLevel: number;
  warmthLevel: number;
  dialectOverrides?: Partial<Record<StreetVibeDialectId, VibeDialectOverride>>;
};

/**
 * Seeded from current production behavior only (friend/dm → auto, flirt → happy, angry, stoned → calm).
 */
export const VIBE_SPEECH_CONFIG: Record<StreetVibeId, VibeSpeechEntry> = {
  friend: {
    minimaxEmotion: "auto",
    speechStyleNotes: "Neutral / default street cadence; matches legacy `dm` / default MiniMax emotion.",
    googleTextStyleNotes: [],
    pauseProfile: "natural",
    energyLevel: 0.5,
    warmthLevel: 0.5,
  },
  flirty: {
    minimaxEmotion: "happy",
    speechStyleNotes: "Upbeat, charming tone; matches legacy `flirt` MiniMax emotion.",
    googleTextStyleNotes: [],
    pauseProfile: "natural",
    energyLevel: 0.65,
    warmthLevel: 0.75,
  },
  angry: {
    minimaxEmotion: "angry",
    speechStyleNotes: "Direct, high-intensity; matches legacy `angry` MiniMax emotion.",
    googleTextStyleNotes: [],
    pauseProfile: "punctuated",
    energyLevel: 0.9,
    warmthLevel: 0.2,
  },
  stoned: {
    minimaxEmotion: "calm",
    speechStyleNotes: "Mellow, slow energy; matches legacy `stoned` MiniMax emotion.",
    googleTextStyleNotes: [],
    pauseProfile: "relaxed",
    energyLevel: 0.25,
    warmthLevel: 0.55,
  },
};

/** Maps only legacy / canonical keys the app uses; unknown → friend (same as legacy `?? default`). */
function normalizeContextToStreetVibeId(vibe: string | undefined): StreetVibeId {
  if (!vibe || typeof vibe !== "string") return "friend";
  const k = vibe.trim().toLowerCase();
  if (k === "dm" || k === "friend" || k === "default") return "friend";
  if (k === "flirt") return "flirty";
  if (k === "angry") return "angry";
  if (k === "stoned") return "stoned";
  return "friend";
}

function getResolvedVibeEntry(vibe: string | undefined, dialectId?: string): VibeSpeechEntry {
  const canonical = normalizeContextToStreetVibeId(vibe);
  const base = VIBE_SPEECH_CONFIG[canonical];
  if (!dialectId || !isKnownPremiumDialect(dialectId)) {
    return base;
  }
  const ov = base.dialectOverrides?.[dialectId as StreetVibeDialectId];
  if (!ov) return base;
  return { ...base, ...ov };
}

/**
 * Resolves MiniMax `emotion` with optional future dialect overrides.
 * For API parity with the legacy UI, {@link resolveMinimaxEmotionFromVibe} in `minimaxTtsEmotion.ts` keeps the
 * exact `MINIMAX_EMOTION_BY_VIBE[vibe] ?? default` lookup (only keys `dm`, `flirt`, `angry`, `stoned`, `default`).
 */
export function resolveMinimaxEmotionFromVibeConfig(vibe: string | undefined, dialectId?: string): string {
  const entry = getResolvedVibeEntry(vibe, dialectId);
  return entry.minimaxEmotion;
}

export function getGoogleTextStyleNotesForVibe(vibe?: string, dialectId?: string): string[] {
  const entry = getResolvedVibeEntry(vibe, dialectId);
  return [...entry.googleTextStyleNotes];
}
