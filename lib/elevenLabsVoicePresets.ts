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

export type ElevenLabsVoiceSettings = {
  stability: number;
  similarity_boost: number;
  style: number;
  /** Documented ElevenLabs field, default 1. Only meaningful on v2+ models. */
  speed: number;
  use_speaker_boost: boolean;
};

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
      // conversational clearly more natural for this cloned voice than the
      // originally-approved multilingual v2. Voice ID and every other
      // setting are unchanged from approval.
      modelId: "eleven_v3_conversational",
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
    // No female preset yet — Jamaican Patois + female keeps using Jessica.
  },
};

export function getVoicePreset(
  dialect: string | undefined,
  gender: VoiceGender
): ElevenLabsVoicePreset | undefined {
  if (!dialect) return undefined;
  return ELEVENLABS_VOICE_PRESETS[dialect]?.[gender];
}
