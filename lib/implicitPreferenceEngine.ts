/**
 * Local-only, opt-in implicit preference learning. No API contract changes required:
 * clients may attach optional `personalSlangProfile` / `personaPresetId` bodies already supported by translate/TTS.
 */

import type { PersonaPresetId } from "@/lib/personaPresets";
import type {
  DialectAffinityProfile,
  PersonalSlangProfile,
  PhraseStylePreference,
  SlangIntensityPreference,
  TonePreference,
} from "@/lib/personalSlangProfile";

const STORAGE_LEARNS = "streetvibe_learns_you_enabled";
const STORAGE_SIGNALS = "streetvibe_implicit_signals_v1";
const MAX_SIGNALS = 200;
const MIN_SIGNALS_FOR_FALLBACK = 5;

/** Single scored preference key (e.g. vibe id, dialect name). */
export type PreferenceScoreBucket = {
  key: string;
  /** Monotonic score (recent signals weighted higher). */
  score: number;
  lastUpdatedMs: number;
};

/** Point-in-time capture of explicit UI choices (never mutated by the engine). */
export type RecentChoiceSnapshot = {
  dialectId: string;
  slangLevel: 1 | 2 | 3;
  context: string;
  ttsGender: "male" | "female";
  inputLanguage: string;
  timestampMs: number;
};

export type InteractionSignal =
  | { type: "translate_success"; snapshot: RecentChoiceSnapshot }
  | { type: "dialect_select"; dialectId: string; timestampMs: number }
  | { type: "slang_level_select"; level: 1 | 2 | 3; timestampMs: number }
  | { type: "context_select"; context: string; timestampMs: number }
  | { type: "tts_gender_select"; gender: "male" | "female"; timestampMs: number }
  | { type: "input_language_select"; inputLanguage: string; timestampMs: number };

/** Aggregated soft view used for suggestions — does not drive UI state. */
export type ImplicitPreferenceProfile = {
  preferredVibes: PreferenceScoreBucket[];
  slangIntensity: PreferenceScoreBucket[];
  toneTendencies: PreferenceScoreBucket[];
  phraseStyleTendencies: PreferenceScoreBucket[];
  dialectAffinities: PreferenceScoreBucket[];
  voiceGenderTendencies: PreferenceScoreBucket[];
  /** Higher = user often works in local-script-heavy dialects (he, ja, ru, etc.). */
  localScriptAffinity: number;
  signalCount: number;
  lastInteractionMs: number;
};

function now(): number {
  return Date.now();
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Whether the user turned on Learns You (persisted). */
export function getLearnsYouEnabled(): boolean {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(STORAGE_LEARNS) === "1";
}

export function setLearnsYouEnabled(enabled: boolean): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_LEARNS, enabled ? "1" : "0");
}

export function loadPersistedSignals(): InteractionSignal[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_SIGNALS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isInteractionSignal);
  } catch {
    return [];
  }
}

function saveSignals(signals: InteractionSignal[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_SIGNALS, JSON.stringify(signals.slice(-MAX_SIGNALS)));
}

function isInteractionSignal(x: unknown): x is InteractionSignal {
  if (!x || typeof x !== "object" || !("type" in x)) return false;
  const t = (x as { type: string }).type;
  return (
    t === "translate_success" ||
    t === "dialect_select" ||
    t === "slang_level_select" ||
    t === "context_select" ||
    t === "tts_gender_select" ||
    t === "input_language_select"
  );
}

/** Clears learned signals only; does not change the Learns You toggle. */
export function clearLearnedPreferenceStorage(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_SIGNALS);
}

/**
 * Append a signal when Learns You is enabled. No-op when disabled or on server.
 * Explicit session choices are recorded as user behavior, not applied back to UI.
 */
export function recordInteractionSignal(signal: InteractionSignal): void {
  if (!isBrowser() || !getLearnsYouEnabled()) return;
  const prev = loadPersistedSignals();
  prev.push(signal);
  saveSignals(prev);
}

const LOCAL_SCRIPT_HEAVY_INPUT = new Set([
  "he-IL",
  "iw",
  "ja-JP",
  "ja",
  "ru-RU",
  "ru",
  "ko-KR",
  "ko",
  "zh-CN",
  "zh-TW",
  "zh-HK",
  "ar-SA",
  "ar",
]);

function weightForIndex(total: number, index: number): number {
  if (total <= 0) return 1;
  return 1 + (index / total) * 0.5;
}

function bumpBucket(
  map: Map<string, PreferenceScoreBucket>,
  key: string,
  delta: number,
  ts: number
): void {
  const k = key.trim();
  if (!k) return;
  const cur = map.get(k);
  if (cur) {
    cur.score += delta;
    cur.lastUpdatedMs = ts;
  } else {
    map.set(k, { key: k, score: delta, lastUpdatedMs: ts });
  }
}

function mapToSortedBuckets(map: Map<string, PreferenceScoreBucket>): PreferenceScoreBucket[] {
  return [...map.values()].sort((a, b) => b.score - a.score);
}

/** Map UI vibe → soft tone label for histograms. */
function contextToTone(context: string): TonePreference {
  const c = context.trim().toLowerCase();
  if (c === "flirt") return "warm";
  if (c === "angry" || c === "reply") return "aggressive";
  if (c === "stoned") return "soft";
  if (c === "hype") return "assertive";
  return "neutral";
}

function slangLevelToIntensity(level: 1 | 2 | 3): SlangIntensityPreference {
  if (level <= 1) return "light";
  if (level >= 3) return "heavy";
  return "balanced";
}

/** Build aggregated profile from raw signals (deterministic). */
export function buildImplicitPreferenceProfile(signals: InteractionSignal[]): ImplicitPreferenceProfile {
  const vibes = new Map<string, PreferenceScoreBucket>();
  const slang = new Map<string, PreferenceScoreBucket>();
  const tones = new Map<string, PreferenceScoreBucket>();
  const phrases = new Map<string, PreferenceScoreBucket>();
  const dialects = new Map<string, PreferenceScoreBucket>();
  const genders = new Map<string, PreferenceScoreBucket>();

  let localNumer = 0;
  let localDenom = 0;
  let lastTs = 0;

  const total = signals.length;
  signals.forEach((sig, i) => {
    const w = weightForIndex(total, i);
    const ts = "timestampMs" in sig && typeof sig.timestampMs === "number" ? sig.timestampMs : now();

    if (sig.type === "translate_success") {
      lastTs = Math.max(lastTs, sig.snapshot.timestampMs);
      const s = sig.snapshot;
      bumpBucket(vibes, s.context, w, s.timestampMs);
      bumpBucket(slang, String(s.slangLevel), w, s.timestampMs);
      bumpBucket(tones, contextToTone(s.context), w, s.timestampMs);
      bumpBucket(phrases, "balanced", w * 0.3, s.timestampMs);
      bumpBucket(dialects, s.dialectId, w, s.timestampMs);
      bumpBucket(genders, s.ttsGender, w, s.timestampMs);
      localDenom += 1;
      if (LOCAL_SCRIPT_HEAVY_INPUT.has(s.inputLanguage)) localNumer += 1;
      return;
    }

    if (sig.type === "dialect_select") {
      bumpBucket(dialects, sig.dialectId, w, ts);
      lastTs = Math.max(lastTs, ts);
      return;
    }
    if (sig.type === "slang_level_select") {
      bumpBucket(slang, String(sig.level), w, ts);
      lastTs = Math.max(lastTs, ts);
      return;
    }
    if (sig.type === "context_select") {
      bumpBucket(vibes, sig.context, w, ts);
      bumpBucket(tones, contextToTone(sig.context), w, ts);
      lastTs = Math.max(lastTs, ts);
      return;
    }
    if (sig.type === "tts_gender_select") {
      bumpBucket(genders, sig.gender, w, ts);
      lastTs = Math.max(lastTs, ts);
      return;
    }
    if (sig.type === "input_language_select") {
      lastTs = Math.max(lastTs, ts);
      localDenom += 1;
      if (LOCAL_SCRIPT_HEAVY_INPUT.has(sig.inputLanguage)) localNumer += 1;
    }
  });

  return {
    preferredVibes: mapToSortedBuckets(vibes),
    slangIntensity: mapToSortedBuckets(slang),
    toneTendencies: mapToSortedBuckets(tones),
    phraseStyleTendencies: mapToSortedBuckets(phrases),
    dialectAffinities: mapToSortedBuckets(dialects),
    voiceGenderTendencies: mapToSortedBuckets(genders),
    localScriptAffinity: localDenom > 0 ? localNumer / localDenom : 0,
    signalCount: signals.length,
    lastInteractionMs: lastTs,
  };
}

function topSlangLevelFromBuckets(buckets: PreferenceScoreBucket[]): 1 | 2 | 3 {
  const scores: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  for (const b of buckets) {
    const n = parseInt(b.key, 10);
    if (n === 1 || n === 2 || n === 3) scores[n] += b.score;
  }
  let best: 1 | 2 | 3 = 2;
  let max = -1;
  ([1, 2, 3] as const).forEach((k) => {
    if (scores[k] > max) {
      max = scores[k];
      best = k;
    }
  });
  return best;
}

function topTone(buckets: PreferenceScoreBucket[]): TonePreference {
  const first = buckets[0]?.key;
  if (
    first === "soft" ||
    first === "neutral" ||
    first === "warm" ||
    first === "assertive" ||
    first === "aggressive"
  ) {
    return first;
  }
  return "neutral";
}

function topPhrase(_buckets: PreferenceScoreBucket[]): PhraseStylePreference {
  return "balanced";
}

/** Map aggregated scores → `PersonalSlangProfile` overrides (merged server-side; never overwrites explicit UI). */
export function getSuggestedProfileOverridesFromImplicitPreferences(
  profile: ImplicitPreferenceProfile
): Partial<PersonalSlangProfile> {
  const level = topSlangLevelFromBuckets(profile.slangIntensity);
  const preferredSlangIntensity = slangLevelToIntensity(level);
  const preferredTone = topTone(profile.toneTendencies);
  const preferredPhraseStyle = topPhrase(profile.phraseStyleTendencies);

  const favoriteVibes = profile.preferredVibes
    .filter((b) => b.score > 0)
    .slice(0, 6)
    .map((b) => b.key);

  const maxD = profile.dialectAffinities[0]?.score ?? 1;
  const dialectAffinities: DialectAffinityProfile[] = profile.dialectAffinities
    .filter((b) => b.score > 0)
    .slice(0, 6)
    .map((b) => ({
      dialectId: b.key,
      affinity: maxD > 0 ? Math.min(1, b.score / maxD) : 0,
    }));

  const preferLocalScript = profile.localScriptAffinity >= 0.45;

  const genderNote =
    profile.voiceGenderTendencies.length >= 2
      ? `Observed TTS voice preference trend: ${profile.voiceGenderTendencies
          .map((g) => `${g.key} ~${Math.round(g.score)}`)
          .join(", ")}.`
      : "";

  const notes = [
    "Implicit profile (Learns You, local).",
    genderNote,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: "implicit-learned",
    displayName: "Learned (local)",
    enabled: true,
    preferredSlangIntensity,
    preferredTone,
    preferredPhraseStyle,
    favoriteVibes,
    dialectAffinities,
    preferLocalScript,
    allowExperimentalStreetMode: preferredSlangIntensity === "heavy" || preferredSlangIntensity === "maximum",
    notes: notes.slice(0, 500),
  };
}

/** Pick a persona preset id from implicit aggregates (soft hint only). */
export function getSuggestedPresetFromImplicitPreferences(
  profile: ImplicitPreferenceProfile
): PersonaPresetId | undefined {
  const slang = topSlangLevelFromBuckets(profile.slangIntensity);
  const tone = topTone(profile.toneTendencies);
  const local = profile.localScriptAffinity;

  if (local >= 0.55) return "local_script_first";
  if (slang >= 3 && (tone === "aggressive" || tone === "assertive")) return "heavy_expressive";
  if (slang <= 1 && (tone === "soft" || tone === "warm")) return "clean_smooth";
  if (tone === "assertive" || tone === "aggressive") return "assertive_direct";
  if (tone === "warm" || tone === "soft") return "soft_friendly";
  return "balanced_street";
}

export function shouldUseImplicitFallback(signals: InteractionSignal[]): boolean {
  if (signals.length < MIN_SIGNALS_FOR_FALLBACK) return false;
  const successes = signals.filter((s) => s.type === "translate_success").length;
  return successes >= 3;
}

export type ImplicitTranslateExtras = {
  personalSlangProfile?: Partial<PersonalSlangProfile>;
  personaPresetId?: string;
};

/**
 * When Learns You is on and the user has not supplied explicit profile fields in the body,
 * returns optional extras to merge into `/api/translate` and `/api/tts` JSON bodies.
 * Never replaces `context`, `slangLevel`, `currentLang`, or `ttsGender` in the request — those stay explicit in the UI.
 */
export function getImplicitSoftExtrasForRequests(
  learnsYouEnabled: boolean,
  explicitBodyHasPersonalProfile: boolean,
  explicitPersonaPresetId?: string
): ImplicitTranslateExtras | undefined {
  if (!learnsYouEnabled || !isBrowser()) return undefined;
  if (explicitBodyHasPersonalProfile || explicitPersonaPresetId) return undefined;

  const signals = loadPersistedSignals();
  if (!shouldUseImplicitFallback(signals)) return undefined;

  const implicit = buildImplicitPreferenceProfile(signals);
  const overrides = getSuggestedProfileOverridesFromImplicitPreferences(implicit);
  const preset = getSuggestedPresetFromImplicitPreferences(implicit);

  return {
    personalSlangProfile: overrides,
    personaPresetId: preset,
  };
}
