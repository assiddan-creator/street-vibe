/**
 * When to offer Hebrew-letter read-aloud transliteration of the translated line (v1).
 * General capability: any target language → Hebrew letters; display gated by UI / source language.
 */

export function shouldOfferHebrewTransliteration(
  sourceLanguage?: string | null,
  uiLocale?: string | null
): boolean {
  const s = (sourceLanguage ?? "").toLowerCase().trim();
  const u = (uiLocale ?? "").toLowerCase().trim();
  return s.startsWith("he") || u.startsWith("he");
}

/** If the main translation is already mostly Hebrew script, skip read-aloud transliteration. */
export function isPrimarilyHebrewScript(s: string): boolean {
  const stripped = s.replace(/\s+/g, "");
  if (!stripped) return false;
  let hebrew = 0;
  for (const ch of stripped) {
    if (/[\u0590-\u05FF]/.test(ch)) hebrew++;
  }
  return hebrew / stripped.length > 0.5;
}

/** Reject model slippage (English gloss in transliteration field). */
export function looksLikeHebrewLetterTransliteration(s: string): boolean {
  const t = s.trim();
  if (!t || t.length < 2) return false;
  const he = (t.match(/[\u0590-\u05FF]/g) ?? []).length;
  const lat = (t.match(/[A-Za-z]/g) ?? []).length;
  return he >= 3 && he >= lat;
}
