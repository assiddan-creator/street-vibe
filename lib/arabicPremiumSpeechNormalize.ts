/**
 * Conservative text cleanup for Arabic Premium (Arabic Egyptian) before cloud TTS — no ML, no training.
 * Keeps Arabic-script content speakable; strips noise that reads fine in chat but sounds wrong aloud.
 */

export const ARABIC_EGYPTIAN_DIALECT_ID = "Arabic Egyptian";

/**
 * Last-mile normalization for Google / MiniMax speech input when dialect is Arabic Egyptian.
 * Does not translate or paraphrase — only structural cleanup.
 */
export function normalizeArabicPremiumForSpeech(text: string, dialectId: string | undefined): string {
  if (dialectId !== ARABIC_EGYPTIAN_DIALECT_ID) return text;

  let s = text.replace(/\r\n/g, "\n").trim();
  if (!s) return s;

  try {
    s = s.normalize("NFC");
  } catch {
    /* ignore */
  }

  // Invisible / formatting chars that can confuse TTS
  s = s.replace(/[\u200B-\u200D\uFEFF\u2060]/g, "");

  // Emoji & most pictographs (social “reaction” noise)
  s = s.replace(/\p{Extended_Pictographic}/gu, "");

  // Latin runs (Arabizi / stray English) — product path should already be Arabic script
  s = s.replace(/[A-Za-z]+/g, " ");

  // Collapse exaggerated repeated Arabic letters (chat emphasis) for clearer pronunciation
  s = s.replace(/([\u0600-\u06FF])\1{3,}/g, "$1$1");

  // Repeated punctuation / emphasis chains
  s = s.replace(/([!.؟،])\1{2,}/g, "$1");

  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n[ \t]+/g, "\n");
  s = s.replace(/[ \t]+\n/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");

  return s.trim();
}
