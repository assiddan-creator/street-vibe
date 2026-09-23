/**
 * Icons + labels for premium intensity and vibe segmented controls (Material Symbols names).
 */
export const SLANG_INTENSITY_SEGMENTS = [
  { level: 1 as const, text: "Natural", icon: "eco" },
  { level: 2 as const, text: "Street", icon: "local_fire_department" },
  { level: 3 as const, text: "Heavy", icon: "skull" },
] as const;

// "stoned" is intentionally not offered in the main UI (reads as a toy, not a
// tool). The API still accepts it, so old history entries restore fine.
export const VIBE_SEGMENTS = [
  { value: "dm" as const, text: "Friend", icon: "smartphone" },
  { value: "flirt" as const, text: "Flirty", icon: "favorite" },
  { value: "angry" as const, text: "Angry", icon: "mood_bad" },
] as const;
