/**
 * Persona presets bridge simple product labels → merged `PersonalSlangProfile` + prompt hints.
 * Additive only; no UI in v1.
 *
 * TODO: Preset chips / buttons on translate & speak screens.
 * TODO: Onboarding style quiz → suggested preset id.
 * TODO: Persist saved favorite persona per user.
 * TODO: Persona A/B testing (metrics on preset id).
 * TODO: Shareable persona deep links (?persona=balanced_street).
 */

import { normalizePersonalSlangProfile, type PersonalSlangProfile } from "@/lib/personalSlangProfile";

export type PersonaPresetId =
  | "clean_smooth"
  | "balanced_street"
  | "heavy_expressive"
  | "soft_friendly"
  | "assertive_direct"
  | "local_script_first"
  | "experimental_street";

/** Describes how a preset lines up with other layers (documentation / future UI). */
export type PersonaPresetEffects = {
  summary: string;
  /** Rough alignment with slang-control “strictness” feel — not a direct config link in v1. */
  slangControlBias: "lighter" | "balanced" | "heavier";
  /** Vibe keys this preset nudges toward for TTS fallback / hints. */
  vibeBias: string[];
};

export type PersonaPreset = {
  id: PersonaPresetId;
  displayName: string;
  description: string;
  category: "style" | "tone" | "script" | "experimental";
  /** Partial profile merged under user body — user keys win on conflict. */
  profileOverrides: Partial<PersonalSlangProfile>;
  /** Extra translate prompt bullets (beyond merged profile). */
  translateHints: string[];
  /** Log / future TTS persona notes — not spoken in v1. */
  ttsHints: string[];
  /** Product-safe default when no preset is chosen (informational). */
  safeDefault: boolean;
  effects: PersonaPresetEffects;
};

const PRESETS: Record<PersonaPresetId, PersonaPreset> = {
  clean_smooth: {
    id: "clean_smooth",
    displayName: "Clean & smooth",
    description: "Lighter slang, softer tone, shorter lines — readable and chill.",
    category: "style",
    profileOverrides: {
      enabled: true,
      preferredSlangIntensity: "light",
      preferredTone: "soft",
      preferredPhraseStyle: "concise",
      favoriteVibes: ["dm", "flirt"],
      allowExperimentalStreetMode: false,
      preferLocalScript: true,
      notes: "Preset: clean & smooth.",
    },
    translateHints: [
      "Persona preset: favor clarity over slang density; keep street flavor subtle.",
    ],
    ttsHints: ["Prefer calm, legible delivery; avoid harsh emphasis unless the line demands it."],
    safeDefault: false,
    effects: {
      summary: "Maps toward light slang + soft tone.",
      slangControlBias: "lighter",
      vibeBias: ["dm", "flirt"],
    },
  },
  balanced_street: {
    id: "balanced_street",
    displayName: "Balanced street",
    description: "Default street energy — authentic but not maximal.",
    category: "style",
    profileOverrides: {
      enabled: true,
      preferredSlangIntensity: "balanced",
      preferredTone: "warm",
      preferredPhraseStyle: "balanced",
      favoriteVibes: ["dm", "reply", "hype"],
      allowExperimentalStreetMode: false,
      preferLocalScript: true,
      notes: "Preset: balanced street.",
    },
    translateHints: [
      "Persona preset: authentic casual street mix — natural slang without going over the top.",
    ],
    ttsHints: ["Natural conversational pacing; balanced energy between chill and hype."],
    safeDefault: true,
    effects: {
      summary: "Center of gravity for street voice.",
      slangControlBias: "balanced",
      vibeBias: ["dm", "hype", "reply"],
    },
  },
  heavy_expressive: {
    id: "heavy_expressive",
    displayName: "Heavy expressive",
    description: "More slang density, expressive phrasing, assertive energy when it fits.",
    category: "style",
    profileOverrides: {
      enabled: true,
      preferredSlangIntensity: "heavy",
      preferredTone: "assertive",
      preferredPhraseStyle: "expressive",
      favoriteVibes: ["angry", "hype", "dm"],
      allowExperimentalStreetMode: false,
      preferLocalScript: true,
      notes: "Preset: heavy expressive.",
    },
    translateHints: [
      "Persona preset: allow richer slang and punchier phrasing when the dialect supports it.",
    ],
    ttsHints: ["More dynamic emphasis on slang peaks; expressive breath groups."],
    safeDefault: false,
    effects: {
      summary: "Heavier slang + expressive delivery.",
      slangControlBias: "heavier",
      vibeBias: ["angry", "hype", "dm"],
    },
  },
  soft_friendly: {
    id: "soft_friendly",
    displayName: "Soft & friendly",
    description: "Warm, low confrontation — friend-text energy.",
    category: "tone",
    profileOverrides: {
      enabled: true,
      preferredSlangIntensity: "light",
      preferredTone: "warm",
      preferredPhraseStyle: "balanced",
      favoriteVibes: ["dm", "flirt", "stoned"],
      allowExperimentalStreetMode: false,
      preferLocalScript: true,
      notes: "Preset: soft friendly.",
    },
    translateHints: [
      "Persona preset: keep warmth and friendliness; avoid unnecessarily harsh or aggressive slang.",
    ],
    ttsHints: ["Softer attack, warmer phrase endings."],
    safeDefault: false,
    effects: {
      summary: "Warm tone bias; milder slang.",
      slangControlBias: "lighter",
      vibeBias: ["dm", "flirt", "stoned"],
    },
  },
  assertive_direct: {
    id: "assertive_direct",
    displayName: "Assertive & direct",
    description: "Straight talk, confident cadence — still dialect-authentic.",
    category: "tone",
    profileOverrides: {
      enabled: true,
      preferredSlangIntensity: "balanced",
      preferredTone: "assertive",
      preferredPhraseStyle: "concise",
      favoriteVibes: ["reply", "angry", "dm"],
      allowExperimentalStreetMode: false,
      preferLocalScript: true,
      notes: "Preset: assertive direct.",
    },
    translateHints: [
      "Persona preset: direct, confident phrasing; minimal fluff while staying native to the dialect.",
    ],
    ttsHints: ["Crisp phrase starts; confident stress on key beats."],
    safeDefault: false,
    effects: {
      summary: "Assertive tone + concise phrasing.",
      slangControlBias: "balanced",
      vibeBias: ["reply", "angry", "dm"],
    },
  },
  local_script_first: {
    id: "local_script_first",
    displayName: "Local script first",
    description: "Prioritize native script and neighborhood-true wording over generic English/Latin leakage.",
    category: "script",
    profileOverrides: {
      enabled: true,
      preferredSlangIntensity: "balanced",
      preferredTone: "neutral",
      preferredPhraseStyle: "balanced",
      favoriteVibes: ["dm"],
      preferLocalScript: true,
      allowExperimentalStreetMode: false,
      notes: "Preset: local script first.",
    },
    translateHints: [
      "Persona preset: prioritize authentic local script and neighborhood-true slang over transliteration or generic filler.",
    ],
    ttsHints: ["Align spoken delivery with native script output; avoid anglicized pronunciation bias where inappropriate."],
    safeDefault: false,
    effects: {
      summary: "Doubles down on script loyalty (pairs with slang control + dialect packs).",
      slangControlBias: "balanced",
      vibeBias: ["dm"],
    },
  },
  experimental_street: {
    id: "experimental_street",
    displayName: "Experimental street",
    description: "Slightly more creative slang choices when they still fit the target dialect.",
    category: "experimental",
    profileOverrides: {
      enabled: true,
      preferredSlangIntensity: "heavy",
      preferredTone: "warm",
      preferredPhraseStyle: "expressive",
      favoriteVibes: ["dm", "hype", "stoned"],
      allowExperimentalStreetMode: true,
      preferLocalScript: true,
      notes: "Preset: experimental street.",
    },
    translateHints: [
      "Persona preset: experimental street mode — allow slightly bolder slang creativity only when it fits script lock and dialect authenticity.",
    ],
    ttsHints: ["More playful timing allowed; still no spoken hint text injection in v1."],
    safeDefault: false,
    effects: {
      summary: "Turns on experimental flag + expressive bias.",
      slangControlBias: "heavier",
      vibeBias: ["dm", "hype", "stoned"],
    },
  },
};

export function getPersonaPreset(id?: string): PersonaPreset | undefined {
  if (!id || typeof id !== "string") return undefined;
  const k = id.trim() as PersonaPresetId;
  return PRESETS[k];
}

export function listPersonaPresets(): PersonaPreset[] {
  return Object.values(PRESETS);
}

/**
 * Merge preset defaults with user profile — **user partial wins** on overlapping keys (deterministic).
 */
export function applyPersonaPresetToProfile(
  profile: Partial<PersonalSlangProfile> | undefined,
  presetId?: string
): PersonalSlangProfile {
  const preset = getPersonaPreset(presetId);
  const userLayer = profile && typeof profile === "object" ? profile : {};
  if (!preset) {
    return normalizePersonalSlangProfile(userLayer);
  }
  const merged: Partial<PersonalSlangProfile> = {
    ...preset.profileOverrides,
    ...userLayer,
  };
  return normalizePersonalSlangProfile(merged);
}

/** Extra translate bullets from the preset definition (empty if unknown id). */
export function buildPersonaPresetPromptHints(presetId?: string): string[] {
  const preset = getPersonaPreset(presetId);
  if (!preset) return [];
  const lines = [...preset.translateHints];
  lines.push(`Persona metadata: ${preset.displayName} — ${preset.description}`);
  return lines;
}

/** Read optional `personaPresetId` from JSON body. */
export function parseOptionalPersonaPresetId(body: Record<string, unknown>): string | undefined {
  const v = body.personaPresetId;
  if (typeof v !== "string" || !v.trim()) return undefined;
  return v.trim();
}
