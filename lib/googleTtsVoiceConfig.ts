/** Google Cloud TTS voice names per output dialect — same resolution as `app/api/tts/route.ts`. */
export const GOOGLE_VOICE_MAP: Record<
  string,
  { languageCode: string; name: string; pitch: number; speakingRate: number }
> = {
  "London Roadman": {
    languageCode: "en-GB",
    name: "en-GB-Neural2-D",
    pitch: -1.5,
    speakingRate: 0.95,
  },
  "Jamaican Patois": {
    languageCode: "en-GB",
    name: "en-GB-Neural2-B",
    pitch: -1.5,
    speakingRate: 0.9,
  },
  "New York Brooklyn": {
    languageCode: "en-US",
    name: "en-US-Journey-D",
    pitch: 0,
    speakingRate: 0.95,
  },
  "Tokyo Gyaru": {
    languageCode: "ja-JP",
    name: "ja-JP-Neural2-B",
    pitch: 0.5,
    speakingRate: 1.0,
  },
  "Paris Banlieue": {
    languageCode: "fr-FR",
    name: "fr-FR-Neural2-D",
    pitch: -1.5,
    speakingRate: 0.95,
  },
  "Russian Street": {
    languageCode: "ru-RU",
    name: "ru-RU-Standard-D",
    pitch: -1.5,
    speakingRate: 0.9,
  },
  "Mexico City Barrio": {
    languageCode: "es-US",
    name: "es-US-Neural2-B",
    pitch: -1.5,
    speakingRate: 0.95,
  },
  "Rio Favela": {
    languageCode: "pt-BR",
    name: "pt-BR-Neural2-B",
    pitch: -1.5,
    speakingRate: 0.95,
  },
  "Israeli Street": {
    languageCode: "he-IL",
    name: "he-IL-Neural2-B",
    pitch: 0,
    speakingRate: 0.95,
  },
};

export const GOOGLE_VOICE_DEFAULT = {
  languageCode: "en-US",
  name: "en-US-Journey-F",
  pitch: 0,
  speakingRate: 0.9,
};

export function resolveGoogleVoiceForDialect(dialect: string) {
  return GOOGLE_VOICE_MAP[dialect] ?? GOOGLE_VOICE_DEFAULT;
}
