import { resolveTheme } from "@/lib/streetVibeTheme";

/** Glossy black translucent high-end city theme tokens (dialect = output language id). */
export type CityThemeTokens = {
  glow: string;
  button: string;
  buttonBorder: string;
  accent: string;
  bg: string;
};

/** All ten `public/images` assets are assigned exactly once to premium dialects below. */
const IMG = {
  /** JP Tokyo — White & Crimson Red */
  tokyo: "/images/Abstract_flat_lay_202603261907.jpeg",
  /** RU Moscow — Royal Blue, Crimson Red, White */
  moscow: "/images/Abstract_flat_lay_202603261911.jpeg",
  /** MX Mexico City — Emerald Green, White, Crimson Red */
  mexicoCity: "/images/Abstract_flat_lay_202603261912.jpeg",
  /** PT Lisbon — Red & Green */
  lisbon: "/images/Abstract_flat_lay_202603261914.jpeg",
  /** BR Rio — Emerald Green, Gold Yellow, Royal Blue */
  rio: "/images/Abstract_flat_lay_202603261915.jpeg",
  /** JM Kingston — Lime Green & Gold */
  kingston: "/images/Black_objects_with_202603261852.jpeg",
  /** US Brooklyn — Royal Blue, Crimson Red, White */
  brooklyn: "/images/DJ_headphones_with_202603261904.jpeg",
  /** FR Paris — Tricolour Blue, White, Crimson Red */
  paris: "/images/DJ_headphones_with_202603261909.jpeg",
  /** IL Israel — Royal Blue & Pure White */
  israel: "/images/DJ_headphones_with_202603261917.jpeg",
  /** UK London — Royal Blue, Crimson Red, White */
  london: "/images/Headphones,_chain,_shards,_202603261908.jpeg",
} as const;

/**
 * Premium dialects: neon glow / button / border / accent + full-bleed background image.
 * Colors follow each territory’s flag or neon palette as specified.
 */
export const CITY_THEME_BY_DIALECT_ID: Record<string, CityThemeTokens> = {
  "Tokyo Gyaru": {
    glow: "#ff1a3d",
    button: "#f8fafc",
    buttonBorder: "#dc2626",
    accent: "#f43f5e",
    bg: IMG.tokyo,
  },
  "Russian Street": {
    glow: "#3b82f6",
    button: "#1e40af",
    buttonBorder: "#dc2626",
    accent: "#93c5fd",
    bg: IMG.moscow,
  },
  "Mexico City Barrio": {
    glow: "#10b981",
    button: "#047857",
    buttonBorder: "#dc2626",
    accent: "#34d399",
    bg: IMG.mexicoCity,
  },
  "Lisbon Street": {
    glow: "#dc2626",
    button: "#16a34a",
    buttonBorder: "#15803d",
    accent: "#22c55e",
    bg: IMG.lisbon,
  },
  "Rio Favela": {
    glow: "#fbbf24",
    button: "#059669",
    buttonBorder: "#1d4ed8",
    accent: "#34d399",
    bg: IMG.rio,
  },
  "Jamaican Patois": {
    glow: "#bef264",
    button: "#ca8a04",
    buttonBorder: "#65a30d",
    accent: "#4ade80",
    bg: IMG.kingston,
  },
  "New York Brooklyn": {
    glow: "#3b82f6",
    button: "#1e3a8a",
    buttonBorder: "#dc2626",
    accent: "#f87171",
    bg: IMG.brooklyn,
  },
  "Paris Banlieue": {
    glow: "#2563eb",
    button: "#1d4ed8",
    buttonBorder: "#dc2626",
    accent: "#60a5fa",
    bg: IMG.paris,
  },
  "Israeli Street": {
    glow: "#60a5fa",
    button: "#2563eb",
    buttonBorder: "#f8fafc",
    accent: "#93c5fd",
    bg: IMG.israel,
  },
  "London Roadman": {
    glow: "#3b82f6",
    button: "#1e40af",
    buttonBorder: "#dc2626",
    accent: "#60a5fa",
    bg: IMG.london,
  },
};

/** Fallback for standard (non-premium) output languages — generic abstract hero. */
const STANDARD_BG_PLACEHOLDER = IMG.tokyo;

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
