const STORAGE_KEY = "streetvibe_tts_voice_gender";

export type TtsVoiceGender = "male" | "female";

/**
 * MiniMax `voice_id` on Replicate — must match `app/api/tts/route.ts`.
 * TODO: Future work may source dialect-specific MiniMax voice ids from `lib/dialectRegistry.ts`
 * (`minimax.defaultMaleVoiceId` / `defaultFemaleVoiceId`) when the API supports per-dialect voices.
 */
export const MINIMAX_VOICE_ID_BY_GENDER: Record<TtsVoiceGender, string> = {
  male: "Casual_Guy",
  female: "Lively_Girl",
};

export function getStoredTtsGender(): TtsVoiceGender {
  if (typeof window === "undefined") return "male";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "female" ? "female" : "male";
}

export function setStoredTtsGender(gender: TtsVoiceGender): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, gender);
}
