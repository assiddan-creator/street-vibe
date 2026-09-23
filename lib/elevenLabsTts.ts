/**
 * ElevenLabs Text-to-Speech — the most natural / human-sounding engine.
 * Synchronous: POST returns the MP3 bytes directly (no polling like Replicate).
 * The /api/tts route tries this first when ELEVENLABS_API_KEY is set and falls
 * back to the MiniMax (Replicate) path on any error.
 */

import { getVoicePreset, type ElevenLabsVoiceSettings, type VoiceGender } from "@/lib/elevenLabsVoicePresets";

/**
 * eleven_v3_conversational: v3's expressiveness with sub-second latency, 74
 * languages — best all-round for short chat lines. Verified ~0.9s / 49 chars.
 * Override with eleven_multilingual_v2 (steadier on very short text) or
 * eleven_flash_v2_5 (half price).
 *
 * This is the GLOBAL default model, used when no dialect+gender preset
 * applies. A preset (see `lib/elevenLabsVoicePresets.ts`) carries its own
 * `modelId` and is never affected by this env var.
 */
export const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_v3_conversational";

/** Premade voices — young, casual, conversational; always on any account. */
const VOICE_MALE = process.env.ELEVENLABS_VOICE_MALE || "bIHbv24MWmeRgasZH58o"; // Will — relaxed optimist
const VOICE_FEMALE = process.env.ELEVENLABS_VOICE_FEMALE || "cgSgspJ2msm6clMCkdW9"; // Jessica — playful, bright, warm

type VoiceSettings = ElevenLabsVoiceSettings;

/** Looser stability = more expressive delivery; tuned per message vibe. */
function voiceSettingsForVibe(vibe: string | undefined): VoiceSettings {
  const base = { similarity_boost: 0.8, use_speaker_boost: true, speed: 1 };
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

/**
 * Resolves everything ElevenLabs needs for one request: which voice, which
 * model, which settings, and whether the vibe system may still adjust the
 * settings (it may not, for a `applyVibe: false` preset).
 *
 * Precedence: an approved dialect+gender preset wins outright. Everything
 * else — every other dialect, every other gender, dialect=undefined — keeps
 * the exact existing global behaviour: Will/Jessica (or their env overrides)
 * with `ELEVENLABS_MODEL_ID` and vibe-driven settings.
 */
export function resolveElevenLabsVoiceSelection(
  gender: VoiceGender,
  dialect: string | undefined,
  vibe: string | undefined
): {
  voiceId: string;
  modelId: string;
  settings: VoiceSettings;
  languageCode?: string;
  seed?: number;
  presetId?: string;
} {
  const preset = getVoicePreset(dialect, gender);
  if (preset) {
    return {
      voiceId: preset.voiceId,
      modelId: preset.modelId,
      // applyVibe: false means these settings are final; vibe never touches
      // them. applyVibe: true swaps only the voice, keeping vibe delivery.
      settings: preset.applyVibe ? voiceSettingsForVibe(vibe) : preset.settings,
      languageCode: preset.languageCode,
      seed: preset.recommendedSeed,
      presetId: preset.id,
    };
  }

  return {
    voiceId: gender === "female" ? VOICE_FEMALE : VOICE_MALE,
    modelId: ELEVENLABS_MODEL_ID,
    settings: voiceSettingsForVibe(vibe),
  };
}

/** Backward-compatible helper — global fallback only, ignores presets. */
export function resolveElevenLabsVoiceId(gender: VoiceGender): string {
  return gender === "female" ? VOICE_FEMALE : VOICE_MALE;
}

export async function synthesizeElevenLabs(opts: {
  apiKey: string;
  text: string;
  gender: VoiceGender;
  dialect?: string;
  vibe?: string;
  timeoutMs?: number;
}): Promise<{
  audioBase64: string;
  voiceId: string;
  modelId: string;
  presetId?: string;
}> {
  const { apiKey, text, gender, dialect, vibe, timeoutMs = 45_000 } = opts;
  const { voiceId, modelId, settings, languageCode, seed, presetId } =
    resolveElevenLabsVoiceSelection(gender, dialect, vibe);

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
          model_id: modelId,
          voice_settings: settings,
          ...(languageCode ? { language_code: languageCode } : {}),
          // Documented top-level field on this endpoint (best-effort
          // deterministic sampling). Only sent when a preset declares one.
          ...(typeof seed === "number" ? { seed } : {}),
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
  return { audioBase64: Buffer.from(buf).toString("base64"), voiceId, modelId, presetId };
}
