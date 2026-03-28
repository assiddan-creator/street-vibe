/**
 * MiniMax Speech 2.8 Turbo preset `voice_id` values (Replicate `minimax/speech-2.8-turbo`).
 * @see https://replicate.com/minimax/speech-2.8-turbo
 */

/** Presets we allow for dev `tuning.voice_id` override (production still uses gender defaults unless extended later). */
export const MINIMAX_REPLICATE_DEV_VOICE_PRESETS: {
  id: string;
  label: string;
  group: "male" | "female" | "neutral";
}[] = [
  { id: "Casual_Guy", label: "Casual male", group: "male" },
  { id: "Friendly_Person", label: "Friendly male", group: "male" },
  { id: "Deep_Voice_Man", label: "Deep male", group: "male" },
  { id: "Exuberant_Girl", label: "Expressive female", group: "female" },
  { id: "Lively_Girl", label: "Lively female", group: "female" },
  { id: "Calm_Woman", label: "Calmer / neutral female", group: "neutral" },
];

const ALLOWED = new Set(MINIMAX_REPLICATE_DEV_VOICE_PRESETS.map((v) => v.id));

export function isAllowedMinimaxReplicateVoiceId(voiceId: string): boolean {
  return ALLOWED.has(voiceId);
}
