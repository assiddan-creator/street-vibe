import type { TtsVoiceGender } from "@/lib/ttsVoiceGender";

/**
 * Built-in character preset *slugs* for open-weights Voxtral (HF `voice_embedding/*.pt` names like `neutral_male`).
 * The Mistral **cloud** API expects UUID `voice_id` values from `GET /v1/audio/voices` (see `scripts/generate-voice-tests.mjs`).
 */
export const MISTRAL_OPEN_WEIGHTS_EMBEDDING_SLUGS = [
  "ar_male",
  "casual_female",
  "casual_male",
  "cheerful_female",
  "de_female",
  "de_male",
  "es_female",
  "es_male",
  "fr_female",
  "fr_male",
  "hi_female",
  "hi_male",
  "it_female",
  "it_male",
  "neutral_female",
  "neutral_male",
  "nl_female",
  "nl_male",
  "pt_female",
  "pt_male",
] as const;

/**
 * Maps UI gender + vibe to an open-weights-style slug (cloud may use different IDs — use voices.list in prod).
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
