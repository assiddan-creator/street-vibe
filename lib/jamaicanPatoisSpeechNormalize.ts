/**
 * Kingston / Jamaican Patois speech-only prosody normalization.
 *
 * Problem: the generic marker-based punctuation in `speechPunctuation.ts`
 * only knows single-word openers/closers ("yow", "bredda") and treats them
 * independently. Real Kingston lines chunk into recognizable units — an
 * opening address, a short conversational question, then the main
 * suggestion — and reading them as one flat run-on loses that rhythm:
 *
 *   "Yow bredda wan gwaan yu waan step out tonight"
 *   -> "Yow bredda, wah gwaan? Yuh waan step out tonight?"
 *
 * This is deliberately isolated from the shared English marker set in
 * `speechPunctuation.ts` — Kingston is removed from that file's dialect map
 * (see the comment there) so London/Brooklyn/every other "en" dialect keeps
 * its exact existing behaviour, and this file owns Kingston's speech text
 * end to end. Only the copy sent to ElevenLabs is touched; the on-screen and
 * copied translation is never read or modified by this module.
 *
 * Every step below is conservative and structural, not a general slang
 * rewrite: a fixed, tiny spelling list, a fixed opener-address list, and a
 * fixed set of recognizable question stems. Nothing here changes meaning,
 * and every insertion checks it isn't already punctuated (idempotent).
 */

export const JAMAICAN_PATOIS_DIALECT_ID = "Jamaican Patois";

/** A letter/number in the Latin alphabet — this dialect's speech text is Latin-script English. */
const WORD = "[A-Za-z0-9]";
/** A boundary that already reads as a clause break. */
const CLAUSE_START = "(?:^|[,.!?]\\s+)";
const ALREADY_PUNCTUATED = "(?:\\s*[,.!?])";

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * Case-preserving whole-word replacement: keeps the original's leading
 * capital if it had one, so a sentence-initial "Wan gwaan" becomes
 * "Wah gwaan" rather than losing its capitalization.
 */
function replaceWordPreservingCase(text: string, pattern: RegExp, replacement: string): string {
  return text.replace(pattern, (match) => {
    const wasCapitalized = /^[A-Z]/.test(match);
    return wasCapitalized ? capitalize(replacement) : replacement;
  });
}

// ---------------------------------------------------------------------------
// Step 1 — spelling normalization. A very small, explicit list: only forms
// that read wrong verbatim ("wan gwaan" sounds like "one gwaan") and are safe
// in every context. Nothing here touches meaning or slang choice.
// ---------------------------------------------------------------------------
function normalizeSpelling(text: string): string {
  let out = text;
  out = replaceWordPreservingCase(out, /\bwan\s+gwaan\b/gi, "wah gwaan");
  // Standalone "yu" only — never touches "yuh" (already correct) or "you".
  out = replaceWordPreservingCase(out, /\byu\b/gi, "yuh");
  return out;
}

// ---------------------------------------------------------------------------
// Step 2 — opening address. "Yow bredda", "Bredda", "Bro" etc. at the start
// of a clause read as one vocative unit, not a run-on into what follows.
// ---------------------------------------------------------------------------
const OPENER_INTERJECTIONS = ["yow", "bwoy", "eh"];
const OPENER_ADDRESSES = ["bredda", "bredrin", "bro", "fam", "blud", "sis", "yute", "dawg"];

function addOpenerComma(text: string): string {
  const interj = OPENER_INTERJECTIONS.join("|");
  const addr = OPENER_ADDRESSES.join("|");
  // Interjection + address ("Yow bredda") or address alone ("Bredda"), only
  // at a clause start, only when not already followed by punctuation.
  const re = new RegExp(
    `(${CLAUSE_START})((?:(?:${interj})\\s+)?(?:${addr}))\\b(?!${ALREADY_PUNCTUATED})(?=\\s+${WORD})`,
    "giu"
  );
  return text.replace(re, (_m, boundary: string, opener: string) => `${boundary}${opener},`);
}

// ---------------------------------------------------------------------------
// Step 3 — self-contained question phrases: the whole clause IS the phrase
// ("wah gwaan?", "yuh good?"). When more text follows, that text starts a
// new sentence, so its first letter is capitalized.
// ---------------------------------------------------------------------------
const SELF_CONTAINED_QUESTION_STEMS = ["wah gwaan", "yuh good", "yuh deh yah", "yuh alright", "yuh ok"];

function punctuateSelfContainedStems(text: string): string {
  const stems = SELF_CONTAINED_QUESTION_STEMS.join("|");
  const re = new RegExp(
    `(${CLAUSE_START})(${stems})\\b(?!${ALREADY_PUNCTUATED})(?:\\s+(${WORD}))?`,
    "giu"
  );
  return text.replace(re, (_m, boundary: string, stem: string, nextChar?: string) =>
    nextChar ? `${boundary}${stem}? ${nextChar.toUpperCase()}` : `${boundary}${stem}?`
  );
}

// ---------------------------------------------------------------------------
// Step 4 — lead-in question stems: the stem opens a clause that continues
// ("yuh waan step out tonight") and the question mark belongs at the end of
// that clause. Conservative scope: only applied when the stem's clause runs
// to the end of the string, so no internal break is invented.
// ---------------------------------------------------------------------------
const LEAD_IN_QUESTION_STEMS = ["yuh waan", "yuh deh", "yuh a"];

function punctuateTrailingLeadInStem(text: string): string {
  const stems = LEAD_IN_QUESTION_STEMS.map((s) => s.replace(/\s+/g, "\\s+"));
  const re = new RegExp(`(${CLAUSE_START})(?:${stems.join("|")})\\b`, "iu");
  if (!re.test(text)) return text;
  if (/[.!?]\s*$/.test(text)) return text; // already terminated
  return `${text.trimEnd()}?`;
}

// ---------------------------------------------------------------------------
// Step 5 — "man" as a mid-line address tag ("long time man mek wi link…").
// Reads as its own short beat: a comma before it, a full stop after it, then
// the next clause starts capitalized. At the very end of the string it only
// gets the leading comma, matching the existing tail-marker convention.
// ---------------------------------------------------------------------------
function punctuateManTag(text: string): string {
  const re = /(?<=[A-Za-z0-9])\s+man\b(?!\s*[,.!?])(?:\s+([A-Za-z]))?/gu;
  return text.replace(re, (_m, nextChar?: string) =>
    nextChar ? `, man. ${nextChar.toUpperCase()}` : ", man"
  );
}

/**
 * Speech-only normalization for Kingston / Jamaican Patois. No-op for every
 * other dialect. Never touches the displayed/copied translation — callers
 * must only apply this to the separate string sent to the voice engine.
 */
export function normalizeJamaicanPatoisForSpeech(text: string, dialectId: string | undefined): string {
  if (dialectId !== JAMAICAN_PATOIS_DIALECT_ID) return text;
  if (!text.trim()) return text;

  let out = text;
  out = normalizeSpelling(out);
  out = addOpenerComma(out);
  out = punctuateSelfContainedStems(out);
  out = punctuateTrailingLeadInStem(out);
  out = punctuateManTag(out);
  return out;
}
