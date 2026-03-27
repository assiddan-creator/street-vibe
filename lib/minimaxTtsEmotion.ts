/** Maps UI Vibe (`context`) to MiniMax `emotion` on Replicate (speech-2.8-turbo). */
export const MINIMAX_EMOTION_BY_VIBE: Record<string, string> = {
  angry: "angry",
  flirt: "happy",
  stoned: "calm",
  dm: "auto",
  default: "auto",
};

export function resolveMinimaxEmotionFromVibe(vibe: string | undefined): string {
  if (!vibe || typeof vibe !== "string") {
    return MINIMAX_EMOTION_BY_VIBE.default;
  }
  return MINIMAX_EMOTION_BY_VIBE[vibe] ?? MINIMAX_EMOTION_BY_VIBE.default;
}
