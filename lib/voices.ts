export type VoiceTuning = {
  voice_id: string;
  speed: number;
  pitch: number;
  emotion: string;
  preferGoogle?: boolean;
};

/** MiniMax / Replicate voice mapping by dialect label (matches `tts.js` VOICE_MAP). */
export const VOICE_MAP: Record<string, VoiceTuning> = {
  "New York Brooklyn": {
    voice_id: "English_ManWithDeepVoice",
    speed: 0.95,
    pitch: 0,
    emotion: "neutral",
  },
  "London Roadman": {
    voice_id: "English_MatureBoss",
    speed: 0.9,
    pitch: -1,
    emotion: "neutral",
    preferGoogle: true,
  },
  "Jamaican Patois": {
    voice_id: "English_PassionateWarrior",
    speed: 0.9,
    pitch: -1,
    emotion: "happy",
  },
  "Tokyo Gyaru": {
    voice_id: "Japanese_GracefulMaiden",
    speed: 0.95,
    pitch: 1,
    emotion: "happy",
    preferGoogle: true,
  },
  "Paris Banlieue": {
    voice_id: "English_ReservedYoungMan",
    speed: 0.9,
    pitch: -1,
    emotion: "neutral",
  },
  "Russian Street": {
    voice_id: "English_ImposingManner",
    speed: 0.9,
    pitch: -2,
    emotion: "neutral",
  },
  "Lisbon Street": {
    voice_id: "Portuguese_ReservedYoungMan",
    speed: 0.9,
    pitch: -1,
    emotion: "neutral",
  },
  "Mexico City Barrio": {
    voice_id: "Spanish_ReservedYoungMan",
    speed: 0.9,
    pitch: -1,
    emotion: "neutral",
  },
  "Rio Favela": {
    voice_id: "Portuguese_Strong-WilledBoy",
    speed: 0.9,
    pitch: -1,
    emotion: "happy",
  },
  "Israeli Street": {
    voice_id: "English_Steadymentor",
    speed: 0.9,
    pitch: 0,
    emotion: "neutral",
  },
};

const DEFAULT_VOICE: VoiceTuning = {
  voice_id: "English_FriendlyPerson",
  speed: 0.9,
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
