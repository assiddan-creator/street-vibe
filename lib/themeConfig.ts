import { resolveTheme } from "@/lib/streetVibeTheme";

/** Glossy black translucent high-end city theme tokens (dialect = output language id). */
export type CityThemeTokens = {
  glow: string;
  button: string;
  buttonBorder: string;
  accent: string;
  bg: { wide: string; long: string };
  micBall?: string | null;
};

/** Per-dialect hero images: `wide` (desktop), `long` (phone). Same path in both until split assets exist. */
const IMG = {
  /** JP Tokyo — White & Crimson Red */
  tokyo: {
    wide: "/images/Abstract_flat_lay_202603261907.jpeg",
    long: "/images/Abstract_flat_lay_202603261907.jpeg",
  },
  /** RU Moscow — Royal Blue, Crimson Red, White */
  moscow: {
    wide: "/images/Abstract_flat_lay_202603261911.jpeg",
    long: "/images/Abstract_flat_lay_202603261911.jpeg",
  },
  /** MX Mexico City — Emerald Green, White, Crimson Red */
  mexicoCity: {
    wide: "/images/Abstract_flat_lay_202603261912.jpeg",
    long: "/images/Abstract_flat_lay_202603261912.jpeg",
  },
  /** PT Lisbon — Red & Green */
  lisbon: {
    wide: "/images/Abstract_flat_lay_202603261914.jpeg",
    long: "/images/Abstract_flat_lay_202603261914.jpeg",
  },
  /** BR Rio — Emerald Green, Gold Yellow, Royal Blue */
  rio: {
    wide: "/images/Abstract_flat_lay_202603261915.jpeg",
    long: "/images/Abstract_flat_lay_202603261915.jpeg",
  },
  /** JM Kingston — Lime Green & Gold */
  kingston: {
    wide: "/images/kingston wide.jpeg",
    long: "/images/kingston long.jpeg",
  },
  /** US Brooklyn — Royal Blue, Crimson Red, White */
  brooklyn: {
    wide: "/images/brooklyn wide.jpeg",
    long: "/images/brooklyn long.jpeg",
  },
  /** FR Paris — Tricolour Blue, White, Crimson Red */
  paris: {
    wide: "/images/DJ_headphones_with_202603261909.jpeg",
    long: "/images/DJ_headphones_with_202603261909.jpeg",
  },
  /** IL Israel — Royal Blue & Pure White */
  israel: {
    wide: "/images/DJ_headphones_with_202603261917.jpeg",
    long: "/images/DJ_headphones_with_202603261917.jpeg",
  },
  /** UK London — Royal Blue, Crimson Red, White */
  london: {
    wide: "/images/london wide.jpeg",
    long: "/images/london long.jpeg",
  },
} as const;

/**
 * Premium dialects: glow / button / border / accent + optional mic ball art path.
 * Colors follow each territory’s flag palette as specified.
 */
export const CITY_THEME_BY_DIALECT_ID: Record<string, CityThemeTokens> = {
  "Tokyo Gyaru": {
    glow: "#ffffff",
    button: "#BC002D",
    buttonBorder: "#ffffff",
    accent: "#BC002D",
    bg: IMG.tokyo,
    micBall: "/images/japan.jpeg",
  },
  "Russian Street": {
    glow: "#0032A0",
    button: "#D52B1E",
    buttonBorder: "#0032A0",
    accent: "#D52B1E",
    bg: IMG.moscow,
    micBall: "/images/russia.jpeg",
  },
  "Mexico City Barrio": {
    glow: "#CE1126",
    button: "#006847",
    buttonBorder: "#CE1126",
    accent: "#006847",
    bg: IMG.mexicoCity,
    micBall: "/images/mexico.jpeg",
  },
  "Lisbon Street": {
    glow: "#FF0000",
    button: "#006600",
    buttonBorder: "#FF0000",
    accent: "#006600",
    bg: IMG.lisbon,
    micBall: null,
  },
  "Rio Favela": {
    glow: "#FFDF00",
    button: "#009C3B",
    buttonBorder: "#FFDF00",
    accent: "#009C3B",
    bg: IMG.rio,
    micBall: "/images/brasil.jpeg",
  },
  "Jamaican Patois": {
    glow: "#FED100",
    button: "#009B44",
    buttonBorder: "#FED100",
    accent: "#009B44",
    bg: IMG.kingston,
    micBall: "/images/jamaika.jpeg",
  },
  "New York Brooklyn": {
    glow: "#3C3B6E",
    button: "#B22234",
    buttonBorder: "#3C3B6E",
    accent: "#B22234",
    bg: IMG.brooklyn,
    micBall: "/images/usa.jpeg",
  },
  "Paris Banlieue": {
    glow: "#ED2939",
    button: "#002395",
    buttonBorder: "#ED2939",
    accent: "#002395",
    bg: IMG.paris,
    micBall: "/images/france.jpeg",
  },
  "Israeli Street": {
    glow: "#ffffff",
    button: "#0038B8",
    buttonBorder: "#ffffff",
    accent: "#0038B8",
    bg: IMG.israel,
    micBall: "/images/israel.jpeg",
  },
  "London Roadman": {
    glow: "#012169",
    button: "#CF111A",
    buttonBorder: "#012169",
    accent: "#CF111A",
    bg: IMG.london,
    micBall: "/images/england.jpeg",
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
    micBall: null,
  };
}
