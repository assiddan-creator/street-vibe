import { VIBE_SPEECH_CONFIG } from "@/lib/vibeSpeechConfig";

/**
 * Maps UI Vibe (`context`) to MiniMax `emotion` on Replicate (speech-2.8-turbo).
 * Values are sourced from {@link VIBE_SPEECH_CONFIG} — keep in sync when adding vibes.
 */
export const MINIMAX_EMOTION_BY_VIBE: Record<string, string> = {
  angry: VIBE_SPEECH_CONFIG.angry.minimaxEmotion,
  flirt: VIBE_SPEECH_CONFIG.flirty.minimaxEmotion,
  stoned: VIBE_SPEECH_CONFIG.stoned.minimaxEmotion,
  dm: VIBE_SPEECH_CONFIG.friend.minimaxEmotion,
  default: VIBE_SPEECH_CONFIG.friend.minimaxEmotion,
};

export function resolveMinimaxEmotionFromVibe(vibe: string | undefined): string {
  if (!vibe || typeof vibe !== "string") {
    return MINIMAX_EMOTION_BY_VIBE.default;
  }
  return MINIMAX_EMOTION_BY_VIBE[vibe] ?? MINIMAX_EMOTION_BY_VIBE.default;
}

export {
  resolveMinimaxEmotionFromVibeConfig,
  resolveMinimaxTtsTuning,
  type MinimaxTtsTuning,
  type StreetVibeId,
} from "@/lib/vibeSpeechConfig";
