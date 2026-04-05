/**
 * Dictation-style cleanup: strip fillers, hesitation sounds, and simple stutters
 * from STT before slang translation. The UI should keep showing the raw transcript;
 * this output is for the model only.
 */

const LATIN_FILLERS =
  /\b(?:um+|uh+|uhh+|uh-?h+|umm+|uhm+|ummm+|erm+|er+|hm+|hmm+|hmmm+|mhm|mhmm|mmm+)\b/gi;

const LATIN_PHRASE_FILLERS = /\b(?:y'know|you know|i mean)\b/gi;

/** Hebrew hesitation / filler tokens (space-bounded). */
const HEBREW_HESITATION = /(?:^|\s)(אהה+|אממ+|אמממ+|אמ+|אהם+|המ+|ממ+|אה{2,})(?=\s|$)/g;

/** Arabic-script hesitation (conservative). */
const ARABIC_HESITATION = /(?:^|[\s,.;:!?])(?:أم+م+|مم+م+)(?=[\s,.;:!?]|$)/g;

function collapseLatinStutter(s: string): string {
  let out = s;
  for (let i = 0; i < 4; i++) {
    const next = out.replace(/\b([a-zA-Z']{2,})\s+\1\b/gi, "$1");
    if (next === out) break;
    out = next;
  }
  return out;
}

function collapseHebrewStutter(s: string): string {
  let out = s;
  for (let i = 0; i < 3; i++) {
    const next = out.replace(/([\u0590-\u05FF]{2,})\s+\1/g, "$1");
    if (next === out) break;
    out = next;
  }
  return out;
}

export function cleanSpeechForTranslation(raw: string): string {
  let s = raw.replace(/[\u200e\u200f\u202a-\u202e]/g, "").trim();
  if (!s) return "";

  s = s.replace(LATIN_FILLERS, " ");
  s = s.replace(LATIN_PHRASE_FILLERS, " ");
  s = s.replace(HEBREW_HESITATION, " ");
  s = s.replace(ARABIC_HESITATION, " ");

  s = collapseLatinStutter(s);
  s = collapseHebrewStutter(s);

  s = s.replace(/\s+/g, " ").trim();
  return s;
}
