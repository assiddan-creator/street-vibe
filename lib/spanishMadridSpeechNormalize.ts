/**
 * Last-mile cleanup for Spanish Madrid TTS: emoji off, chat abbreviations expanded — no ML.
 */

export const SPANISH_MADRID_DIALECT_ID = "Spanish Madrid";

export function normalizeSpanishMadridForSpeech(text: string, dialectId: string | undefined): string {
  if (dialectId !== SPANISH_MADRID_DIALECT_ID) return text;

  let s = text.replace(/\r\n/g, "\n").trim();
  if (!s) return s;

  try {
    s = s.normalize("NFC");
  } catch {
    /* ignore */
  }

  s = s.replace(/[\u200B-\u200D\uFEFF\u2060]/g, "");
  s = s.replace(/\p{Extended_Pictographic}/gu, "");

  // Common chat abbreviations → speakable words (conservative)
  s = s.replace(/\bxq\b/gi, "porque");
  s = s.replace(/\bpq\b/gi, "porque");
  s = s.replace(/\btmb\b/gi, "también");
  s = s.replace(/\btbm\b/gi, "también");
  s = s.replace(/\btb\b/gi, "también");

  s = s.replace(/([!.?¿¡])\1{2,}/g, "$1");
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n[ \t]+/g, "\n");
  s = s.replace(/[ \t]+\n/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");

  return s.trim();
}
