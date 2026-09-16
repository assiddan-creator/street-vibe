/**
 * ElevenLabs Text-to-Speech.
 * Synchronous: POST returns MP3 bytes directly (no polling like Replicate).
 * The /api/tts route tries this first when ELEVENLABS_API_KEY is set and falls
 * back to MiniMax (Replicate) on any error.
 */

import {
  resolveElevenLabsVoiceSelection,
  type VoiceGender,
  type VoiceResolution,
} from "@/lib/elevenLabsVoices";

/**
 * Default stays on the current conversational model.
 *
 * Kept deliberately: the official ElevenLabs documentation does not establish
 * that `eleven_v3` has better regional accent, pronunciation or slang fidelity
 * than `eleven_v3_conversational` — both cover 70+ languages and expressive
 * speech, and the conversational variant is tuned for realtime latency. The env
 * override exists so `eleven_v3` can be A/B tested later without a code change.
 */
export const ELEVENLABS_MODEL_ID =
  process.env.ELEVENLABS_MODEL_ID || "eleven_v3_conversational";

type VoiceSettings = {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
};

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

export {
  resolveElevenLabsVoiceSelection,
  resolveElevenLabsVoiceId,
} from "@/lib/elevenLabsVoices";

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
  languageCode?: string;
  /** True when a regional voice was used rather than the global fallback. */
  usedDialectOverride: boolean;
  source: VoiceResolution["source"];
  voiceName?: string;
}> {
  const { apiKey, text, gender, dialect, vibe, timeoutMs = 45_000 } = opts;
  const { voiceId, languageCode, source, voiceName } =
    resolveElevenLabsVoiceSelection(gender, dialect);
  const usedDialectOverride = source !== "global-fallback";

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
    // 402 on a catalogue voice means the account is on a plan that cannot use
    // Voice Library voices. Name that explicitly so it is not mistaken for a
    // bad Voice ID; the caller still falls back to MiniMax either way.
    if (res.status === 402 && source !== "global-fallback") {
      throw new Error(
        `ElevenLabs error: ${detail} (regional voice "${voiceId}" needs a paid ElevenLabs plan; unset ELEVENLABS_REGIONAL_VOICES to use the global voices)`
      );
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
    source,
    voiceName,
  };
}
