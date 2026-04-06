/** Canonical storage for the ~3s Mistral Voxtral voice prompt (base64, no `data:` prefix). */
export const STREETVIBE_MISTRAL_VOICE_PROMPT_KEY = "STREETVIBE_MISTRAL_VOICE_PROMPT";

/** @deprecated Legacy key — kept in sync when saving for backward compatibility. */
export const STREETVIBE_VOICE_REFERENCE_AUDIO_B64_KEY = "STREETVIBE_VOICE_REFERENCE_AUDIO_B64";

/** When `"1"`, TTS uses `/api/tts-mistral` when a reference clip is stored. */
export const STREETVIBE_USE_CLONED_VOICE_KEY = "STREETVIBE_USE_CLONED_VOICE";

/** Thrown by `fetchTtsAudioUrl` when engine is `mistral` but no voice prompt is stored. */
export const TTS_ERR_MISTRAL_VOICE_PROMPT_REQUIRED = "MISTRAL_VOICE_PROMPT_REQUIRED";

export function getMistralVoicePromptBase64(): string | null {
  if (typeof window === "undefined") return null;
  const primary = localStorage.getItem(STREETVIBE_MISTRAL_VOICE_PROMPT_KEY);
  if (primary && primary.trim() !== "") return primary.trim();
  const legacy = localStorage.getItem(STREETVIBE_VOICE_REFERENCE_AUDIO_B64_KEY);
  return legacy && legacy.trim() !== "" ? legacy.trim() : null;
}

export function setMistralVoicePromptBase64(base64: string): void {
  const v = base64.trim();
  localStorage.setItem(STREETVIBE_MISTRAL_VOICE_PROMPT_KEY, v);
  localStorage.setItem(STREETVIBE_VOICE_REFERENCE_AUDIO_B64_KEY, v);
}

export function getStoredVoiceReferenceAudioBase64(): string | null {
  return getMistralVoicePromptBase64();
}

export function setStoredVoiceReferenceAudioBase64(base64: string): void {
  setMistralVoicePromptBase64(base64);
}

export function clearStoredVoiceReferenceAudio(): void {
  localStorage.removeItem(STREETVIBE_MISTRAL_VOICE_PROMPT_KEY);
  localStorage.removeItem(STREETVIBE_VOICE_REFERENCE_AUDIO_B64_KEY);
}

export function getUseClonedVoicePreference(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STREETVIBE_USE_CLONED_VOICE_KEY) === "1";
}

export function setUseClonedVoicePreference(useCloned: boolean): void {
  localStorage.setItem(STREETVIBE_USE_CLONED_VOICE_KEY, useCloned ? "1" : "0");
}
