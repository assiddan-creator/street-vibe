/**
 * Speech-text layer: cleans a translation before it is sent to TTS.
 * The text shown to / copied by the user is never touched.
 *
 * Runs FIRST in the ElevenLabs path, before `addSpeechPunctuation` and the
 * per-language normalizers, and is written so their behavior is unchanged:
 *  - line breaks are kept (addSpeechPunctuation turns them into pauses);
 *  - commas, periods, ellipses and em dashes are kept as written, none added;
 *  - no Unicode normalization: Hebrew niqqud, Arabic marks, kana, ё stay as-is.
 *
 * What it removes:
 *  - SSML / HTML-like tags (<break/>, <phoneme>…</phoneme> keeps its inner word)
 *    — v3/v4 models must never receive SSML;
 *  - bracketed audio tags ([laughs], [whispers]) — none by default;
 *  - markdown emphasis/markers (*, **, _x_, `, ~~, #, >, list bullets);
 *  - emoji and decorative symbols (★ ♥ • → ~ …);
 *  - typed chat fillers that should not be read out (lol, lmao, xd, www…);
 * and collapses repeated ! / ? runs ("!!!" → "!", "?!?!" → "?!").
 */

import { resolveSpeechLanguage } from "@/lib/speechPunctuation";

/** Language for filler rules. speechPunctuation deliberately omits ja / Kingston. */
function fillerLanguage(dialect: string | undefined): string | undefined {
  if (!dialect) return undefined;
  if (dialect === "Tokyo Gyaru" || dialect === "Japanese") return "ja";
  if (dialect === "Jamaican Patois") return "en";
  return resolveSpeechLanguage(dialect);
}

/** Letter-ish character in any script. */
const L = "[\\p{L}\\p{M}\\p{N}]";

/** Typed laughter / reaction tokens per language, dropped as whole tokens only. */
const SHARED_FILLERS = ["lol", "lmao", "lmfao", "rofl", "xd"];
const FILLERS_BY_LANGUAGE: Record<string, RegExp[]> = {
  ja: [/[wｗ]{2,}/u, /[(（]笑[)）]/u],
  pt: [/k{3,}/u],
  he: [/ח{3,}/u],
  ar: [/ه{3,}/u],
};

function dropFillers(s: string, lang: string | undefined): string {
  const shared = new RegExp(`(?<!${L})(?:${SHARED_FILLERS.join("|")})(?!${L})`, "giu");
  s = s.replace(shared, "");
  for (const re of (lang && FILLERS_BY_LANGUAGE[lang]) || []) {
    // Standalone token, or glued to the end of a Japanese clause ("知ってるwww").
    const glued = lang === "ja" ? "" : `(?<!${L})`;
    s = s.replace(new RegExp(`${glued}(?:${re.source})(?!${L})`, "gu"), "");
  }
  return s;
}

const EMOJI_AND_PARTS =
  /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}⃣︎️‍]/gu;
/** Decorative symbols that TTS would either skip or read by name. 〜 (Japanese elongation) is kept. */
const DECORATIVE = /[•·◦▪▫■□●○◆◇◊★☆♡♥♤♠♧♣♢♦♪♫♬✓✔✗✘✦✧✩✪✫✬✭✮✯✰→←↑↓↔⇒⇐⇔➔➜➡~^|¦]/gu;

export function prepareSpeechText(text: string, dialect?: string): string {
  let s = text.replace(/\r\n?/g, "\n");

  // Invisible formatting characters (ZWNJ ‌ is left alone: it can be meaningful).
  s = s.replace(/[​⁠﻿]/g, "");

  // SSML / HTML-like tags: drop the tag, keep any inner text.
  s = s.replace(/<\/?[a-zA-Z][\w:-]*(?:\s[^<>]*)?\/?>/g, "");
  // Bracketed audio tags such as [laughs] or [whispers softly].
  s = s.replace(/\[[\p{L}\s'-]{1,30}\]/gu, "");

  // Markdown.
  s = s.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, ""); // headings
  s = s.replace(/^[ \t]*>[ \t]?/gm, ""); // block quotes
  s = s.replace(/^[ \t]*[-*+][ \t]+/gm, ""); // list bullets
  s = s.replace(/`+/g, "");
  s = s.replace(/~~/g, "");
  s = s.replace(/\*+/g, "");
  s = s.replace(/(?<!\p{L})_+(?=\S)|(?<=\S)_+(?!\p{L})/gu, ""); // _emphasis_, not snake_case

  // Emoji (with skin tones, flags, keycaps, joiners) and decorative symbols.
  s = s.replace(EMOJI_AND_PARTS, "");
  s = s.replace(DECORATIVE, "");

  s = dropFillers(s, fillerLanguage(dialect));

  // Repeated ! / ? runs (ASCII, full-width, Arabic, Spanish inverted marks).
  s = s.replace(/[!?！？]{2,}/g, (run) => {
    const q = /[?？]/.test(run);
    const e = /[!！]/.test(run);
    const full = /[！？]/.test(run);
    if (q && e) return full ? "？！" : "?!";
    return run[0];
  });
  s = s.replace(/؟{2,}/g, "؟");
  s = s.replace(/¡{2,}/g, "¡");
  s = s.replace(/¿{2,}/g, "¿");

  // Whitespace: collapse within lines, keep line breaks (they become pauses later).
  s = s
    .split("\n")
    .map((line) =>
      line
        .replace(/[ \t ]+/g, " ")
        // punctuation orphaned by a removed token: ", that's mad" / "wey! , te" / "mad ,"
        .replace(/^\s*[,،;:]\s*/u, "")
        .replace(/\s+([,،])/gu, "$1")
        .replace(/([!?.…！？؟])[,،]/gu, "$1")
        .trim()
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Nothing speakable left (e.g. the message was only emoji): return "" so the
  // caller can skip TTS instead of reading emoji names aloud.
  return new RegExp(L, "u").test(s) ? s : "";
}
