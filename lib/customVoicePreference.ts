/** Persistent Mistral Voice Profile id from `/api/mistral-voice-profile`. */
export const STREETVIBE_MISTRAL_VOICE_ID_KEY = "STREETVIBE_MISTRAL_VOICE_ID";

/** When `"1"`, TTS can prefer the stored Mistral voice (when engine = mistral). */
export const STREETVIBE_USE_CLONED_VOICE_KEY = "STREETVIBE_USE_CLONED_VOICE";

/** Thrown by `fetchTtsAudioUrl` when engine is `mistral` but no `STREETVIBE_MISTRAL_VOICE_ID` is stored. */
export const TTS_ERR_MISTRAL_VOICE_ID_REQUIRED = "MISTRAL_VOICE_ID_REQUIRED";

export function getMistralVoiceId(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STREETVIBE_MISTRAL_VOICE_ID_KEY);
  return v && v.trim() !== "" ? v.trim() : null;
}

export function setMistralVoiceId(voiceId: string): void {
  localStorage.setItem(STREETVIBE_MISTRAL_VOICE_ID_KEY, voiceId.trim());
}

export function clearMistralVoiceId(): void {
  localStorage.removeItem(STREETVIBE_MISTRAL_VOICE_ID_KEY);
}

export function getUseClonedVoicePreference(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STREETVIBE_USE_CLONED_VOICE_KEY) === "1";
}

export function setUseClonedVoicePreference(useCloned: boolean): void {
  localStorage.setItem(STREETVIBE_USE_CLONED_VOICE_KEY, useCloned ? "1" : "0");
}
