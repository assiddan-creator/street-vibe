/**
 * Spoken-delivery directions per recipient ("Who's it for?"), sent to
 * ElevenLabs v4 as a leading [bracket] direction. v4 reads these as acting
 * notes and does not speak them; the wording is deliberately gentle — a
 * strong "[playful and flirty ...]" note was judged over the top in the
 * 2026-10-21 listening test, these softer ones were approved.
 *
 * Only v4 models get a direction: v2/v3 cities are left exactly as before.
 */

import { isV4Model } from "@/lib/elevenLabsVoicePresets";

export const AUDIENCE_DIRECTIONS: Readonly<Record<string, string>> = {
  dm: "[casual and relaxed, like chatting with a close friend]",
  flirt: "[warm and a little playful, lightly flirty]",
  group: "[upbeat and friendly, talking to a group of friends]",
  new: "[friendly and polite, easygoing]",
};

/** The direction for this recipient, or undefined for unknown/legacy contexts. */
export function directionFor(context: string | undefined): string | undefined {
  return context ? AUDIENCE_DIRECTIONS[context] : undefined;
}

/** Text to send to ElevenLabs: the line, prefixed with a direction on v4 models. */
export function withDirection(text: string, context: string | undefined, modelId: string): string {
  const line = text.trim();
  const direction = isV4Model(modelId) ? directionFor(context) : undefined;
  return direction ? `${direction} ${line}` : line;
}
