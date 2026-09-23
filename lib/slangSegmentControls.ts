/**
 * Icons + labels for premium intensity and vibe segmented controls (Material Symbols names).
 */
export const SLANG_INTENSITY_SEGMENTS = [
  { level: 1 as const, text: "Natural", icon: "eco" },
  { level: 2 as const, text: "Street", icon: "local_fire_department" },
  { level: 3 as const, text: "Heavy", icon: "skull" },
] as const;

/**
 * "Who's it for?" — the recipient drives how much slang and familiarity is
 * safe far more than a mood does. Values are the API's `context` keys.
 *
 * "angry" and "stoned" are no longer offered in the main UI; the API still
 * accepts them, so old history entries restore fine.
 */
export const VIBE_SEGMENTS = [
  { value: "dm" as const, text: "Friend", icon: "smartphone" },
  { value: "flirt" as const, text: "Match", icon: "favorite" },
  { value: "group" as const, text: "Group", icon: "groups" },
  { value: "new" as const, text: "Someone new", icon: "waving_hand" },
] as const;

export type AudienceValue = (typeof VIBE_SEGMENTS)[number]["value"];

export const DEFAULT_AUDIENCE: AudienceValue = "dm";

export function isAudienceValue(v: unknown): v is AudienceValue {
  return typeof v === "string" && VIBE_SEGMENTS.some((s) => s.value === v);
}
