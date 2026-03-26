export type VoiceTuning = {
  voice_id: string;
  speed: number;
  pitch: number;
  emotion: string;
};

/** MiniMax / Replicate voice mapping by dialect label (matches `tts.js` VOICE_MAP). */
export const VOICE_MAP: Record<string, VoiceTuning> = {
  "New York Brooklyn": {
    voice_id: "Casual_Guy",
    speed: 1.05,
    pitch: 0,
    emotion: "happy",
  },
  "London Roadman": {
    voice_id: "Casual_Guy",
    speed: 1.05,
    pitch: -1,
    emotion: "neutral",
  },
  "Jamaican Patois": {
    voice_id: "Casual_Guy",
    speed: 1.0,
    pitch: -1,
    emotion: "happy",
  },
  "Tokyo Gyaru": {
    voice_id: "Sweet_Girl",
    speed: 1.1,
    pitch: 2,
    emotion: "happy",
  },
  "Paris Banlieue": {
    voice_id: "Casual_Guy",
    speed: 1.05,
    pitch: -1,
    emotion: "neutral",
  },
  "Russian Street": {
    voice_id: "Casual_Guy",
    speed: 1.0,
    pitch: -2,
    emotion: "neutral",
  },
  "Mumbai Hinglish": {
    voice_id: "Casual_Guy",
    speed: 1.1,
    pitch: 0,
    emotion: "happy",
  },
  "Mexico City Barrio": {
    voice_id: "Casual_Guy",
    speed: 1.05,
    pitch: -1,
    emotion: "neutral",
  },
  "Rio Favela": {
    voice_id: "Casual_Guy",
    speed: 1.05,
    pitch: -1,
    emotion: "happy",
  },
};

const DEFAULT_VOICE: VoiceTuning = {
  voice_id: "Casual_Guy",
  speed: 1.0,
  pitch: 0,
  emotion: "neutral",
};

export function resolveVoiceForDialect(dialect: string | undefined): VoiceTuning {
  const d = dialect || "";
  for (const [key, cfg] of Object.entries(VOICE_MAP)) {
    if (d.includes(key)) return cfg;
  }
  return DEFAULT_VOICE;
}
