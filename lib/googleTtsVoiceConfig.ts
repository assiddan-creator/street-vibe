import type { TtsVoiceGender } from "@/lib/ttsVoiceGender";

/**
 * Google Chirp 3: HD voices use `{locale}-Chirp3-HD-{Persona}` (see Cloud TTS voice list).
 * There are no `Chirp3-HD-D` / `Chirp3-HD-F` IDs; Charon (MALE) and Despina (FEMALE) are standard catalog pairs per locale.
 */
export const CHIRP3_HD_GENDER_PERSONA: Record<TtsVoiceGender, "Charon" | "Despina"> = {
  male: "Charon",
  female: "Despina",
};

/** Documented en-US premium pair (same personas the API uses for gendered Chirp 3 HD). */
export const CHIRP3_HD_EN_US_MALE_VOICE = "en-US-Chirp3-HD-Charon";
export const CHIRP3_HD_EN_US_FEMALE_VOICE = "en-US-Chirp3-HD-Despina";

export function resolveGoogleChirp3HdVoiceName(languageCode: string, gender: TtsVoiceGender): string {
  const persona = CHIRP3_HD_GENDER_PERSONA[gender];
  return `${languageCode}-Chirp3-HD-${persona}`;
}

/** Per-dialect audio tuning; `languageCode` selects the Chirp 3 HD locale. */
export type GoogleDialectVoiceConfig = {
  languageCode: string;
  pitch: number;
  speakingRate: number;
};

export const GOOGLE_VOICE_MAP: Record<string, GoogleDialectVoiceConfig> = {
  "London Roadman": {
    languageCode: "en-GB",
    pitch: -1.5,
    speakingRate: 0.95,
  },
  "Jamaican Patois": {
    languageCode: "en-GB",
    pitch: -1.5,
    speakingRate: 0.9,
  },
  "New York Brooklyn": {
    languageCode: "en-US",
    pitch: 0,
    speakingRate: 0.95,
  },
  "Tokyo Gyaru": {
    languageCode: "ja-JP",
    pitch: 0.5,
    speakingRate: 1.0,
  },
  "Paris Banlieue": {
    languageCode: "fr-FR",
    pitch: -1.5,
    speakingRate: 0.95,
  },
  "Russian Street": {
    languageCode: "ru-RU",
    pitch: -1.5,
    speakingRate: 0.9,
  },
  "Mexico City Barrio": {
    languageCode: "es-US",
    pitch: -1.5,
    speakingRate: 0.95,
  },
  "Rio Favela": {
    languageCode: "pt-BR",
    pitch: -1.5,
    speakingRate: 0.95,
  },
  "Israeli Street": {
    languageCode: "he-IL",
    pitch: 0,
    speakingRate: 0.95,
  },
};

export const GOOGLE_VOICE_DEFAULT: GoogleDialectVoiceConfig = {
  languageCode: "en-US",
  pitch: 0,
  speakingRate: 0.9,
};

export function resolveGoogleVoiceForDialect(dialect: string): GoogleDialectVoiceConfig {
  return GOOGLE_VOICE_MAP[dialect] ?? GOOGLE_VOICE_DEFAULT;
}
