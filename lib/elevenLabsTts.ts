/**
 * ElevenLabs Text-to-Speech — the most natural / human-sounding engine.
 * Synchronous: POST returns the MP3 bytes directly (no polling like Replicate).
 * The /api/tts route tries this first when ELEVENLABS_API_KEY is set and falls
 * back to the MiniMax (Replicate) path on any error.
 */

/**
 * eleven_v3_conversational: v3's expressiveness with sub-second latency, 74
 * languages — best all-round for short chat lines. Verified ~0.9s / 49 chars.
 * Override with eleven_multilingual_v2 (steadier on very short text) or
 * eleven_flash_v2_5 (half price).
 */
export const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_v3_conversational";

/** Premade voices — young, casual, conversational; always on any account. */
const VOICE_MALE = process.env.ELEVENLABS_VOICE_MALE || "bIHbv24MWmeRgasZH58o"; // Will — relaxed optimist
const VOICE_FEMALE = process.env.ELEVENLABS_VOICE_FEMALE || "cgSgspJ2msm6clMCkdW9"; // Jessica — playful, bright, warm

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

export function resolveElevenLabsVoiceId(gender: "male" | "female"): string {
  return gender === "female" ? VOICE_FEMALE : VOICE_MALE;
}

export async function synthesizeElevenLabs(opts: {
  apiKey: string;
  text: string;
  gender: "male" | "female";
  vibe?: string;
  timeoutMs?: number;
}): Promise<{ audioBase64: string }> {
  const { apiKey, text, gender, vibe, timeoutMs = 45_000 } = opts;
  const voiceId = resolveElevenLabsVoiceId(gender);

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
  return { audioBase64: Buffer.from(buf).toString("base64") };
}
