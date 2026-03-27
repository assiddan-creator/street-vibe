/**
 * Optional personalization layer for translate/TTS prompts. Additive only — no persistence in v1.
 *
 * TODO: Persist per-user profile in DB (auth-scoped).
 * TODO: Learn weights from repeated vibe/dialect selections.
 * TODO: Attach user-specific slang packs / lexicons.
 * TODO: Shareable persona export/import.
 * TODO: Profile-driven MiniMax/Google TTS persona curves (speed, emotion priors).
 */

export type SlangIntensityPreference = "clean" | "light" | "balanced" | "heavy" | "maximum";

export type TonePreference = "soft" | "neutral" | "warm" | "assertive" | "aggressive";

export type PhraseStylePreference = "concise" | "balanced" | "expressive" | "verbose";

/** UI / API vibe keys the app already uses (`dm`, `flirt`, etc.). */
export type VibePreference = string;

export type DialectAffinityProfile = {
  dialectId: string;
  /** 0 = none, 1 = strong preference (descriptive only in v1). */
  affinity: number;
};

const SLANG_INTENSITY_SET = new Set<SlangIntensityPreference>([
  "clean",
  "light",
  "balanced",
  "heavy",
  "maximum",
]);

const TONE_SET = new Set<TonePreference>(["soft", "neutral", "warm", "assertive", "aggressive"]);

const PHRASE_SET = new Set<PhraseStylePreference>(["concise", "balanced", "expressive", "verbose"]);

export type PersonalSlangProfile = {
  id: string;
  displayName: string;
  /** When false, hints are not emitted and TTS vibe fallback is skipped. */
  enabled: boolean;
  preferredSlangIntensity: SlangIntensityPreference;
  preferredTone: TonePreference;
  preferredPhraseStyle: PhraseStylePreference;
  favoriteVibes: VibePreference[];
  dialectAffinities: DialectAffinityProfile[];
  preferLocalScript: boolean;
  allowExperimentalStreetMode: boolean;
  notes: string;
};

export const DEFAULT_PERSONAL_SLANG_PROFILE: PersonalSlangProfile = {
  id: "default",
  displayName: "Default",
  enabled: false,
  preferredSlangIntensity: "balanced",
  preferredTone: "neutral",
  preferredPhraseStyle: "balanced",
  favoriteVibes: [],
  dialectAffinities: [],
  preferLocalScript: true,
  allowExperimentalStreetMode: false,
  notes: "",
};

/** Cleaner / smoother — internal example only. */
export const EXAMPLE_PROFILE_CLEAN_SMOOTH: PersonalSlangProfile = {
  id: "example-clean-smooth",
  displayName: "Clean & smooth",
  enabled: true,
  preferredSlangIntensity: "light",
  preferredTone: "soft",
  preferredPhraseStyle: "concise",
  favoriteVibes: ["dm", "flirt"],
  dialectAffinities: [{ dialectId: "London Roadman", affinity: 0.4 }],
  preferLocalScript: true,
  allowExperimentalStreetMode: false,
  notes: "Example: mild slang, short lines, softer energy.",
};

/** Balanced street — internal example only. */
export const EXAMPLE_PROFILE_BALANCED_STREET: PersonalSlangProfile = {
  id: "example-balanced-street",
  displayName: "Balanced street",
  enabled: true,
  preferredSlangIntensity: "balanced",
  preferredTone: "warm",
  preferredPhraseStyle: "balanced",
  favoriteVibes: ["dm", "hype", "reply"],
  dialectAffinities: [
    { dialectId: "New York Brooklyn", affinity: 0.5 },
    { dialectId: "Israeli Street", affinity: 0.3 },
  ],
  preferLocalScript: true,
  allowExperimentalStreetMode: false,
  notes: "Example: default street energy without going maximal.",
};

/** Heavy expressive — internal example only. */
export const EXAMPLE_PROFILE_HEAVY_EXPRESSIVE: PersonalSlangProfile = {
  id: "example-heavy-expressive",
  displayName: "Heavy expressive",
  enabled: true,
  preferredSlangIntensity: "heavy",
  preferredTone: "assertive",
  preferredPhraseStyle: "expressive",
  favoriteVibes: ["angry", "hype", "dm"],
  dialectAffinities: [{ dialectId: "Russian Street", affinity: 0.6 }],
  preferLocalScript: true,
  allowExperimentalStreetMode: true,
  notes: "Example: punchy, high-energy, more slang density when appropriate.",
};

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function normalizePersonalSlangProfile(input?: Partial<PersonalSlangProfile>): PersonalSlangProfile {
  const b = DEFAULT_PERSONAL_SLANG_PROFILE;
  if (!input) return { ...b };

  const dialectAffinities = Array.isArray(input.dialectAffinities)
    ? input.dialectAffinities
        .filter((d): d is DialectAffinityProfile => !!d && typeof d.dialectId === "string")
        .map((d) => ({ dialectId: d.dialectId.trim(), affinity: clamp01(typeof d.affinity === "number" ? d.affinity : 0) }))
    : b.dialectAffinities;

  const favoriteVibes = Array.isArray(input.favoriteVibes)
    ? input.favoriteVibes.filter((v): v is string => typeof v === "string" && v.trim() !== "").map((v) => v.trim())
    : b.favoriteVibes;

  return {
    id: typeof input.id === "string" && input.id.trim() ? input.id.trim() : b.id,
    displayName:
      typeof input.displayName === "string" && input.displayName.trim() ? input.displayName.trim() : b.displayName,
    enabled: typeof input.enabled === "boolean" ? input.enabled : b.enabled,
    preferredSlangIntensity:
      SLANG_INTENSITY_SET.has(input.preferredSlangIntensity as SlangIntensityPreference)
        ? (input.preferredSlangIntensity as SlangIntensityPreference)
        : b.preferredSlangIntensity,
    preferredTone: TONE_SET.has(input.preferredTone as TonePreference)
      ? (input.preferredTone as TonePreference)
      : b.preferredTone,
    preferredPhraseStyle: PHRASE_SET.has(input.preferredPhraseStyle as PhraseStylePreference)
      ? (input.preferredPhraseStyle as PhraseStylePreference)
      : b.preferredPhraseStyle,
    favoriteVibes,
    dialectAffinities,
    preferLocalScript: typeof input.preferLocalScript === "boolean" ? input.preferLocalScript : b.preferLocalScript,
    allowExperimentalStreetMode:
      typeof input.allowExperimentalStreetMode === "boolean"
        ? input.allowExperimentalStreetMode
        : b.allowExperimentalStreetMode,
    notes: typeof input.notes === "string" ? input.notes : b.notes,
  };
}

/**
 * Short bullet lines for the LLM — never replaces dialect/script locks or OUTPUT FORMAT.
 */
export function buildPersonalizationPromptHints(profile?: Partial<PersonalSlangProfile>): string[] {
  const p = normalizePersonalSlangProfile(profile);
  if (!p.enabled) return [];

  const hints: string[] = [];

  hints.push(
    `Personal style (optional): slang intensity ~${p.preferredSlangIntensity}, tone ~${p.preferredTone}, phrasing ~${p.preferredPhraseStyle}.`
  );

  if (p.preferLocalScript) {
    hints.push("Prefer authentic local script and neighborhood-true wording over generic English filler.");
  }

  if (p.favoriteVibes.length > 0) {
    hints.push(`User often enjoys these message vibes when relevant: ${p.favoriteVibes.slice(0, 6).join(", ")}.`);
  }

  if (p.dialectAffinities.length > 0) {
    const top = p.dialectAffinities
      .slice()
      .sort((a, b) => b.affinity - a.affinity)
      .slice(0, 4)
      .map((d) => `${d.dialectId} (${Math.round(d.affinity * 100)}%)`)
      .join("; ");
    hints.push(`Dialect affinity hints (soft, non-binding): ${top}.`);
  }

  if (p.allowExperimentalStreetMode) {
    hints.push("Experimental street mode: slightly more creative slang allowed when it still fits the target dialect.");
  }

  if (p.notes.trim()) {
    hints.push(`User notes: ${p.notes.trim().slice(0, 400)}`);
  }

  return hints;
}

/**
 * First favorite vibe for TTS when `context` is omitted — does not override explicit UI selection.
 */
export function getPreferredVibeFallback(profile?: Partial<PersonalSlangProfile>): string | undefined {
  const p = normalizePersonalSlangProfile(profile);
  if (!p.enabled || p.favoriteVibes.length === 0) return undefined;
  return p.favoriteVibes[0];
}

/** Optional `body.personalSlangProfile` from JSON — invalid/missing → undefined. */
export function parseOptionalPersonalProfileFromBody(body: Record<string, unknown>): PersonalSlangProfile | undefined {
  const raw = body.personalSlangProfile;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  return normalizePersonalSlangProfile(raw as Partial<PersonalSlangProfile>);
}

/**
 * Formatted block for translate prompts (empty if no hints).
 */
export function formatPersonalizationBlockForTranslate(hints: string[]): string {
  if (!hints.length) return "";
  return (
    "\n\nUSER STYLE PREFERENCES (optional light guidance — do not invent facts or break format rules above):\n" +
    hints.map((h) => `• ${h}`).join("\n") +
    "\n"
  );
}
