/** Persistent Mistral Voice Profile id from `/api/mistral-voice-profile`. */
export const STREETVIBE_MISTRAL_VOICE_ID_KEY = "STREETVIBE_MISTRAL_VOICE_ID";

/** When `"1"`, TTS can prefer the stored Mistral voice (when engine = mistral_clone). */
export const STREETVIBE_USE_CLONED_VOICE_KEY = "STREETVIBE_USE_CLONED_VOICE";

/** Zero-shot 5s reference for `mistral_quick` (base64, no data-URL prefix). */
export const STREETVIBE_MISTRAL_QUICK_PROMPT_KEY = "STREETVIBE_MISTRAL_QUICK_PROMPT";

/** Thrown by `fetchTtsAudioUrl` when engine is `mistral_clone` but no `STREETVIBE_MISTRAL_VOICE_ID` is stored. */
export const TTS_ERR_MISTRAL_VOICE_ID_REQUIRED = "MISTRAL_VOICE_ID_REQUIRED";

/** Thrown when engine is `mistral_quick` but no `STREETVIBE_MISTRAL_QUICK_PROMPT` is stored. */
export const TTS_ERR_MISTRAL_QUICK_PROMPT_REQUIRED = "MISTRAL_QUICK_PROMPT_REQUIRED";

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

export function getMistralQuickPromptBase64(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STREETVIBE_MISTRAL_QUICK_PROMPT_KEY);
  return v && v.trim() !== "" ? v.trim() : null;
}

export function setMistralQuickPromptBase64(b64: string): void {
  localStorage.setItem(STREETVIBE_MISTRAL_QUICK_PROMPT_KEY, b64.trim());
}

export function clearMistralQuickPrompt(): void {
  localStorage.removeItem(STREETVIBE_MISTRAL_QUICK_PROMPT_KEY);
}

export function getUseClonedVoicePreference(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STREETVIBE_USE_CLONED_VOICE_KEY) === "1";
}

export function setUseClonedVoicePreference(useCloned: boolean): void {
  localStorage.setItem(STREETVIBE_USE_CLONED_VOICE_KEY, useCloned ? "1" : "0");
}
