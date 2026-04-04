/**
 * Icons + labels for premium intensity and vibe segmented controls (Material Symbols names).
 */
export const SLANG_INTENSITY_SEGMENTS = [
  { level: 1 as const, text: "Mild", icon: "eco" },
  { level: 2 as const, text: "Street", icon: "local_fire_department" },
  { level: 3 as const, text: "Raw", icon: "skull" },
] as const;

export const VIBE_SEGMENTS = [
  { value: "dm" as const, text: "Friend", icon: "smartphone" },
  { value: "flirt" as const, text: "Flirty", icon: "favorite" },
  { value: "angry" as const, text: "Angry", icon: "mood_bad" },
  { value: "stoned" as const, text: "Stoned", icon: "blur_on" },
] as const;
