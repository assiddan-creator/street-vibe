/**
 * MiniMax `pronunciation_dict.tone` entries (`word/desired pronunciation` per MiniMax T2A docs).
 * Applied only to the Replicate request payload — **not** visible UI copy.
 *
 * Temporary compatibility layer for recurring slang TTS issues; expand only with listening evidence.
 */

/** v1 — evidence-based from internal slang bakeoffs (wassup, deadass, fr). */
export const MINIMAX_SLANG_PRONUNCIATION_TONE_V1: readonly string[] = [
  "wassup/what's up",
  "deadass/dead ass",
  "fr/for real",
];

export type MinimaxPronunciationDict = { tone: string[] };

/**
 * When `enabled`, returns a `pronunciation_dict` object for Replicate/MiniMax input.
 * When disabled, returns `undefined` so the field is omitted (model default).
 */
export function buildMinimaxPronunciationDictForReplicate(
  enabled: boolean
): MinimaxPronunciationDict | undefined {
  if (!enabled) return undefined;
  return { tone: [...MINIMAX_SLANG_PRONUNCIATION_TONE_V1] };
}
