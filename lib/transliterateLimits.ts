/**
 * The read-aloud ("how to pronounce it") step calls the text model but is not
 * counted against the daily translate quota — one translation would otherwise
 * use two units. Its cost is bounded here instead: a short line, a low request
 * rate, and a small daily ceiling per client. Real use is one call per
 * translation, and a free visitor gets 10 translations a day.
 */
export const MAX_TRANSLITERATE_LINE_CHARS = 1_200;

export const TRANSLITERATE_GUARD = {
  limit: 20,
  maxBodyBytes: 8_000,
  dailyLimit: 200,
} as const;

/** True when the line is short enough to send to the model. */
export function lineWithinTransliterateLimit(line: string): boolean {
  return line.length > 0 && line.length <= MAX_TRANSLITERATE_LINE_CHARS;
}
