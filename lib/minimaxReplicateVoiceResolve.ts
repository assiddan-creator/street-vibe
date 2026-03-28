import { isAllowedMinimaxReplicateVoiceId } from "@/lib/minimaxReplicateVoices";
import { MINIMAX_VOICE_ID_BY_GENDER, type TtsVoiceGender } from "@/lib/ttsVoiceGender";

/**
 * Resolves Replicate `voice_id`. In **development**, `tuning.voice_id` may select a preset when allowed.
 * In production, gender-based defaults always win (stable product behavior).
 */
export function resolveMinimaxVoiceIdForTts(
  tuning: Record<string, unknown> | null,
  gender: TtsVoiceGender
): string {
  const raw = tuning?.voice_id;
  if (
    process.env.NODE_ENV === "development" &&
    typeof raw === "string" &&
    isAllowedMinimaxReplicateVoiceId(raw)
  ) {
    return raw;
  }
  return MINIMAX_VOICE_ID_BY_GENDER[gender];
}
