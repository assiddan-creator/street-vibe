/** Base64 (no `data:` prefix) of the user's ~3s reference clip for Mistral Voxtral zero-shot TTS. */
export const STREETVIBE_VOICE_REFERENCE_AUDIO_B64_KEY = "STREETVIBE_VOICE_REFERENCE_AUDIO_B64";

/** When `"1"`, TTS uses `/api/tts-mistral` when a reference clip is stored. */
export const STREETVIBE_USE_CLONED_VOICE_KEY = "STREETVIBE_USE_CLONED_VOICE";

export function getStoredVoiceReferenceAudioBase64(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STREETVIBE_VOICE_REFERENCE_AUDIO_B64_KEY);
  return v && v.trim() !== "" ? v.trim() : null;
}

export function setStoredVoiceReferenceAudioBase64(base64: string): void {
  localStorage.setItem(STREETVIBE_VOICE_REFERENCE_AUDIO_B64_KEY, base64.trim());
}

export function clearStoredVoiceReferenceAudio(): void {
  localStorage.removeItem(STREETVIBE_VOICE_REFERENCE_AUDIO_B64_KEY);
}

export function getUseClonedVoicePreference(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STREETVIBE_USE_CLONED_VOICE_KEY) === "1";
}

export function setUseClonedVoicePreference(useCloned: boolean): void {
  localStorage.setItem(STREETVIBE_USE_CLONED_VOICE_KEY, useCloned ? "1" : "0");
}
