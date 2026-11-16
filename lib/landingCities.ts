import { DIALECTS } from "./dialects";
import { getCityThemeForDialect } from "./themeConfig";

/**
 * Landing page tour: one plain line carried around the globe and said the local way at each
 * of the app's street dialects. The order is a flight route (west to east), not the app's
 * dialect order, so the camera never doubles back across an ocean.
 */

/** The single plain line every stop rewrites. */
export const TOURIST_LINE = "Hello my friend, how are you today?";

type StopSeed = {
  /** Dialect value as used by the app (`lib/dialects.ts`). */
  dialect: string;
  /** Human name of the dialect, shown next to the city. */
  speech: string;
  lat: number;
  lon: number;
  /** The plain line the way a local would send it. */
  local: string;
  /** Just the greeting, for the ring of hellos around the globe. */
  hello: string;
  /** BCP 47 tag + direction of the local line. */
  lang: string;
  dir: "ltr" | "rtl";
  /** Three official flag colors, nearest ring first (may repeat for two-color flags). */
  glow: [string, string, string];
  /** Official flag color used as the local bubble's field. */
  field: string;
  /** Official flag color for text on a white field; otherwise black or white is picked by contrast. */
  fieldInk?: string;
};

const STOPS: StopSeed[] = [
  {
    dialect: "Jamaican Patois",
    speech: "Jamaican Patois",
    lat: 17.97,
    lon: -76.79,
    local: "Wah gwaan, mi bredda? Yuh good?",
    hello: "Wah gwaan",
    lang: "jam",
    dir: "ltr",
    glow: ["#FED100", "#009B3A", "#FED100"],
    field: "#FED100",
  },
  {
    dialect: "Mexico City Barrio",
    speech: "Barrio Spanish",
    lat: 19.43,
    lon: -99.13,
    local: "¿Qué onda, güey? ¿Todo bien o qué?",
    hello: "¿Qué onda, güey?",
    lang: "es-MX",
    dir: "ltr",
    glow: ["#006847", "#FFFFFF", "#CE1126"],
    field: "#006847",
  },
  {
    dialect: "New York Brooklyn",
    speech: "Brooklyn English",
    lat: 40.68,
    lon: -73.94,
    local: "Yo, what's good, B? You straight?",
    hello: "Yo, what's good",
    lang: "en-US",
    dir: "ltr",
    glow: ["#B22234", "#FFFFFF", "#3C3B6E"],
    field: "#B22234",
  },
  {
    dialect: "Rio Favela",
    speech: "Carioca Portuguese",
    lat: -22.91,
    lon: -43.17,
    local: "Coé, mermão, suave?",
    hello: "Coé, mermão",
    lang: "pt-BR",
    dir: "ltr",
    glow: ["#009C3B", "#FFDF00", "#002776"],
    field: "#009C3B",
  },
  {
    dialect: "Spanish Madrid",
    speech: "Madrid Spanish",
    lat: 40.42,
    lon: -3.7,
    local: "¿Qué pasa, tío? ¿Cómo andas?",
    hello: "¿Qué pasa, tío?",
    lang: "es-ES",
    dir: "ltr",
    glow: ["#F1BF00", "#AA151B", "#F1BF00"],
    field: "#F1BF00",
  },
  {
    dialect: "London Roadman",
    speech: "Roadman English",
    lat: 51.51,
    lon: -0.13,
    local: "Wagwan, fam? You good, yeah?",
    hello: "Wagwan, fam",
    lang: "en-GB",
    dir: "ltr",
    glow: ["#C8102E", "#FFFFFF", "#012169"],
    field: "#C8102E",
  },
  {
    dialect: "Paris Banlieue",
    speech: "Banlieue French",
    lat: 48.86,
    lon: 2.35,
    local: "Wesh frérot, bien ou quoi ?",
    hello: "Wesh frérot",
    lang: "fr-FR",
    dir: "ltr",
    glow: ["#000091", "#FFFFFF", "#E1000F"],
    field: "#FFFFFF",
    fieldInk: "#000091",
  },
  {
    dialect: "Arabic Egyptian",
    speech: "Egyptian Arabic",
    lat: 30.04,
    lon: 31.24,
    local: "إزيك يا باشا؟ عامل إيه؟",
    hello: "إزيك يا باشا",
    lang: "arz",
    dir: "rtl",
    glow: ["#CE1126", "#FFFFFF", "#C09300"],
    field: "#C09300",
  },
  {
    dialect: "Israeli Street",
    speech: "Street Hebrew",
    lat: 32.08,
    lon: 34.78,
    local: "אחי, מה קורה? הכל סבבה?",
    hello: "אחי, מה קורה",
    lang: "he",
    dir: "rtl",
    glow: ["#0038B8", "#FFFFFF", "#0038B8"],
    field: "#0038B8",
  },
  {
    dialect: "Russian Street",
    speech: "Street Russian",
    lat: 55.75,
    lon: 37.62,
    local: "Здаров, чё как?",
    hello: "Здаров",
    lang: "ru",
    dir: "ltr",
    glow: ["#D52B1E", "#FFFFFF", "#0039A6"],
    field: "#D52B1E",
  },
  {
    dialect: "Tokyo Gyaru",
    speech: "Casual Japanese",
    lat: 35.68,
    lon: 139.69,
    local: "やっほー！元気してた？",
    hello: "やっほー",
    lang: "ja",
    dir: "ltr",
    glow: ["#BC002D", "#FFFFFF", "#BC002D"],
    field: "#FFFFFF",
    fieldInk: "#BC002D",
  },
];

export type CityStop = StopSeed & {
  city: string;
  /** Text color on `field`. */
  ink: string;
  /** `glow`, with flag colors too dark to read on the night ground lifted in lightness. */
  display: [string, string, string];
  /** Every official color of the flag, for reference and tests. */
  flagColors: readonly string[];
};

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance of a `#rrggbb` color. */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Black or white, whichever reads better on `field`. */
export function inkOn(field: string): string {
  return contrast(field, "#000000") >= contrast(field, "#FFFFFF") ? "#000000" : "#FFFFFF";
}

/**
 * Navy and deep blues vanish on a near-black ground. For glows and display type only, raise
 * their lightness and keep the hue; every other color passes through untouched.
 */
export function liftForNight(hex: string, minLightness = 0.58): string {
  const [r, g, b] = channels(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (luminance(hex) >= 0.07 || max === min) return hex.toUpperCase();
  const d = max - min;
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  const c = (1 - Math.abs(2 * minLightness - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = minLightness - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r1)}${to(g1)}${to(b1)}`.toUpperCase();
}

const LABELS = new Map(DIALECTS.map((d) => [d.value, d.label]));

export const CITY_STOPS: CityStop[] = STOPS.map((s) => ({
  ...s,
  city: LABELS.get(s.dialect) ?? s.dialect,
  ink: s.fieldInk ?? inkOn(s.field),
  display: [liftForNight(s.glow[0]), liftForNight(s.glow[1]), liftForNight(s.glow[2])],
  flagColors: getCityThemeForDialect(s.dialect).flagColors,
}));
