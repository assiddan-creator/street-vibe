/**
 * Premium dialect “personality packs” — additive metadata for translate prompts and TTS observability.
 * Does not replace script locks, slang control, or personal profiles.
 *
 * TODO: City-specific overlays (borough / zona / arrondissement).
 * TODO: Trending slang refresh pipeline.
 * TODO: Pack-bound voice personas for MiniMax / Google.
 * TODO: Pack-level TTS pacing presets (speed curves, pause maps).
 * TODO: Marketplace / downloadable third-party packs (signed).
 */

import { isKnownPremiumDialect, type StreetVibeDialectId } from "@/lib/dialectRegistry";

export type DialectRhythmProfile = {
  /** Short label, e.g. "clipped UK roadman". */
  pattern: string;
  cadence: "staccato" | "swingy" | "compressed" | "flowing" | "elastic" | "linear" | "melodic";
};

export type DialectDeliveryProfile = {
  feel: string;
  bluntness: "soft" | "medium" | "hard";
  directness: "low" | "medium" | "high";
};

export type DialectPromptStyleHints = {
  /** Bullets merged into translate prompt appendix. */
  translate: string[];
  /** Optional extra tone notes (merged into translate). */
  toneNotes: string[];
};

export type DialectPack = {
  dialectId: StreetVibeDialectId;
  displayLabel: string;
  phraseRhythm: DialectRhythmProfile;
  preferredSentenceLength: "short" | "medium" | "long";
  slangDensityBias: "low" | "medium" | "high";
  deliveryStyle: DialectDeliveryProfile;
  scriptPreference: string;
  promptHints: DialectPromptStyleHints;
  /** Internal TTS guidance — not spoken; surfaced in logs / future pacing hooks. */
  ttsHints: string[];
  interjectionHints: string[];
  rewriteBiasTerms: string[];
};

export const DIALECT_PACKS: Record<StreetVibeDialectId, DialectPack> = {
  "London Roadman": {
    dialectId: "London Roadman",
    displayLabel: "London Roadman",
    phraseRhythm: { pattern: "sharper, clipped, confident", cadence: "staccato" },
    preferredSentenceLength: "short",
    slangDensityBias: "medium",
    deliveryStyle: {
      feel: "dry confidence, multicultural London edges",
      bluntness: "medium",
      directness: "high",
    },
    scriptPreference: "Latin English; UK street tone, not US defaults.",
    promptHints: {
      translate: [
        "Lean into MLE / roadman rhythm: short clauses, confident drops.",
        "Avoid American filler; prefer UK youth chat patterns when slang applies.",
      ],
      toneNotes: ["Sounds like WhatsApp with mandem — not a lesson."],
    },
    ttsHints: [
      "Slightly clipped phrasing; avoid sing-song intonation.",
      "Stress confidence on key slang beats, not every word.",
    ],
    interjectionHints: ["Rare dry (breath) before a punchline clause if natural."],
    rewriteBiasTerms: ["bruv", "mandem", "wagwan", "allow it", "ends"],
  },
  "Jamaican Patois": {
    dialectId: "Jamaican Patois",
    displayLabel: "Jamaican Patois",
    phraseRhythm: { pattern: "looser, rhythmic, swingy", cadence: "swingy" },
    preferredSentenceLength: "medium",
    slangDensityBias: "medium",
    deliveryStyle: {
      feel: "yard energy, musical cadence",
      bluntness: "medium",
      directness: "medium",
    },
    scriptPreference: "English/Patois orthography; keep yard authenticity over textbook English.",
    promptHints: {
      translate: [
        "Let sentences breathe — swingy rhythm, not robotic word order.",
        "Honor Patois spellings when slang mode is on; avoid flattening to standard English only.",
      ],
      toneNotes: ["Warm but sharp; dancehall-adjacent without caricature."],
    },
    ttsHints: [
      "Flowing phrase groups; slightly longer breath units than clipped UK.",
      "Emphasize natural vowel warmth on key patois hits.",
    ],
    interjectionHints: ["Light (laughs) only if it matches yard banter cadence."],
    rewriteBiasTerms: ["wah gwaan", "irie", "fi real", "nuh", "a so"],
  },
  "New York Brooklyn": {
    dialectId: "New York Brooklyn",
    displayLabel: "New York Brooklyn",
    phraseRhythm: { pattern: "compressed, punchy, direct", cadence: "compressed" },
    preferredSentenceLength: "short",
    slangDensityBias: "high",
    deliveryStyle: {
      feel: "fast NYC street talk",
      bluntness: "hard",
      directness: "high",
    },
    scriptPreference: "US Latin alphabet; NYC defaults, not LA or UK.",
    promptHints: {
      translate: [
        "Tight clauses; stack punches; drop filler.",
        "Avoid West Coast or Southern US defaults when choosing slang.",
      ],
      toneNotes: ["Sounds like a Brooklyn groupchat — confident, a little confrontational when context fits."],
    },
    ttsHints: [
      "Fast attack on phrase starts; shorter breath groups.",
      "Keep emphasis on attitude words, not polite connectives.",
    ],
    interjectionHints: ["Rare stressed pause before a comeback bar."],
    rewriteBiasTerms: ["deadass", "bet", "tight", "son", "talking spicy"],
  },
  "Tokyo Gyaru": {
    dialectId: "Tokyo Gyaru",
    displayLabel: "Tokyo Gyaru",
    phraseRhythm: { pattern: "playful, clipped, stylish", cadence: "staccato" },
    preferredSentenceLength: "short",
    slangDensityBias: "medium",
    deliveryStyle: {
      feel: "cute-sharp, trend-aware",
      bluntness: "soft",
      directness: "medium",
    },
    scriptPreference: "Japanese scripts only for main text; avoid romaji body copy.",
    promptHints: {
      translate: [
        "Short trendy bursts; mix kana/kanji like real youth chat.",
        "Avoid stiff keigo unless the input demands politeness.",
      ],
      toneNotes: ["Stylish and playful — not anime narrator voice."],
    },
    ttsHints: [
      "Bright, clipped phrase endings; avoid monotone.",
      "Micro-pauses between trendy interjections if present.",
    ],
    interjectionHints: ["Optional airy (breath) before a cute punchy clause."],
    rewriteBiasTerms: ["やばい", "マジ", "ウケる", "チョ", "それな"],
  },
  "Paris Banlieue": {
    dialectId: "Paris Banlieue",
    displayLabel: "Paris Banlieue",
    phraseRhythm: { pattern: "cool, elastic, attitude-heavy", cadence: "elastic" },
    preferredSentenceLength: "medium",
    slangDensityBias: "medium",
    deliveryStyle: {
      feel: "banlieue cool, ironic edge",
      bluntness: "medium",
      directness: "high",
    },
    scriptPreference: "French matrix; verlan only when natural; avoid anglicizing the whole line.",
    promptHints: {
      translate: [
        "Elastic phrasing — stretch and snap, not textbook paragraphs.",
        "Keep Paris banlieue youth tone; avoid Belgium/Swiss defaults.",
      ],
      toneNotes: ["Attitude without sounding like a tourist phrasebook."],
    },
    ttsHints: [
      "Slight drawl on attitude syllables; keep endings clean.",
      "Avoid over-enunciated ‘textbook French’ pacing.",
    ],
    interjectionHints: ["Soft (sighs) only for ironic frustration beats."],
    rewriteBiasTerms: ["wesh", "chelou", "reuf", "miskine", "c’est chaud"],
  },
  "Russian Street": {
    dialectId: "Russian Street",
    displayLabel: "Russian Street",
    phraseRhythm: { pattern: "hard, direct, low flourish", cadence: "linear" },
    preferredSentenceLength: "short",
    slangDensityBias: "high",
    deliveryStyle: {
      feel: "Moscow / SPb youth chat",
      bluntness: "hard",
      directness: "high",
    },
    scriptPreference: "Cyrillic for main text; Latin only for brands if needed.",
    promptHints: {
      translate: [
        "Follow the Russian critical rules block when present; slang must obey grammar.",
        "Prefer current Telegram/VK youth lexicon over old criminal clichés.",
      ],
      toneNotes: ["Dry, fast, low drama — unless context demands hype."],
    },
    ttsHints: [
      "Direct, low-embellishment delivery; crisp consonants on slang hits.",
      "Avoid sing-song; keep street flatness.",
    ],
    interjectionHints: ["Rare (breath) between two blunt clauses if it matches chat rhythm."],
    rewriteBiasTerms: ["бро", "чё", "норм", "кринж", "жиза", "пон"],
  },
  "Mexico City Barrio": {
    dialectId: "Mexico City Barrio",
    displayLabel: "Mexico City Barrio",
    phraseRhythm: { pattern: "warm, punchy, local", cadence: "flowing" },
    preferredSentenceLength: "medium",
    slangDensityBias: "medium",
    deliveryStyle: {
      feel: "CDMX street warmth",
      bluntness: "medium",
      directness: "medium",
    },
    scriptPreference: "Mexican Spanish; avoid Spain-Europe defaults.",
    promptHints: {
      translate: [
        "Local CDMX flavor; warm but still street — not overly formal.",
        "Choose mexicanismos over generic Latin American neutral when slang applies.",
      ],
      toneNotes: ["Sounds like friends on WhatsApp in CDMX."],
    },
    ttsHints: [
      "Warm phrase tails; natural stress on local slang syllables.",
      "Slightly more legato between clauses than NYC punch mode.",
    ],
    interjectionHints: ["Light (laughs) on friendly roast beats if natural."],
    rewriteBiasTerms: ["neta", "chido", "qué onda", "güey", "órale"],
  },
  "Rio Favela": {
    dialectId: "Rio Favela",
    displayLabel: "Rio Favela",
    phraseRhythm: { pattern: "melodic, fluid, expressive", cadence: "melodic" },
    preferredSentenceLength: "medium",
    slangDensityBias: "medium",
    deliveryStyle: {
      feel: "Rio warmth + swing",
      bluntness: "soft",
      directness: "medium",
    },
    scriptPreference: "Brazilian Portuguese; avoid European Portuguese phonology/lexicon defaults.",
    promptHints: {
      translate: [
        "Melodic, conversational flow; expressive but not theatrical unless context demands.",
        "Keep carioca street authenticity over neutral PT-BR news tone.",
      ],
      toneNotes: ["Sounds like voice notes between friends — fluid, human."],
    },
    ttsHints: [
      "Longer melodic breath lines; smooth connectors between phrases.",
      "Emphasis on emotional peaks, not mechanical evenness.",
    ],
    interjectionHints: ["Soft (breath) between melodic clauses if it fits."],
    rewriteBiasTerms: ["mano", "mó", "firmeza", "trampo", "véi"],
  },
  "Israeli Street": {
    dialectId: "Israeli Street",
    displayLabel: "Israeli Street",
    phraseRhythm: { pattern: "blunt, fast, script-loyal", cadence: "staccato" },
    preferredSentenceLength: "short",
    slangDensityBias: "high",
    deliveryStyle: {
      feel: "Tel Aviv youth WhatsApp",
      bluntness: "hard",
      directness: "high",
    },
    scriptPreference: "Hebrew script for all core slang — zero Latin transliteration for Hebrew ideas.",
    promptHints: {
      translate: [
        "Hebrew-only body text for slang; sababa/yalla must be Hebrew letters if used.",
        "Fast, blunt clauses; minimal polite padding.",
      ],
      toneNotes: ["Sounds like real Israeli groupchat — confident, clipped, local."],
    },
    ttsHints: [
      "Fast, staccato clause groups; Hebrew stress patterns on slang peaks.",
      "Never read English transliterations as the main delivery — align with Hebrew script output.",
    ],
    interjectionHints: ["Sparse; prefer meaning in Hebrew over stage directions."],
    rewriteBiasTerms: ["סבבה", "יאללה", "אחי", "אחלה", "וואלה", "סטלה"],
  },
  "Arabic Egyptian": {
    dialectId: "Arabic Egyptian",
    displayLabel: "Arabic Egyptian (Cairo)",
    phraseRhythm: { pattern: "warm, compact, conversational", cadence: "linear" },
    preferredSentenceLength: "short",
    slangDensityBias: "low",
    deliveryStyle: {
      feel: "Greater Cairo urban chat — modern, restrained, human",
      bluntness: "medium",
      directness: "medium",
    },
    scriptPreference:
      "Arabic script only for Arabic words; Egyptian colloquial register — not MSA essay tone, not theatrical street performance.",
    promptHints: {
      translate: [
        "Urban Egyptian (Cairo-first): sound like real WhatsApp/Telegram between peers — warm, modern, sendable.",
        "Preserve intent and tone first; add local Egyptian flavor only where it fits naturally — avoid obvious dialect injection or caricature slang.",
        "No Arabizi: do not write Arabic words in Latin letters. No stacked discourse markers; avoid meme-like catchphrases.",
        "Anti-overcooked: short input → short output; no assistant padding, meta, or explanation.",
      ],
      toneNotes: ["Believable young-adult Cairo chat — not newscaster MSA, not exaggerated 'movie street'."],
    },
    ttsHints: [
      "Natural conversational pace; slightly more phrase boundary room than ultra-compressed text.",
      "Warm but restrained — not announcer, not dramatic, not MSA cadence.",
      "Prefer wording that sounds natural aloud; the TTS route applies conservative Arabic Premium normalization before synthesis.",
    ],
    interjectionHints: ["Rare soft breath between clauses only if it matches chat rhythm — never theatrical."],
    rewriteBiasTerms: ["خلاص", "يعني", "ماشي", "تمام", "عادي", "أكيد", "برضه", "دلوقتي"],
  },
};

export function getDialectPack(dialectId?: string): DialectPack | undefined {
  if (!dialectId || !isKnownPremiumDialect(dialectId)) return undefined;
  return DIALECT_PACKS[dialectId as StreetVibeDialectId];
}

/** Lines appended to translate prompt (premium + slang path). */
export function buildDialectPackPromptHints(dialectId?: string): string[] {
  const pack = getDialectPack(dialectId);
  if (!pack) return [];

  const lines: string[] = [
    `Dialect personality (${pack.displayLabel}): rhythm=${pack.phraseRhythm.pattern}; cadence=${pack.phraseRhythm.cadence}; sentence length bias=${pack.preferredSentenceLength}; slang density bias=${pack.slangDensityBias}.`,
    `Delivery: ${pack.deliveryStyle.feel}; bluntness=${pack.deliveryStyle.bluntness}; directness=${pack.deliveryStyle.directness}.`,
    `Script preference: ${pack.scriptPreference}`,
  ];

  lines.push(...pack.promptHints.translate);
  lines.push(...pack.promptHints.toneNotes);

  if (pack.rewriteBiasTerms.length) {
    lines.push(`Local lexical bias (examples, not exhaustive): ${pack.rewriteBiasTerms.slice(0, 10).join(", ")}.`);
  }

  return lines;
}

/** TTS-side hints — safe to log / future pacing; do not concatenate into spoken text in v1. */
export function getDialectPackTtsHints(dialectId?: string): string[] {
  const pack = getDialectPack(dialectId);
  if (!pack) return [];
  return [...pack.ttsHints, ...pack.interjectionHints];
}

export function formatDialectPackPromptAppendix(hints: string[]): string {
  if (!hints.length) return "";
  return (
    "\n\nDIALECT PACK (supporting personality guidance — do not break OUTPUT FORMAT):\n" +
    hints.map((h) => `• ${h}`).join("\n") +
    "\n"
  );
}
