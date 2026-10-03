/**
 * Speech version of a translated line ("speechText"): identical to the displayed
 * line except for pronunciation hints the voice needs but the reader doesn't —
 *  - Hebrew (Tel Aviv): niqqud ONLY on gender-dependent / ambiguous words
 *    (אותך, לך, שלך, עליך, איתך, ממך, 2nd-person past verbs);
 *  - Egyptian Arabic (Cairo): tashkeel ONLY on gender-dependent ـك forms;
 *  - Japanese (Tokyo): ambiguous kanji readings written in kana;
 *  - Russian (Moscow): ё where it changes the word.
 *
 * The model returns it after the dictionary, behind SPEECH_SEPARATOR. The
 * displayed / copied / shared line never changes; TTS uses speechText only when
 * `isValidSpeechText` proves it is the same line (so the voice can never say
 * something different from what the user sees).
 */

export const SPEECH_SEPARATOR = "@@@";

type SpeechLang = "he" | "ar" | "ja" | "ru";

const SPEECH_LANG_BY_DIALECT: Record<string, SpeechLang> = {
  "Israeli Street": "he",
  "Arabic Egyptian": "ar",
  "Tokyo Gyaru": "ja",
  "Russian Street": "ru",
};

export function speechTextLanguage(dialect: string | undefined): SpeechLang | undefined {
  return dialect ? SPEECH_LANG_BY_DIALECT[dialect] : undefined;
}

const COMMON = `
SPEECH LINE (for the voice only — never shown to the user):
After the dictionary block, output one more line containing exactly ${SPEECH_SEPARATOR}, then the SPEECH LINE.
The SPEECH LINE is the exact same text as the message before |||, character for character — same letters, same words, same punctuation, same order — with ONLY the pronunciation hints described below. Never change, add, remove or reorder any letter or word. If no hint applies, repeat the message unchanged.`;

const GENDER_STEP = `
GENDER FIRST: on the line right after ${SPEECH_SEPARATOR}, write exactly one of: "ADDRESSEE: male", "ADDRESSEE: female", "ADDRESSEE: unknown" — then the SPEECH LINE on the next line.
Decide ONLY from the source text: a name of the person addressed or a gendered word about them (e.g. Dani, David, Ahmed, Omar → male; Sarah, Maya, Fatma, Nour → female). Ignore the chat context / audience setting. If there is no name and no gendered word, it is unknown.
The marks must match that gender exactly; for unknown, add no marks at all.`;

const BY_LANG: Record<SpeechLang, string> = {
  he: `${COMMON}${GENDER_STEP}
HEBREW HINTS: add niqqud ONLY to words whose pronunciation depends on the addressee's gender or is otherwise ambiguous — second-person suffixes and pronouns (e.g. אותך, לך, שלך, עליך, איתך, ממך, אליך, בשבילך) and second-person past verbs (e.g. ראית, אמרת). Every other word stays without niqqud.
- ADDRESSEE: male → אוֹתְךָ, לְךָ, שֶׁלְּךָ, עָלֶיךָ, אִיתְּךָ, מִמְּךָ, אֵלֶיךָ, בִּשְׁבִילְךָ, רָאִיתָ, אָמַרְתָּ.
- ADDRESSEE: female → אוֹתָךְ, לָךְ, שֶׁלָּךְ, עָלַיִךְ, אִיתָּךְ, מִמֵּךְ, אֵלַיִךְ, בִּשְׁבִילֵךְ, רָאִית, אָמַרְתְּ.
- Keep the message's own spelling (plene/defective) exactly; only add marks.
- If ADDRESSEE is unknown, add NO niqqud at all.`,
  ar: `${COMMON}${GENDER_STEP}
EGYPTIAN ARABIC HINTS: add tashkeel ONLY on the vowel of gender-dependent second-person forms (ـك endings such as شفتك، بحبك، عليك):
- ADDRESSEE: male → fatḥa before ك: شُفْتَك، بَحِبَّك، عَلَيْك، روحَك.
- ADDRESSEE: female → kasra before ك: شُفْتِك، بَحِبِّك، عليكِ، روحِك (marks only — never add a letter such as ي).
- Mark EVERY such ـك form in the line, not just the first.
Every other word stays without tashkeel.
- If ADDRESSEE is unknown, add NO tashkeel at all.`,
  ja: `${COMMON}
JAPANESE HINTS: where a kanji word's reading is ambiguous in this sentence, write that word in hiragana instead (e.g. 今日→きょう, 明日→あした, 何→なに or なん, 方→かた or ほう, 上手→じょうず, 一日→いちにち or ついたち). Keep every other kanji, all kana and all punctuation exactly as in the message.`,
  ru: `${COMMON}
RUSSIAN HINTS: write ё instead of е only where it changes the word or its stress (e.g. все→всё when it means "everything", еще→ещё, идешь→идёшь, ее→её). Change nothing else.`,
};

/** Prompt block to append to the output format; empty for dialects without speech hints. */
export function speechTextPromptBlock(dialect: string | undefined): string {
  const lang = speechTextLanguage(dialect);
  return lang ? `\n${BY_LANG[lang]}` : "";
}

export type Addressee = "male" | "female" | "unknown";

/**
 * Split the model output into the normal body (message ||| dictionary), the declared
 * addressee gender (Hebrew / Arabic) and the speech line.
 */
export function splitSpeechText(full: string): { body: string; speech: string | null; addressee: Addressee | null } {
  const idx = full.lastIndexOf(SPEECH_SEPARATOR);
  if (idx === -1) return { body: full, speech: null, addressee: null };
  let rest = full.slice(idx + SPEECH_SEPARATOR.length).trim();
  let addressee: Addressee | null = null;
  const m = rest.match(/^ADDRESSEE:\s*(male|female|unknown)\b[^\n]*\n?/i);
  if (m) {
    addressee = m[1].toLowerCase() as Addressee;
    rest = rest.slice(m[0].length).trim();
  }
  return { body: full.slice(0, idx).trimEnd(), speech: rest || null, addressee };
}

const HEBREW_MARKS = /[֑-ׇ]/g; // cantillation + niqqud (letters are U+05D0–U+05EA)
const ARABIC_MARKS = /[ً-ٰٟـ]/g; // harakat, shadda, sukun, dagger alif, tatweel
const ws = (s: string) => s.replace(/\s+/g, " ").trim();
const KANA_OR_PUNCT = /[぀-ヿ　-〿＀-￯]/u;
const KANJI = /\p{Script=Han}/u;

/** Hebrew 2nd-person endings: feminine ־ָךְ / ־ֵךְ / ־ַיִךְ, final ־תְּ; masculine ־ךָ, final ־תָּ. */
const HE_FEMININE = /ךְ|תְּ(?![א-ת])/u;
const HE_MASCULINE = /ךָ|תָּ(?![א-ת])/u;
/** Egyptian Arabic ـك: masculine = fatḥa before ك, feminine = kasra before ك (or on ك). */
const AR_FEMININE = /ِك|كِ/u;
const AR_MASCULINE = /َك/u;

/** Hebrew / Arabic: the marks must match the declared addressee; unknown = no marks at all. */
function marksMatchAddressee(lang: "he" | "ar", speech: string, display: string, addressee: Addressee | null | undefined): boolean {
  if (!addressee) return false; // gender must be declared explicitly
  const marks = lang === "he" ? HEBREW_MARKS : ARABIC_MARKS;
  const added = speech.replace(marks, "") !== speech && speech !== display;
  if (addressee === "unknown") return !added;
  const fem = lang === "he" ? HE_FEMININE : AR_FEMININE;
  const masc = lang === "he" ? HE_MASCULINE : AR_MASCULINE;
  return addressee === "female" ? !masc.test(speech) : !fem.test(speech);
}

/**
 * Same line as the display, differing only by the allowed hints (no gender check):
 *  he / ar — identical after removing niqqud / tashkeel;
 *  ru      — identical after ё → е;
 *  ja      — every kana / punctuation char of the display appears in order, and no
 *            kanji that the display doesn't have (readings may replace kanji only).
 */
export function isSameSpokenLine(display: string, speech: string | null | undefined, dialect: string | undefined): boolean {
  const lang = speechTextLanguage(dialect);
  if (!lang || !speech || !speech.trim()) return false;
  const d = ws(display);
  const s = ws(speech);
  if (lang === "he") return ws(s.replace(HEBREW_MARKS, "")) === ws(d.replace(HEBREW_MARKS, ""));
  if (lang === "ar") return ws(s.replace(ARABIC_MARKS, "")) === ws(d.replace(ARABIC_MARKS, ""));
  if (lang === "ru") return s.replace(/ё/g, "е").replace(/Ё/g, "Е") === d.replace(/ё/g, "е").replace(/Ё/g, "Е");
  // ja
  if (/[A-Za-z]/.test(s) && !/[A-Za-z]/.test(d)) return false;
  if (s.length > d.length * 3 + 10) return false;
  const displayKanji = new Set([...d].filter((c) => KANJI.test(c)));
  if ([...s].some((c) => KANJI.test(c) && !displayKanji.has(c))) return false;
  let i = 0;
  for (const c of d) {
    if (!KANA_OR_PUNCT.test(c)) continue;
    i = s.indexOf(c, i);
    if (i === -1) return false;
    i += 1;
  }
  return true;
}

/**
 * Accept a speech line from the model: same line AND, for Hebrew / Arabic, marks that
 * match the declared addressee (male / female; unknown = no marks).
 */
export function isValidSpeechText(
  display: string,
  speech: string | null | undefined,
  dialect: string | undefined,
  addressee?: Addressee | null
): boolean {
  if (!isSameSpokenLine(display, speech, dialect)) return false;
  const lang = speechTextLanguage(dialect);
  if (lang === "he" || lang === "ar") return marksMatchAddressee(lang, ws(speech!), ws(display), addressee);
  return true;
}

/**
 * TTS side: the speech line arrives from the client, so only re-check that it is the
 * same line as the display (the gender check already ran in /api/translate).
 */
export function speechTextOrDisplay(display: string, speech: string | null | undefined, dialect: string | undefined): string {
  return isSameSpokenLine(display, speech, dialect) ? speech!.trim() : display;
}
