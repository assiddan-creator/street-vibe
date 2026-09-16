/**
 * ElevenLabs Text-to-Speech.
 * Synchronous: POST returns MP3 bytes directly (no polling like Replicate).
 * The /api/tts route tries this first when ELEVENLABS_API_KEY is set and falls
 * back to MiniMax (Replicate) on any error.
 */

/**
 * Default stays on the current conversational model so this branch isolates
 * voice/accent changes. It can still be overridden in Vercel for A/B testing.
 */
export const ELEVENLABS_MODEL_ID =
  process.env.ELEVENLABS_MODEL_ID || "eleven_v3_conversational";

/** Global fallback voices. */
const VOICE_MALE =
  process.env.ELEVENLABS_VOICE_MALE || "bIHbv24MWmeRgasZH58o"; // Will
const VOICE_FEMALE =
  process.env.ELEVENLABS_VOICE_FEMALE || "cgSgspJ2msm6clMCkdW9"; // Jessica

type VoiceSettings = {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
};

type DialectVoiceConfig = {
  male?: string;
  female?: string;
  languageCode?: string;
};

/**
 * Regional voice overrides for the first A/B pass.
 *
 * Voice Library IDs are intentionally supplied through environment variables
 * rather than hard-coded because community/professional voices can change or
 * disappear. If an override is missing, Street Vibe safely keeps using the
 * existing global Will/Jessica fallback.
 */
const DIALECT_VOICE_CONFIG: Record<string, DialectVoiceConfig> = {
  "London Roadman": {
    male: process.env.ELEVENLABS_VOICE_LONDON_MALE,
    female: process.env.ELEVENLABS_VOICE_LONDON_FEMALE,
    languageCode: "en",
  },
  "Jamaican Patois": {
    male: process.env.ELEVENLABS_VOICE_KINGSTON_MALE,
    female: process.env.ELEVENLABS_VOICE_KINGSTON_FEMALE,
    languageCode: "en",
  },
  "New York Brooklyn": {
    male: process.env.ELEVENLABS_VOICE_BROOKLYN_MALE,
    female: process.env.ELEVENLABS_VOICE_BROOKLYN_FEMALE,
    languageCode: "en",
  },
};

/** Language hint for every current output option, independent of voice override. */
const DIALECT_LANGUAGE_CODE: Record<string, string> = {
  "London Roadman": "en",
  "Jamaican Patois": "en",
  "New York Brooklyn": "en",
  "Tokyo Gyaru": "ja",
  "Paris Banlieue": "fr",
  "Russian Street": "ru",
  "Mexico City Barrio": "es",
  "Rio Favela": "pt",
  "Israeli Street": "he",
  "Arabic Egyptian": "ar",
  "Spanish Madrid": "es",
  "English (Standard)": "en",
  Spanish: "es",
  French: "fr",
  German: "de",
  Italian: "it",
  Russian: "ru",
  Portuguese: "pt",
  Japanese: "ja",
  Arabic: "ar",
  "Hebrew (Standard)": "he",
};

function cleanVoiceId(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/** Looser stability = more expressive delivery; tuned per message vibe. */
function voiceSettingsForVibe(vibe: string | undefined): VoiceSettings {
  const base = { similarity_boost: 0.8, use_speaker_boost: true };
  switch (vibe) {
    case "angry":
      return { ...base, stability: 0.3, style: 0.45 };
    case "stoned":
      return { ...base, stability: 0.65, style: 0.12 };
    case "flirt":
      return { ...base, stability: 0.4, style: 0.35 };
    case "hype":
    case "post":
      return { ...base, stability: 0.32, style: 0.4 };
    default:
      return { ...base, stability: 0.42, style: 0.28 };
  }
}

export function resolveElevenLabsVoiceSelection(
  gender: "male" | "female",
  dialect?: string
): {
  voiceId: string;
  languageCode?: string;
  usedDialectOverride: boolean;
} {
  const config = dialect ? DIALECT_VOICE_CONFIG[dialect] : undefined;
  const dialectVoice = cleanVoiceId(config?.[gender]);
  const fallback = gender === "female" ? VOICE_FEMALE : VOICE_MALE;

  return {
    voiceId: dialectVoice || fallback,
    languageCode:
      config?.languageCode || (dialect ? DIALECT_LANGUAGE_CODE[dialect] : undefined),
    usedDialectOverride: Boolean(dialectVoice),
  };
}

/** Backward-compatible helper used by older call sites/tests. */
export function resolveElevenLabsVoiceId(
  gender: "male" | "female",
  dialect?: string
): string {
  return resolveElevenLabsVoiceSelection(gender, dialect).voiceId;
}

export async function synthesizeElevenLabs(opts: {
  apiKey: string;
  text: string;
  gender: "male" | "female";
  dialect?: string;
  vibe?: string;
  timeoutMs?: number;
}): Promise<{
  audioBase64: string;
  voiceId: string;
  languageCode?: string;
  usedDialectOverride: boolean;
}> {
  const { apiKey, text, gender, dialect, vibe, timeoutMs = 45_000 } = opts;
  const { voiceId, languageCode, usedDialectOverride } =
    resolveElevenLabsVoiceSelection(gender, dialect);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
        voiceId
      )}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey.trim(),
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: ELEVENLABS_MODEL_ID,
          ...(languageCode ? { language_code: languageCode } : {}),
          voice_settings: voiceSettingsForVibe(vibe),
        }),
        signal: controller.signal,
      }
    );
  } catch (e) {
    throw e instanceof Error && e.name === "AbortError"
      ? new Error(`ElevenLabs timed out after ${timeoutMs}ms`)
      : e;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { detail?: { message?: string } | string };
      detail =
        (typeof j.detail === "string" ? j.detail : j.detail?.message) || detail;
    } catch {
      /* keep HTTP status */
    }
    throw new Error(`ElevenLabs error: ${detail}`);
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength < 200) {
    throw new Error("ElevenLabs returned no audio");
  }
  return {
    audioBase64: Buffer.from(buf).toString("base64"),
    voiceId,
    languageCode,
    usedDialectOverride,
  };
}
