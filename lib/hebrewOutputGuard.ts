/**
 * Post-processing helpers for Israeli Street dialect: detect Latin/English leakage in Hebrew-first output.
 * Used only by `/api/translate` when `currentLang === "Israeli Street"`.
 */

/** Whole-token Latin allowlist (lowercase). Keep minimal — prefer zero Latin in output. */
const WHITELIST_LATIN_TOKENS = new Set([
  "ok",
  "vip",
  "tv",
  "cd",
  "gps",
  "sms",
  "url",
  "app",
]);

/** Common standalone English fillers to strip when sanitizing (Latin-only words). */
const LATIN_FILLER_PATTERN =
  /\b(?:the|a|an|and|or|but|is|are|was|were|to|of|in|on|for|with|it|its|at|as|be|have|has|had|do|does|did|not|no|yes|hey|hi|lol|omg|wtf|tbh|imo|fyi)\b/gi;

/**
 * Counts Latin letter sequences inside whitespace-delimited tokens; ignores whitelist-only sequences.
 */
export function countLatinTokens(text: string): number {
  let count = 0;
  const tokens = text.match(/\S+/g) ?? [];
  for (const raw of tokens) {
    const sequences = raw.match(/[a-zA-Z]+/g);
    if (!sequences) continue;
    for (const seq of sequences) {
      if (WHITELIST_LATIN_TOKENS.has(seq.toLowerCase())) continue;
      count += 1;
    }
  }
  return count;
}

export function containsLatinLeak(text: string): boolean {
  return countLatinTokens(text) > 0;
}

/**
 * Light cleanup: normalize whitespace; if Latin leakage is present, remove obvious English filler words.
 * Does not alter meaning aggressively. Caller passes only the translated segment (no `|||` block).
 */
export function sanitizeIsraeliStreetOutput(text: string): string {
  let s = text.replace(/\s+/g, " ").trim();
  if (!containsLatinLeak(s)) return s;
  s = s.replace(LATIN_FILLER_PATTERN, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/** After sanitization, whether a second model pass is warranted (still meaningful Latin leakage). */
export function shouldRetryIsraeliStreetOutput(text: string): boolean {
  return containsLatinLeak(text);
}

/** Appended once to the same prompt on Israeli Street retry only. */
export const ISRAELI_STREET_RETRY_REINFORCEMENT = `

RETRY-REINFORCEMENT (mandatory — your previous answer still had Latin/English in the main message):
- The rewritten message above the separator must be Hebrew script ONLY (Unicode Hebrew letters א–ת, normal Hebrew punctuation, and digits if needed).
- No English words. No Latin letters in that main block.
- Do not transliterate Hebrew slang into Latin; write it in Hebrew characters.
- If you used English loan slang, replace with Hebrew street phrasing where possible.
- Keep the exact same OUTPUT FORMAT: rewritten text, then a line with |||, then the dictionary lines as before.`;
