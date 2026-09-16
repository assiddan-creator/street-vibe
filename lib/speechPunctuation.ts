/**
 * Speech-only punctuation for slang lines.
 *
 * The translate prompt deliberately writes like a real text message — few or no
 * commas ("Deadass can't believe you missed that"). That is right for the text
 * the user copies, but a voice engine reads it as one run-on phrase and loses
 * the natural beat after a discourse marker or before a vocative.
 *
 * This adds that punctuation to the string sent to TTS only. The displayed and
 * copied translation is never touched.
 *
 * Rules are intentionally conservative:
 *  - a marker only gets a comma at the START of a clause ("deadass, can't…"),
 *    never mid-sentence, so adverb uses like "I'm deadass tired" stay as-is;
 *  - a vocative/tag only gets a comma at the END of a clause ("…innit" →
 *    "…, innit"), and only when no punctuation is already there;
 *  - markers are listed per language so e.g. Portuguese "cara" (dude) is never
 *    applied to Spanish, where "cara" means "face".
 */

type MarkerSet = {
  /** Discourse markers / interjections that open a clause. */
  lead: string[];
  /** Vocatives and tags that close a clause. */
  tail: string[];
  /** Comma character for this script. */
  comma: string;
  /** Possessives that stay glued to a closing vocative ("my g", "mi bredda"). */
  possessive?: string[];
};

const ENGLISH: MarkerSet = {
  lead: [
    "deadass", "ngl", "nah", "yo", "yow", "bruv", "bro", "fam", "wagwan",
    "honestly", "fr", "for real", "no cap", "oi", "wah gwaan",
  ],
  tail: [
    "innit", "bruv", "bro", "fam", "fr", "for real", "no cap", "ya know",
    "you get me", "g", "blud", "mate", "bredren", "bredda", "yeah",
  ],
  comma: ",",
  possessive: ["my", "mi", "me"],
};

const SPANISH: MarkerSet = {
  lead: ["neta", "oye", "órale", "wey", "güey", "bro", "hostia", "joder"],
  tail: ["wey", "güey", "carnal", "tío", "tía", "bro", "tronco", "neta", "eh"],
  comma: ",",
  possessive: ["mi"],
};

const FRENCH: MarkerSet = {
  lead: ["wesh", "wallah", "sah", "franchement", "bref", "frère", "frérot"],
  tail: ["frère", "frérot", "gros", "mec", "wallah", "sah", "hein"],
  comma: ",",
  possessive: ["mon"],
};

const PORTUGUESE: MarkerSet = {
  lead: ["mano", "pô", "caraca", "véi", "cara", "pois é"],
  tail: ["mano", "véi", "cara", "parceiro", "irmão", "mermão"],
  comma: ",",
  possessive: ["meu"],
};

const HEBREW: MarkerSet = {
  lead: ["וואלה", "אחי", "יאללה", "בקיצור", "אחשלי", "נו"],
  tail: ["אחי", "אחשלי", "וואלה", "גבר", "מאמי", "נשמה"],
  comma: ",",
};

const ARABIC: MarkerSet = {
  lead: ["والله", "يعني", "بجد", "يا عم", "يا باشا", "طب", "خلاص"],
  tail: ["يا عم", "يا باشا", "يا معلم", "يا صاحبي", "والله", "بجد"],
  comma: "،",
};

const RUSSIAN: MarkerSet = {
  lead: ["короче", "блин", "бро", "чувак"],
  tail: ["бро", "чувак", "братан", "короче", "блин"],
  comma: ",",
};

const BY_LANGUAGE: Record<string, MarkerSet> = {
  en: ENGLISH,
  es: SPANISH,
  fr: FRENCH,
  pt: PORTUGUESE,
  he: HEBREW,
  ar: ARABIC,
  ru: RUSSIAN,
};

/** Street Vibe dialect value → language. Japanese is intentionally absent. */
const DIALECT_LANGUAGE: Record<string, string> = {
  "Jamaican Patois": "en",
  "London Roadman": "en",
  "New York Brooklyn": "en",
  "Paris Banlieue": "fr",
  "Russian Street": "ru",
  "Mexico City Barrio": "es",
  "Rio Favela": "pt",
  "Israeli Street": "he",
  "Arabic Egyptian": "ar",
  "Spanish Madrid": "es",
  "English (Standard)": "en",
  Spanish: "es",
  French: "fr",
  Portuguese: "pt",
  Russian: "ru",
  Arabic: "ar",
  "Hebrew (Standard)": "he",
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Longest first, so "for real" wins over "fr". */
function alternation(words: string[]): string {
  return [...new Set(words)]
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join("|");
}

/** Letter-ish character in any script (letters + combining marks + digits). */
const WORD = "[\\p{L}\\p{M}\\p{N}]";
/** Punctuation that already provides a pause. */
const PAUSE = "[,،;:.!?…\\-–—]";

export function resolveSpeechLanguage(dialect: string | undefined): string | undefined {
  return dialect ? DIALECT_LANGUAGE[dialect] : undefined;
}

/**
 * Return `text` with speech-friendly commas added for `dialect`. Unknown
 * dialects (and Japanese) are returned unchanged apart from line-break handling
 * being skipped entirely.
 */
export function addSpeechPunctuation(text: string, dialect: string | undefined): string {
  const lang = resolveSpeechLanguage(dialect);
  const set = lang ? BY_LANGUAGE[lang] : undefined;
  if (!set || !text.trim()) return text;

  const { comma } = set;
  let out = text;

  // 1. A line break with no punctuation before it is a spoken pause.
  out = out.replace(
    new RegExp(`(${WORD})[ \\t]*\\n+[ \\t]*(?=\\S)`, "gu"),
    `$1${comma} `
  );

  // 2. Clause-opening marker: start of text or after a sentence/clause break,
  //    followed by a space and a word, with no punctuation in between.
  const lead = alternation(set.lead);
  const leadRe = new RegExp(
    `(^|[.!?…,،]\\s+|^\\s+)(${lead})(?!${WORD})(?!\\s*${PAUSE})(?=\\s+${WORD})`,
    "giu"
  );
  // Run twice so chained markers ("yo bro what's good") each get their beat.
  out = out.replace(leadRe, `$1$2${comma}`);
  out = out.replace(leadRe, `$1$2${comma}`);

  // 3. Clause-closing vocative/tag: preceded by a word and a space, followed
  //    only by optional end punctuation and then end of text or a line break.
  const tail = alternation(set.tail);
  const possAlt = set.possessive?.length ? alternation(set.possessive) : "";
  const poss = possAlt ? `(?:(?:${possAlt})\\s+)?` : "";
  // Never break between a possessive and its vocative: "mi bredda" must not
  // become "mi, bredda". The comma goes before the possessive instead.
  const notAfterPossessive = possAlt ? `(?<!(?<!${WORD})(?:${possAlt}))` : "";
  const tailRe = new RegExp(
    `(${WORD})${notAfterPossessive}\\s+(${poss}(?:${tail}))(?!${WORD})(?=[.!?…]*\\s*$)`,
    "giu"
  );
  out = out.replace(tailRe, `$1${comma} $2`);

  return out;
}
