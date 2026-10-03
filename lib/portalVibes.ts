import { FLAG_PALETTES } from "@/lib/themeConfig";

/**
 * Destinations shown inside the cinematic landing portal.
 *
 * Each vibe maps onto a real Street Vibe dialect (`dialectId`), so the portal is
 * a genuine preview of what the app can produce rather than decoration. Poster
 * art reuses the same flag-city images the translator already ships in
 * `public/images`. `video`, when set, points at an mp4/webm that the portal
 * samples frame-by-frame onto the canvas; with it unset the poster image is
 * drawn instead (screen-locked cover).
 */

export type PortalVibeStat = { label: string; value: string };

export type PortalVibe = {
  id: string;
  /** Headline shown over the portal window. */
  title: string;
  /** City caption under the headline. */
  city: string;
  /** Real dialect id from lib/dialects.ts this vibe previews. */
  dialectId: string;
  tagline: string;
  /** Sample line in the local voice. */
  sample: string;
  sampleDir: "ltr" | "rtl";
  stats: PortalVibeStat[];
  /** Poster image, used for the screen-locked cover draw. */
  poster: string;
  /** Optional background video (mp4/webm). Null = poster only. */
  video: string | null;
  /** Vivid flag colour used for the portal rim + active pill. */
  accent: string;
};

/** Product facts only — no invented metrics. */
const PRODUCT_STATS: PortalVibeStat[] = [
  { label: "street dialects", value: "11" },
  { label: "AI voice", value: "1 tap" },
  { label: "free a day", value: "10" },
];

export const PORTAL_VIBES: PortalVibe[] = [
  {
    id: "brooklyn",
    title: "Brooklyn Slang",
    city: "Brooklyn, NY",
    dialectId: "New York Brooklyn",
    tagline: "Deadass — nobody texts like New York.",
    sample: "Yo, that fit is bonkers, word.",
    sampleDir: "ltr",
    stats: PRODUCT_STATS,
    poster: "/images/usa.jpeg",
    video: null,
    accent: FLAG_PALETTES.usa.secondary,
  },
  {
    id: "london",
    title: "London Drill",
    city: "London, UK",
    dialectId: "London Roadman",
    tagline: "Mandem don't say hello. They say wagwan.",
    sample: "Yo fam, wagwan? Man's on road.",
    sampleDir: "ltr",
    stats: PRODUCT_STATS,
    poster: "/images/england.jpeg",
    video: null,
    accent: FLAG_PALETTES.uk.secondary,
  },
  {
    id: "tel-aviv",
    title: "Tel Aviv Street",
    city: "Tel Aviv, IL",
    dialectId: "Israeli Street",
    tagline: "Achi, sababa — not textbook Hebrew.",
    sample: "יאללה אחי, מה נשמע?",
    sampleDir: "rtl",
    stats: PRODUCT_STATS,
    poster: "/images/israel.jpeg",
    video: null,
    accent: FLAG_PALETTES.israel.secondary,
  },
  {
    id: "tokyo",
    title: "Tokyo Cyber Vibe",
    city: "Tokyo, JP",
    dialectId: "Tokyo Gyaru",
    tagline: "Gyaru slang, not polite keigo.",
    sample: "マジやばい！超かわいい〜",
    sampleDir: "ltr",
    stats: PRODUCT_STATS,
    poster: "/images/japan.jpeg",
    video: null,
    accent: FLAG_PALETTES.japan.secondary,
  },
];
