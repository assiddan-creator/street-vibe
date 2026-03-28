/**
 * Onboarding style quiz — maps multiple-choice answers → trait scores → persona preset + profile traits.
 * Standalone module; not wired to HTTP routes in v1 (zero runtime risk).
 *
 * TODO: Onboarding cards UI + routing.
 * TODO: One-question-at-a-time flow with progress.
 * TODO: Persist quiz result to user profile / DB.
 * TODO: Re-run quiz from settings.
 * TODO: Compare “your voice” snapshot vs new quiz result.
 */

import type { PersonaPresetId } from "@/lib/personaPresets";
import type { DialectAffinityProfile, PersonalSlangProfile } from "@/lib/personalSlangProfile";
import type { SlangIntensityPreference, TonePreference, PhraseStylePreference } from "@/lib/personalSlangProfile";

export type StyleQuizAnswerOption = {
  id: string;
  label: string;
  /** Internal weights summed then normalized (deterministic). */
  weights: StyleQuizWeightVector;
};

/** Per-answer contributions to raw trait buckets. */
export type StyleQuizWeightVector = Partial<{
  slangRaw: number;
  toneSoft: number;
  toneWarm: number;
  toneNeutral: number;
  toneDirect: number;
  toneAggressive: number;
  expressRaw: number;
  localScriptRaw: number;
  experimentalRaw: number;
  vibeDm: number;
  vibeHype: number;
  vibeFlirt: number;
  vibeAngry: number;
  vibeStoned: number;
  vibeReply: number;
  affLondon: number;
  affNYC: number;
  affIsraeli: number;
  affTokyo: number;
  affParis: number;
  affRussian: number;
  affMexico: number;
  affRio: number;
  affJamaica: number;
}>;

export type StyleQuizQuestion = {
  id: string;
  category: "slang" | "tone" | "phrasing" | "script" | "experimental" | "vibe" | "region";
  prompt: string;
  options: StyleQuizAnswerOption[];
};

/** Normalized 0–1 scores for explainability. */
export type StyleQuizTraitScore = {
  slangIntensity: number;
  /** 1 = softest / friendliest, 0 = hardest. */
  toneSoftness: number;
  /** 0 = mild, 1 = aggressive/direct. */
  directness: number;
  expressiveness: number;
  localScriptLoyalty: number;
  experimentalStreet: number;
};

export type StyleQuizPresetRecommendation = {
  presetId: PersonaPresetId;
  /** Heuristic confidence 0–1. */
  confidence: number;
  reasons: string[];
};

export type StyleQuizResult = {
  traitScores: StyleQuizTraitScore;
  /** Raw sums before normalization (debug / UI “why”). */
  rawSums: Record<string, number>;
  presetRecommendation: StyleQuizPresetRecommendation;
  favoriteVibes: string[];
  dialectAffinities: DialectAffinityProfile[];
  /** Echo of evaluated answers. */
  answers: Record<string, string>;
};

const QUIZ_QUESTIONS: StyleQuizQuestion[] = [
  {
    id: "q_slang_amount",
    category: "slang",
    prompt: "When you use StreetVibe in slang mode, how heavy should the slang feel?",
    options: [
      { id: "minimal", label: "Mostly clean — just a hint of flavor", weights: { slangRaw: 1 } },
      { id: "light", label: "Light street — readable, not thick", weights: { slangRaw: 3 } },
      { id: "balanced", label: "Balanced — real street mix", weights: { slangRaw: 5 } },
      { id: "heavy", label: "Heavy — thick local slang when it fits", weights: { slangRaw: 7 } },
      { id: "max", label: "Maximum immersion — go all in", weights: { slangRaw: 9 } },
    ],
  },
  {
    id: "q_tone",
    category: "tone",
    prompt: "What tone should your rewritten messages lean toward?",
    options: [
      { id: "soft", label: "Soft & friendly", weights: { toneSoft: 4, toneWarm: 2 } },
      { id: "warm", label: "Warm & social", weights: { toneWarm: 4, toneSoft: 1 } },
      { id: "neutral", label: "Neutral / chill", weights: { toneNeutral: 4 } },
      { id: "direct", label: "Direct & confident", weights: { toneDirect: 4 } },
      { id: "sharp", label: "Sharp / confrontational when it fits", weights: { toneAggressive: 4, toneDirect: 2 } },
    ],
  },
  {
    id: "q_phrasing",
    category: "phrasing",
    prompt: "Do you prefer shorter texts or longer, more expressive lines?",
    options: [
      { id: "concise", label: "Short & punchy", weights: { expressRaw: 1 } },
      { id: "balanced", label: "Balanced length", weights: { expressRaw: 3 } },
      { id: "expressive", label: "More expressive / fuller lines", weights: { expressRaw: 6 } },
    ],
  },
  {
    id: "q_script",
    category: "script",
    prompt: "How important is native script & local spelling vs generic English-looking slang?",
    options: [
      { id: "relaxed", label: "Flexible — whatever reads natural", weights: { localScriptRaw: 1 } },
      { id: "balanced", label: "Balanced — local when it matters", weights: { localScriptRaw: 3 } },
      { id: "strict", label: "Local script first — avoid lazy transliteration", weights: { localScriptRaw: 6 } },
    ],
  },
  {
    id: "q_experimental",
    category: "experimental",
    prompt: "Should StreetVibe try bolder slang choices when they still fit the dialect?",
    options: [
      { id: "safe", label: "Keep it safe & predictable", weights: { experimentalRaw: 0 } },
      { id: "sometimes", label: "Sometimes — a bit more creative", weights: { experimentalRaw: 3 } },
      { id: "often", label: "Often — I like experimental street", weights: { experimentalRaw: 6 } },
    ],
  },
  {
    id: "q_vibe",
    category: "vibe",
    prompt: "Which vibe do you use most often?",
    options: [
      { id: "dm", label: "Casual DM / friends", weights: { vibeDm: 5 } },
      { id: "hype", label: "Hype / energy", weights: { vibeHype: 5 } },
      { id: "flirt", label: "Flirty / charming", weights: { vibeFlirt: 5 } },
      { id: "reply", label: "Comebacks / sharp replies", weights: { vibeReply: 5 } },
      { id: "stoned", label: "Chill / mellow", weights: { vibeStoned: 5 } },
      { id: "angry", label: "Heated / angry energy", weights: { vibeAngry: 5 } },
    ],
  },
  {
    id: "q_region",
    category: "region",
    prompt: "Which street culture are you most curious about? (soft affinity hint)",
    options: [
      { id: "none", label: "No preference", weights: {} },
      { id: "london", label: "London / UK road", weights: { affLondon: 5 } },
      { id: "nyc", label: "New York", weights: { affNYC: 5 } },
      { id: "israel", label: "Israeli street / Hebrew", weights: { affIsraeli: 5 } },
      { id: "tokyo", label: "Tokyo / Gyaru-adjacent", weights: { affTokyo: 5 } },
      { id: "paris", label: "Paris banlieue", weights: { affParis: 5 } },
      { id: "russia", label: "Russian street", weights: { affRussian: 5 } },
      { id: "mexico", label: "Mexico City", weights: { affMexico: 5 } },
      { id: "rio", label: "Rio", weights: { affRio: 5 } },
      { id: "jamaica", label: "Jamaican / yard", weights: { affJamaica: 5 } },
    ],
  },
];

function sumWeights(): Record<string, number> {
  const keys = [
    "slangRaw",
    "toneSoft",
    "toneWarm",
    "toneNeutral",
    "toneDirect",
    "toneAggressive",
    "expressRaw",
    "localScriptRaw",
    "experimentalRaw",
    "vibeDm",
    "vibeHype",
    "vibeFlirt",
    "vibeAngry",
    "vibeStoned",
    "vibeReply",
    "affLondon",
    "affNYC",
    "affIsraeli",
    "affTokyo",
    "affParis",
    "affRussian",
    "affMexico",
    "affRio",
    "affJamaica",
  ] as const;
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = 0;
  return out;
}

function accumulateRaw(answers: Record<string, string>): Record<string, number> {
  const raw = sumWeights();
  for (const q of QUIZ_QUESTIONS) {
    const answerId = answers[q.id];
    if (!answerId) continue;
    const opt = q.options.find((o) => o.id === answerId);
    if (!opt) continue;
    const w = opt.weights;
    for (const [k, v] of Object.entries(w)) {
      if (typeof v === "number" && k in raw) {
        raw[k] += v;
      }
    }
  }
  return raw;
}

function clamp01(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function normalizeTraitScores(raw: Record<string, number>): StyleQuizTraitScore {
  const slangIntensity = clamp01(raw.slangRaw / 9);
  const toneTotal =
    raw.toneSoft + raw.toneWarm + raw.toneNeutral + raw.toneDirect + raw.toneAggressive || 1;
  const toneSoftness = clamp01((raw.toneSoft * 1.2 + raw.toneWarm * 0.8) / toneTotal);
  const directness = clamp01((raw.toneDirect + raw.toneAggressive * 1.1) / toneTotal);
  const expressiveness = clamp01(raw.expressRaw / 6);
  const localScriptLoyalty = clamp01(raw.localScriptRaw / 6);
  const experimentalStreet = clamp01(raw.experimentalRaw / 6);
  return {
    slangIntensity,
    toneSoftness,
    directness,
    expressiveness,
    localScriptLoyalty,
    experimentalStreet,
  };
}

function pickFavoriteVibes(raw: Record<string, number>): string[] {
  const vibes: { key: string; w: number }[] = [
    { key: "dm", w: raw.vibeDm },
    { key: "hype", w: raw.vibeHype },
    { key: "flirt", w: raw.vibeFlirt },
    { key: "angry", w: raw.vibeAngry },
    { key: "stoned", w: raw.vibeStoned },
    { key: "reply", w: raw.vibeReply },
  ];
  vibes.sort((a, b) => b.w - a.w);
  const top = vibes.filter((v) => v.w > 0).map((v) => v.key);
  return top.length ? top : ["dm"];
}

function pickDialectAffinities(raw: Record<string, number>): DialectAffinityProfile[] {
  const map: [string, number][] = [
    ["London Roadman", raw.affLondon],
    ["New York Brooklyn", raw.affNYC],
    ["Israeli Street", raw.affIsraeli],
    ["Tokyo Gyaru", raw.affTokyo],
    ["Paris Banlieue", raw.affParis],
    ["Russian Street", raw.affRussian],
    ["Mexico City Barrio", raw.affMexico],
    ["Rio Favela", raw.affRio],
    ["Jamaican Patois", raw.affJamaica],
  ];
  return map
    .filter(([, w]) => w > 0)
    .map(([dialectId, w]) => ({ dialectId, affinity: clamp01(w / 5) }));
}

function recommendPreset(raw: Record<string, number>, traits: StyleQuizTraitScore): StyleQuizPresetRecommendation {
  const reasons: string[] = [];
  let presetId: PersonaPresetId = "balanced_street";
  let confidence = 0.55;

  if (traits.localScriptLoyalty >= 0.75 && raw.localScriptRaw >= 5) {
    presetId = "local_script_first";
    reasons.push("Strong preference for native / local script loyalty.");
    confidence = 0.72;
  } else if (traits.experimentalStreet >= 0.65 && traits.slangIntensity >= 0.55) {
    presetId = "experimental_street";
    reasons.push("High experimental + strong slang interest.");
    confidence = 0.7;
  } else if (traits.slangIntensity <= 0.35 && traits.toneSoftness >= 0.55) {
    presetId = "clean_smooth";
    reasons.push("Light slang + softer tone.");
    confidence = 0.68;
  } else if (traits.toneSoftness >= 0.6 && traits.directness <= 0.45 && traits.slangIntensity <= 0.45) {
    presetId = "soft_friendly";
    reasons.push("Warm / soft-leaning profile.");
    confidence = 0.66;
  } else if (traits.directness >= 0.65 && raw.toneAggressive + raw.toneDirect >= 5) {
    presetId = "assertive_direct";
    reasons.push("Direct, assertive tone scores.");
    confidence = 0.68;
  } else if (traits.slangIntensity >= 0.72 && traits.expressiveness >= 0.55) {
    presetId = "heavy_expressive";
    reasons.push("Heavy slang + expressive phrasing.");
    confidence = 0.7;
  } else {
    reasons.push("Balanced signals — default street preset.");
    confidence = 0.6;
  }

  return { presetId, confidence, reasons };
}

export function listStyleQuizQuestions(): StyleQuizQuestion[] {
  return [...QUIZ_QUESTIONS];
}

export function evaluateStyleQuizAnswers(answers: Record<string, string>): StyleQuizResult {
  const raw = accumulateRaw(answers);
  const traitScores = normalizeTraitScores(raw);
  const presetRecommendation = recommendPreset(raw, traitScores);
  return {
    traitScores,
    rawSums: raw,
    presetRecommendation,
    favoriteVibes: pickFavoriteVibes(raw),
    dialectAffinities: pickDialectAffinities(raw),
    answers: { ...answers },
  };
}

function mapSlangIntensity(traits: StyleQuizTraitScore): SlangIntensityPreference {
  const s = traits.slangIntensity;
  if (s < 0.22) return "clean";
  if (s < 0.4) return "light";
  if (s < 0.58) return "balanced";
  if (s < 0.78) return "heavy";
  return "maximum";
}

function mapTone(traits: StyleQuizTraitScore, raw: Record<string, number>): TonePreference {
  const t = raw.toneSoft + raw.toneWarm * 0.9;
  const d = raw.toneDirect + raw.toneAggressive;
  if (traits.toneSoftness >= 0.55 && t >= d) return "soft";
  if (raw.toneWarm >= raw.toneSoft && raw.toneWarm >= raw.toneNeutral) return "warm";
  if (traits.directness >= 0.55 && raw.toneAggressive >= raw.toneDirect) return "aggressive";
  if (traits.directness >= 0.5) return "assertive";
  return "neutral";
}

function mapPhrase(traits: StyleQuizTraitScore): PhraseStylePreference {
  const e = traits.expressiveness;
  if (e < 0.35) return "concise";
  if (e < 0.62) return "balanced";
  if (e < 0.85) return "expressive";
  return "verbose";
}

/** Derives a partial profile suitable for merging with `normalizePersonalSlangProfile`. */
export function buildProfileFromStyleQuizResult(result: StyleQuizResult): Partial<PersonalSlangProfile> {
  const raw = result.rawSums;
  const t = result.traitScores;
  return {
    id: "style-quiz-derived",
    displayName: "Style quiz",
    enabled: true,
    preferredSlangIntensity: mapSlangIntensity(t),
    preferredTone: mapTone(t, raw),
    preferredPhraseStyle: mapPhrase(t),
    favoriteVibes: result.favoriteVibes,
    dialectAffinities: result.dialectAffinities,
    preferLocalScript: t.localScriptLoyalty >= 0.5,
    allowExperimentalStreetMode: t.experimentalStreet >= 0.45,
    notes: "Derived from style quiz (v1).",
  };
}

export function recommendPersonaPresetFromStyleQuizResult(result: StyleQuizResult): PersonaPresetId {
  return result.presetRecommendation.presetId;
}

export function buildStyleQuizSummary(result: StyleQuizResult): string[] {
  const { traitScores, presetRecommendation, favoriteVibes, dialectAffinities } = result;
  const lines: string[] = [];
  lines.push(
    `Suggested persona preset: ${presetRecommendation.presetId} (confidence ~${Math.round(presetRecommendation.confidence * 100)}%).`
  );
  lines.push(
    `Traits: slang ${Math.round(traitScores.slangIntensity * 100)}%, soft-tone ${Math.round(traitScores.toneSoftness * 100)}%, direct ${Math.round(traitScores.directness * 100)}%, expressive ${Math.round(traitScores.expressiveness * 100)}%, local-script ${Math.round(traitScores.localScriptLoyalty * 100)}%, experimental ${Math.round(traitScores.experimentalStreet * 100)}%.`
  );
  lines.push(`Favorite vibe order: ${favoriteVibes.join(", ")}.`);
  if (dialectAffinities.length) {
    lines.push(
      `Dialect affinities: ${dialectAffinities.map((d) => `${d.dialectId} (${Math.round(d.affinity * 100)}%)`).join("; ")}.`
    );
  }
  lines.push(...presetRecommendation.reasons.map((r) => `Why: ${r}`));
  return lines;
}
