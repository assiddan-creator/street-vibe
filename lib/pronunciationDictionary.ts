/**
 * Pronunciation fixes for TTS only (the displayed text never changes).
 *
 * Two mechanisms, both EMPTY until a real mispronunciation is heard:
 *
 * 1. PRONUNCIATION_ALIASES — per dialect, word -> spoken spelling, applied in
 *    our own speech-text layer (prepareSpeechText). Works with every model.
 *    Example entry (not added): "London Roadman": { "mandem": "man-dem" }.
 *
 * 2. PRONUNCIATION_DICTIONARY_LOCATORS — per dialect, ElevenLabs pronunciation
 *    dictionaries created in the ElevenLabs dashboard, sent as
 *    `pronunciation_dictionary_locators` (max 3). Only sent when non-empty, so
 *    with no entries the request is exactly as before.
 */

export type PronunciationDictionaryLocator = {
  pronunciation_dictionary_id: string;
  version_id?: string;
};

/** dialect -> { word: spoken spelling }. Matching is whole-word and case-insensitive. */
export const PRONUNCIATION_ALIASES: Readonly<Record<string, Readonly<Record<string, string>>>> = {};

/** dialect -> ElevenLabs dictionary locators (ElevenLabs allows at most 3 per request). */
export const PRONUNCIATION_DICTIONARY_LOCATORS: Readonly<Record<string, readonly PronunciationDictionaryLocator[]>> = {};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Replace whole words with their spoken spelling (keeps an initial capital). */
export function applyPronunciationAliases(
  text: string,
  dialect: string | undefined,
  aliases: Readonly<Record<string, Readonly<Record<string, string>>>> = PRONUNCIATION_ALIASES
): string {
  const map = dialect ? aliases[dialect] : undefined;
  if (!map) return text;
  const words = Object.keys(map).sort((a, b) => b.length - a.length);
  if (!words.length) return text;
  const lookup = new Map(words.map((w) => [w.toLowerCase(), map[w]]));
  const re = new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])(${words.map(escapeRe).join("|")})(?![\\p{L}\\p{M}\\p{N}])`, "giu");
  return text.replace(re, (found) => {
    const spoken = lookup.get(found.toLowerCase()) ?? found;
    return found[0] !== found[0].toLowerCase() ? spoken[0].toUpperCase() + spoken.slice(1) : spoken;
  });
}

export function pronunciationLocatorsFor(
  dialect: string | undefined,
  locators: Readonly<Record<string, readonly PronunciationDictionaryLocator[]>> = PRONUNCIATION_DICTIONARY_LOCATORS
): PronunciationDictionaryLocator[] {
  return dialect ? (locators[dialect] ?? []).slice(0, 3) : [];
}
