/** ElevenLabs IVC voice id returned from `/api/voice/clone`. */
export const STREETVIBE_CUSTOM_VOICE_ID_KEY = "STREETVIBE_CUSTOM_VOICE_ID";

/** When `"1"`, TTS requests include `customVoiceId` when a voice id is stored. */
export const STREETVIBE_USE_CLONED_VOICE_KEY = "STREETVIBE_USE_CLONED_VOICE";

export function getStoredCustomVoiceId(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STREETVIBE_CUSTOM_VOICE_ID_KEY);
  return v && v.trim() !== "" ? v.trim() : null;
}

export function setStoredCustomVoiceId(voiceId: string): void {
  localStorage.setItem(STREETVIBE_CUSTOM_VOICE_ID_KEY, voiceId.trim());
}

export function clearStoredCustomVoiceId(): void {
  localStorage.removeItem(STREETVIBE_CUSTOM_VOICE_ID_KEY);
}

export function getUseClonedVoicePreference(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STREETVIBE_USE_CLONED_VOICE_KEY) === "1";
}

export function setUseClonedVoicePreference(useCloned: boolean): void {
  localStorage.setItem(STREETVIBE_USE_CLONED_VOICE_KEY, useCloned ? "1" : "0");
}
