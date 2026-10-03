import { DIALECTS } from "./dialects";
import { getCityThemeForDialect } from "./themeConfig";

/**
 * Landing-page "city voyage" scenes: one per street dialect, in the app's dialect order.
 * Each scene carries the city's flag palette, its flag-ball art and a tourist → local example.
 */
export type CityScene = {
  /** Dialect value as used by the app (`lib/dialects.ts`). */
  dialect: string;
  city: string;
  image: string;
  primary: string;
  secondary: string;
  tertiary: string;
  /** Stiff, textbook phrasing a visitor would write. */
  tourist: string;
  /** The same idea the way a local would actually send it. */
  local: string;
};

/** Tourist → local examples, keyed by dialect value. */
export const CITY_LINES: Record<string, { tourist: string; local: string }> = {
  "Jamaican Patois": {
    tourist: "Hello my friend, how are you doing today?",
    local: "Wah gwaan, mi bredda? Yuh good?",
  },
  "London Roadman": {
    tourist: "That party last night was really very good.",
    local: "Fam, that party last night was proper live, innit",
  },
  "New York Brooklyn": {
    tourist: "Alright, I will see you later, my friend.",
    local: "Aight say less, I'll catch you later, B",
  },
  "Tokyo Gyaru": {
    tourist: "これはとてもかわいいですね。",
    local: "え、これガチでかわいすぎなんだけど！",
  },
  "Paris Banlieue": {
    tourist: "C'est vraiment très bien, je suis impressionné.",
    local: "Wesh, c'est trop lourd frérot, j'suis choqué",
  },
  "Russian Street": {
    tourist: "Здравствуйте, как у вас дела?",
    local: "Здаров, чё как?",
  },
  "Mexico City Barrio": {
    tourist: "¿Le gustaría salir esta noche, amigo?",
    local: "¿Qué onda güey, salimos hoy o qué?",
  },
  "Rio Favela": {
    tourist: "Olá, como você está hoje?",
    local: "Coé, mermão, suave?",
  },
  "Israeli Street": {
    tourist: "שלום, מה שלומך היום?",
    local: "אחי, מה קורה? הכל סבבה?",
  },
  "Arabic Egyptian": {
    tourist: "مرحبًا، كيف حالك اليوم؟",
    local: "إزيك يا باشا؟ عامل إيه؟",
  },
  "Spanish Madrid": {
    tourist: "Esto me gusta muchísimo, es muy bueno.",
    local: "Tío, esto mola mazo",
  },
};

export const CITY_SCENES: CityScene[] = DIALECTS.filter((d) => d.group === "street").map((d) => {
  const theme = getCityThemeForDialect(d.value);
  const lines = CITY_LINES[d.value] ?? { tourist: "", local: "" };
  return {
    dialect: d.value,
    city: d.label,
    image: theme.micBall ?? theme.bg.wide,
    primary: theme.primary,
    secondary: theme.secondary,
    tertiary: theme.tertiary,
    tourist: lines.tourist,
    local: lines.local,
  };
});

/** Widths must be in Next's default deviceSizes, and q=75 in the default `images.qualities`. */
export const CITY_IMAGE_WIDTHS = [640, 1080, 1920] as const;

/** Optimized (webp/avif) URL for a local image via the Next image optimizer. */
export function cityImageUrl(src: string, width: number): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}

export function cityImageSrcSet(src: string): string {
  return CITY_IMAGE_WIDTHS.map((w) => `${cityImageUrl(src, w)} ${w}w`).join(", ");
}
