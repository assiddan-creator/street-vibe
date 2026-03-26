import { resolveTheme } from "@/lib/streetVibeTheme";

/** Glossy black translucent high-end city theme tokens (dialect = output language id). */
export type CityThemeTokens = {
  glow: string;
  button: string;
  buttonBorder: string;
  accent: string;
  bg: string;
};

const IMG = {
  abstract907: "/images/Abstract_flat_lay_202603261907.jpeg",
  abstract911: "/images/Abstract_flat_lay_202603261911.jpeg",
  abstract912: "/images/Abstract_flat_lay_202603261912.jpeg",
  abstract914: "/images/Abstract_flat_lay_202603261914.jpeg",
  abstract915: "/images/Abstract_flat_lay_202603261915.jpeg",
  blackObjects: "/images/Black_objects_with_202603261852.jpeg",
  dj904: "/images/DJ_headphones_with_202603261904.jpeg",
  dj909: "/images/DJ_headphones_with_202603261909.jpeg",
  dj917: "/images/DJ_headphones_with_202603261917.jpeg",
  headphones908: "/images/Headphones,_chain,_shards,_202603261908.jpeg",
} as const;

/**
 * Premium dialects: explicit glow / button / border / accent + placeholder bg images.
 * User can remap `bg` per dialect later.
 */
export const CITY_THEME_BY_DIALECT_ID: Record<string, CityThemeTokens> = {
  "Jamaican Patois": {
    glow: "#a8ff3e",
    button: "#22C55E",
    buttonBorder: "#15803d",
    accent: "#4ade80",
    bg: IMG.blackObjects,
  },
  "London Roadman": {
    glow: "#c4b5fd",
    button: "#a78bfa",
    buttonBorder: "#7c3aed",
    accent: "#a78bfa",
    bg: IMG.abstract907,
  },
  "New York Brooklyn": {
    glow: "#fca5a5",
    button: "#f87171",
    buttonBorder: "#dc2626",
    accent: "#f87171",
    bg: IMG.dj904,
  },
  "Tokyo Gyaru": {
    glow: "#93c5fd",
    button: "#60a5fa",
    buttonBorder: "#2563eb",
    accent: "#60a5fa",
    bg: IMG.abstract911,
  },
  "Paris Banlieue": {
    glow: "#fde047",
    button: "#fbbf24",
    buttonBorder: "#d97706",
    accent: "#fbbf24",
    bg: IMG.abstract912,
  },
  "Russian Street": {
    glow: "#f1f5f9",
    button: "#e2e8f0",
    buttonBorder: "#94a3b8",
    accent: "#e2e8f0",
    bg: IMG.abstract914,
  },
  "Mumbai Hinglish": {
    glow: "#fdba74",
    button: "#fb923c",
    buttonBorder: "#ea580c",
    accent: "#fb923c",
    bg: IMG.abstract915,
  },
  "Mexico City Barrio": {
    glow: "#f9a8d4",
    button: "#f472b6",
    buttonBorder: "#db2777",
    accent: "#f472b6",
    bg: IMG.dj909,
  },
  "Rio Favela": {
    glow: "#6ee7b7",
    button: "#34d399",
    buttonBorder: "#059669",
    accent: "#34d399",
    bg: IMG.dj917,
  },
};

/** Shared placeholder for all standard output languages until manually tuned. */
const STANDARD_BG_PLACEHOLDER = IMG.headphones908;

export const DEFAULT_DIALECT_ID = "Jamaican Patois";

export function getCityThemeForDialect(dialectId: string): CityThemeTokens {
  const premium = CITY_THEME_BY_DIALECT_ID[dialectId];
  if (premium) return premium;

  const t = resolveTheme(dialectId);
  return {
    glow: t.accent,
    button: t.accent,
    buttonBorder: t.accent,
    accent: t.accent,
    bg: STANDARD_BG_PLACEHOLDER,
  };
}
