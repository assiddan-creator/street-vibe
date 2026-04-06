import type { TtsVoiceGender } from "@/lib/ttsVoiceGender";

/**
 * Voxtral preset `voice_id` slugs (same names as HF `voice_embedding/*.pt` in mistralai/Voxtral-4B-TTS-2603).
 * Used when `mistral_mode: "builtin"` — no user-cloned profile.
 */
export function resolveMistralBuiltinVoiceId(gender: TtsVoiceGender, emotionRaw: string): string {
  const k = normalizeEmotionKey(emotionRaw);

  if (gender === "female") {
    switch (k) {
      case "flirt":
        return "cheerful_female";
      case "angry":
      case "stoned":
        return "casual_female";
      case "dm":
      default:
        return "neutral_female";
    }
  }

  switch (k) {
    case "flirt":
    case "angry":
    case "stoned":
      return "casual_male";
    case "dm":
    default:
      return "neutral_male";
  }
}

function normalizeEmotionKey(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (t === "flirt" || t === "flirty") return "flirt";
  if (t === "angry") return "angry";
  if (t === "stoned") return "stoned";
  if (t === "dm" || t === "friend" || t === "default") return "dm";
  return "dm";
}
