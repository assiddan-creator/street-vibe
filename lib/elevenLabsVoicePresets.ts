/**
 * Approved ElevenLabs voice presets — hand-picked and lab-tested voices that
 * override the global Will/Jessica defaults for a specific dialect + gender.
 *
 * This is deliberately separate from `lib/elevenLabsVoices.ts` (PR #20's
 * unmerged, unaudited regional catalogue): a preset here has been listened to
 * and approved for production. Nothing in this file is wired to PR #20 and it
 * does not depend on it.
 *
 * A preset is FINAL for voice settings when `applyVibe: false` — the vibe
 * system still reshapes the translated *text* as it always has, but it must
 * not touch this preset's `stability` / `similarity_boost` / `style` / `speed`
 * / `use_speaker_boost`. See `resolveVoiceSettingsForVibe` in
 * `lib/elevenLabsTts.ts`, which checks this flag before applying vibe deltas.
 */

export type VoiceGender = "male" | "female";

/**
 * TTS model per city. Default for every city: eleven_v4_turbo, picked from the
 * 2026-10 blind A/B (v3_conversational vs v4_turbo vs v4) plus a Speech-to-Text
 * check (v4/v4_turbo kept every slang word; v3_conversational softened Rio
 * "coé" and Cairo "بقولك"). Brooklyn stays on v3_conversational — preferred by ear.
 * Kingston was moved to v4_turbo and then reverted to v3_conversational (owner's
 * call after listening in production).
 *
 * Applies to both genders (presets and the Will/Jessica fallback). Only the
 * model changes here; voices and voice settings are untouched.
 * `ELEVENLABS_MODEL_OVERRIDE` (see lib/elevenLabsTts.ts) beats all of this.
 */
export const ELEVENLABS_DEFAULT_CITY_MODEL_ID = "eleven_v4_turbo";
export const ELEVENLABS_CITY_MODEL_EXCEPTIONS: Readonly<Record<string, string>> = {
  "New York Brooklyn": "eleven_v3_conversational",
  "Jamaican Patois": "eleven_v3_conversational",
};

export function modelForDialect(dialect: string | undefined): string {
  return (dialect && ELEVENLABS_CITY_MODEL_EXCEPTIONS[dialect]) || ELEVENLABS_DEFAULT_CITY_MODEL_ID;
}

/**
 * Voice settings. eleven_v4 / eleven_v4_turbo officially support only
 * `stability` and `similarity_boost`; the other fields are v2/v3-only and are
 * stripped before sending to a v4 model (see `voiceSettingsForModel` in
 * lib/elevenLabsTts.ts).
 */
export type ElevenLabsVoiceSettings = {
  stability: number;
  similarity_boost: number;
  style?: number;
  /** Documented ElevenLabs field, default 1. Only meaningful on v2/v3 models. */
  speed?: number;
  use_speaker_boost?: boolean;
};

/** Starting settings for collection voices on a v4 model (owner research, 2026-10). */
export const V4_START_SETTINGS: ElevenLabsVoiceSettings = { stability: 0.5, similarity_boost: 0.75 };

/** v3 `dm` baseline: what vibe-driven voices sound like with the default audience. */
const V3_DM_BASELINE: ElevenLabsVoiceSettings = {
  stability: 0.42,
  similarity_boost: 0.8,
  style: 0.28,
  speed: 1,
  use_speaker_boost: true,
};

export function isV4Model(modelId: string): boolean {
  return /^eleven_v4(_|$)/.test(modelId);
}

export type ElevenLabsVoicePreset = {
  /** Stable id for logs — never a secret, safe to print. */
  id: string;
  /** Human label, for logs and any future admin UI. */
  name: string;
  dialect: string;
  gender: VoiceGender;
  voiceId: string;
  modelId: string;
  /** `language_code` to send, or omit the field entirely when undefined. */
  languageCode?: string;
  settings: ElevenLabsVoiceSettings;
  /**
   * When false, `voiceSettingsForVibe` must not modify `settings` above — this
   * preset's numbers are final regardless of the selected vibe.
   */
  applyVibe: boolean;
  /**
   * ElevenLabs `seed` (0–4294967295) for best-effort deterministic sampling —
   * documented on `POST /v1/text-to-speech/{voice_id}`. Sent as-is on every
   * request for this preset since the model support is real, not per-attempt.
   */
  recommendedSeed?: number;
};

/**
 * Voice from the owner's ElevenLabs collection "asssi" (one male + one female
 * per premium city), mapped by its language/accent labels.
 * - v4 cities: fixed V4_START_SETTINGS (stability/similarity only); vibe never changes them.
 * - v3 conversational cities (Brooklyn): keep the existing vibe-driven delivery.
 */
function collectionVoice(
  city: string,
  dialect: string,
  gender: VoiceGender,
  label: string,
  voiceId: string,
  languageCode: string
): ElevenLabsVoicePreset {
  const modelId = modelForDialect(dialect);
  const v4 = isV4Model(modelId);
  const slug = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z]+/g, "-")
      .replace(/^-|-$/g, "");
  return {
    id: `${slug(city)}-${gender}-${slug(label)}`,
    name: `Street Vibe / ${city} / ${gender === "male" ? "Male" : "Female"} / ${label}`,
    dialect,
    gender,
    voiceId,
    modelId,
    languageCode,
    settings: v4 ? V4_START_SETTINGS : V3_DM_BASELINE,
    applyVibe: !v4,
  };
}

function pair(
  city: string,
  dialect: string,
  lang: string,
  male: [label: string, voiceId: string],
  female: [label: string, voiceId: string]
): Partial<Record<VoiceGender, ElevenLabsVoicePreset>> {
  return {
    male: collectionVoice(city, dialect, "male", male[0], male[1], lang),
    female: collectionVoice(city, dialect, "female", female[0], female[1], lang),
  };
}

/**
 * Keyed by dialect, then gender. A dialect with no entry for a gender (or no
 * entry at all) falls through to the global Will/Jessica fallback — see
 * `resolveElevenLabsVoiceSelection` in `lib/elevenLabsTts.ts`.
 */
export const ELEVENLABS_VOICE_PRESETS: Record<
  string,
  Partial<Record<VoiceGender, ElevenLabsVoicePreset>>
> = {
  "Jamaican Patois": {
    male: {
      id: "kingston-male-assi-rasta",
      name: "Street Vibe / Kingston / Male / assi rasta",
      dialect: "Jamaican Patois",
      gender: "male",
      voiceId: "JNakJx0PcoBLBnZ9Rvm2",
      // Manual listening test (v2 vs v3 vs v3-conversational) found v3
      // conversational clearly more natural than multilingual v2. A later move
      // to v4_turbo was reverted: Kingston stays on v3 conversational.
      // Voice ID and every other setting are unchanged from approval.
      modelId: modelForDialect("Jamaican Patois"),
      settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0,
        speed: 0.8,
        use_speaker_boost: true,
      },
      applyVibe: false,
      recommendedSeed: 12345,
    },
    // No Jamaican voice in the "asssi" collection: Kingston female keeps Jessica.
  },
  // Collection "asssi" (2026-10). Not used: Nicolas Petit (2nd French male), Bon (2nd
  // Spanish male), Samara X (2nd British female); the owner picked Jonathan, Carlos, Peach.
  "London Roadman": pair("London", "London Roadman", "en", ["Axell", "2mltbVQP21Fq8XgIfRQJ"], ["Peach", "3cuC1hNj9E2jcHlIvndN"]),
  "New York Brooklyn": pair("Brooklyn", "New York Brooklyn", "en", ["Tyler", "rPMkKgdwgIwqv4fXgR6N"], ["Malia", "klHXweKCxxmBYweAPtk4"]),
  "Paris Banlieue": pair("Paris", "Paris Banlieue", "fr", ["Jonathan", "M4DbUhGmKgKUc1GsJEHY"], ["Anna", "nVPCtAFzgyMX3FZKNzH0"]),
  "Spanish Madrid": pair("Madrid", "Spanish Madrid", "es", ["Carlos", "U1qYNY0pKaPbq2VSGpif"], ["Sofia", "eZxqQzb5CuYo3Kl6EXfZ"]),
  // Female: the collection's only Latin American female (verified locale es-AR, not es-MX).
  "Mexico City Barrio": pair("CDMX", "Mexico City Barrio", "es", ["Dante Iván", "htEyPDatXgnV0Xo4jMFF"], ["Cristina Campos", "nTkjq09AuYgsNR8E4sDe"]),
  "Russian Street": pair("Moscow", "Russian Street", "ru", ["Valery", "gXMhWmiqsFkrcssqVb5k"], ["Alisa", "t6lBrEl93uCiLR1Lgm8v"]),
  "Tokyo Gyaru": pair("Tokyo", "Tokyo Gyaru", "ja", ["Hadou", "LIisRj2veIKEBdr6KZ5y"], ["Kana", "dhGvgIx0X6G3xzSWqOye"]),
  "Rio Favela": pair("Rio", "Rio Favela", "pt", ["Will", "r3KkFedJ4n8aabIZ0RFQ"], ["Carla", "x8FWrDHAK5xiFTJLpnHq"]),
  "Israeli Street": pair("Tel Aviv", "Israeli Street", "he", ["Itai", "JIxTgeeS5w0UQyBxEnrl"], ["Maya", "UZzDIQRRTW2Id7YBcbgC"]),
  "Arabic Egyptian": pair("Cairo", "Arabic Egyptian", "ar", ["Mostafa", "QvNF0qyyt1Tuy1YAmnzH"], ["Ghozlan", "xPcC3nehhziQaOrIeAwv"]),
};

export function getVoicePreset(
  dialect: string | undefined,
  gender: VoiceGender
): ElevenLabsVoicePreset | undefined {
  if (!dialect) return undefined;
  return ELEVENLABS_VOICE_PRESETS[dialect]?.[gender];
}
