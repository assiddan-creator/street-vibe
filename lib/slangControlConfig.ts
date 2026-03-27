/**
 * Guard / metadata layer for premium-dialect slang consistency (prompt guidance only).
 * Does not replace translation architecture — consumed by `/api/translate` as supporting text.
 *
 * TODO: Local slang frequency scoring (penalize stale terms).
 * TODO: Dictionary freshness / trending terms pipeline.
 * TODO: City-specific slang packs (borough / arrondissement overlays).
 * TODO: User-personalized slang profile (opt-in memory).
 */

import { isKnownPremiumDialect, type StreetVibeDialectId } from "@/lib/dialectRegistry";

export type SlangControlConfig = {
  dialectId: string;
  strictScriptLock: boolean;
  allowLatinFallback: boolean;
  /** Approximate cap on non-native script tokens in the main rewrite (0 = Hebrew-only style enforcement). */
  maxForeignTokens: number;
  preserveLocalSlangPriority: string[];
  bannedGenericTerms: string[];
  rewriteHints: string[];
  dictionaryBiasTerms: string[];
};

const NON_PREMIUM_BASELINE: SlangControlConfig = {
  dialectId: "non-premium",
  strictScriptLock: false,
  allowLatinFallback: true,
  maxForeignTokens: 64,
  preserveLocalSlangPriority: [],
  bannedGenericTerms: [],
  rewriteHints: [],
  dictionaryBiasTerms: [],
};

export const PREMIUM_SLANG_CONTROL: Record<StreetVibeDialectId, SlangControlConfig> = {
  "London Roadman": {
    dialectId: "London Roadman",
    strictScriptLock: true,
    allowLatinFallback: true,
    maxForeignTokens: 4,
    preserveLocalSlangPriority: ["MLE / British street English", "roadman cadence", "multicultural London"],
    bannedGenericTerms: ["fam", "literally", "no cap", "vibe"],
    rewriteHints: [
      "Keep UK street English; avoid American filler unless it is already natural in London youth speech.",
      "Do not default to generic internet slang—prefer neighborhood-authentic terms.",
    ],
    dictionaryBiasTerms: ["bruv", "mandem", "wagwan", "allow it"],
  },
  "Jamaican Patois": {
    dialectId: "Jamaican Patois",
    strictScriptLock: true,
    allowLatinFallback: true,
    maxForeignTokens: 4,
    preserveLocalSlangPriority: ["Jamaican Patois orthography", "yard / dancehall cadence"],
    bannedGenericTerms: ["fam", "broski", "no cap"],
    rewriteHints: [
      "Prefer authentic Patois forms over standard English paraphrase when slang is requested.",
      "Keep spelling consistent with common Patois chat style.",
    ],
    dictionaryBiasTerms: ["wah gwaan", "irie", "nuh", "fi real"],
  },
  "New York Brooklyn": {
    dialectId: "New York Brooklyn",
    strictScriptLock: true,
    allowLatinFallback: true,
    maxForeignTokens: 4,
    preserveLocalSlangPriority: ["NYC / Brooklyn street tone", "compressed clauses"],
    bannedGenericTerms: ["literally", "vibe check", "no cap"],
    rewriteHints: [
      "Keep NYC street voice—avoid West Coast or UK defaults.",
      "Short punchy lines; avoid over-explaining.",
    ],
    dictionaryBiasTerms: ["deadass", "bet", "tight", "son"],
  },
  "Tokyo Gyaru": {
    dialectId: "Tokyo Gyaru",
    strictScriptLock: true,
    allowLatinFallback: false,
    maxForeignTokens: 1,
    preserveLocalSlangPriority: ["Japanese script", "gyaru / youth chat style"],
    bannedGenericTerms: ["lol", "omg", "wtf"],
    rewriteHints: [
      "Japanese body text in hiragana/katakana/kanji—no romaji for main slang.",
      "Latin only for unavoidable loan brands if needed.",
    ],
    dictionaryBiasTerms: ["やばい", "マジ", "ウケる", "チョ"],
  },
  "Paris Banlieue": {
    dialectId: "Paris Banlieue",
    strictScriptLock: true,
    allowLatinFallback: false,
    maxForeignTokens: 2,
    preserveLocalSlangPriority: ["French banlieue youth tone", "verlan where natural"],
    bannedGenericTerms: ["bro", "literally", "cool story"],
    rewriteHints: [
      "Keep French as the matrix; avoid English unless already natural in this subculture.",
      "Avoid textbook formal French when slang mode is on.",
    ],
    dictionaryBiasTerms: ["wesh", "chelou", "reuf", "miskine"],
  },
  "Russian Street": {
    dialectId: "Russian Street",
    strictScriptLock: true,
    allowLatinFallback: false,
    maxForeignTokens: 1,
    preserveLocalSlangPriority: ["Cyrillic Russian", "Moscow / SPb youth chat"],
    bannedGenericTerms: ["bro", "literally", "lol"],
    rewriteHints: [
      "Cyrillic for main text—Latin only for unavoidable brands.",
      "Follow the existing Russian critical rules block when present.",
    ],
    dictionaryBiasTerms: ["бро", "чё", "норм", "кринж"],
  },
  "Mexico City Barrio": {
    dialectId: "Mexico City Barrio",
    strictScriptLock: true,
    allowLatinFallback: true,
    maxForeignTokens: 3,
    preserveLocalSlangPriority: ["Mexican Spanish street", "CDMX chat tone"],
    bannedGenericTerms: ["literally", "broski"],
    rewriteHints: [
      "Keep Mexican lexical choices—avoid Spain-default vocabulary unless appropriate.",
      "Short natural texting rhythm.",
    ],
    dictionaryBiasTerms: ["neta", "chido", "qué onda", "güey"],
  },
  "Rio Favela": {
    dialectId: "Rio Favela",
    strictScriptLock: true,
    allowLatinFallback: true,
    maxForeignTokens: 3,
    preserveLocalSlangPriority: ["Brazilian Portuguese", "Rio street tone"],
    bannedGenericTerms: ["literally", "bro"],
    rewriteHints: [
      "Brazilian Portuguese only—avoid European Portuguese defaults.",
      "Keep melodic, conversational pacing.",
    ],
    dictionaryBiasTerms: ["mano", "mó", "firmeza", "trampo"],
  },
  "Israeli Street": {
    dialectId: "Israeli Street",
    strictScriptLock: true,
    allowLatinFallback: false,
    maxForeignTokens: 0,
    preserveLocalSlangPriority: [
      "Hebrew script street Hebrew",
      "עברית בלבד בגוף ההודעה",
      "סלנג עירוני עכשווי (תל אביב / ישראל)",
    ],
    bannedGenericTerms: [
      "sababa",
      "yalla",
      "achi",
      "magniv",
      "bro",
      "literally",
      "ok cool",
    ],
    rewriteHints: [
      "Hebrew slang must appear in Hebrew letters—never English transliteration for core slang.",
      "Prefer contemporary Israeli youth WhatsApp cadence; short clauses.",
      "Latin letters only for unavoidable proper nouns or global brands if absolutely required.",
      "Keep anti-leakage: do not echo Hebrew loaned into Latin unless dialect policy allows (here: never for main text).",
    ],
    dictionaryBiasTerms: ["סבבה", "יאללה", "אחי", "אחלה", "וואלה", "סטלה"],
  },
};

export function getSlangControlConfig(dialectId?: string): SlangControlConfig {
  if (!dialectId || !isKnownPremiumDialect(dialectId)) {
    return NON_PREMIUM_BASELINE;
  }
  return PREMIUM_SLANG_CONTROL[dialectId as StreetVibeDialectId];
}

/** True when the dialect is configured for maximum script/token discipline (v1: Israeli Street). */
export function shouldEnforceStrictSlangControl(dialectId?: string): boolean {
  const c = getSlangControlConfig(dialectId);
  return c.strictScriptLock && !c.allowLatinFallback && c.maxForeignTokens === 0;
}

/**
 * Compact prompt appendix for premium slang requests — does not alter OUTPUT FORMAT rules.
 */
export function formatSlangControlPromptGuidance(dialectId: string): string {
  if (!isKnownPremiumDialect(dialectId)) return "";
  const c = getSlangControlConfig(dialectId);
  const priority = c.preserveLocalSlangPriority.slice(0, 4).join("; ");
  const banned = c.bannedGenericTerms.slice(0, 10).join(", ");
  const hints = c.rewriteHints.slice(0, 5).map((h) => `  • ${h}`).join("\n");
  const bias = c.dictionaryBiasTerms.slice(0, 8).join(", ");
  return [
    "SLANG CONSISTENCY (supporting guidance — do not break OUTPUT FORMAT above):",
    `- Script lock: ${c.strictScriptLock ? "strict" : "standard"}; Latin fallback allowed: ${c.allowLatinFallback ? "yes" : "no"}`,
    `- Target non-native token budget (approx): ${c.maxForeignTokens}`,
    `- Prioritize: ${priority}`,
    banned ? `- Avoid generic filler: ${banned}` : "",
    hints ? `Hints:\n${hints}` : "",
    bias ? `- Dictionary bias examples (not exhaustive): ${bias}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Extra retry lines for Israeli Street — pairs with `ISRAELI_STREET_RETRY_REINFORCEMENT` in `hebrewOutputGuard`. */
export function formatIsraeliStreetRetryFromConfig(): string {
  const c = getSlangControlConfig("Israeli Street");
  const lines = c.rewriteHints.map((h) => `  • ${h}`);
  lines.push(`  • Dictionary bias examples: ${c.dictionaryBiasTerms.slice(0, 8).join(", ")}`);
  return `\n\nISRAELI STREET — CONFIG-LOCKED RETRY (from slang control):\n${lines.join("\n")}\n`;
}
