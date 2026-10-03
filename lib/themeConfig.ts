/**
 * Per-city theme = the city's full flag palette, split into roles so every flag color shows at once.
 *
 * Roles (all values are official flag colors — see `flagColors`):
 * - primary     readable on the dark UI: translated text, selected tab / segment, accent text, focus ring
 * - secondary   main button fill (Flip it, Upgrade, active mic)
 * - onSecondary text / icon on a `secondary` fill
 * - tertiary    glow, borders, highlights — may be a dark flag color (navy, dark red); never used for text
 *
 * Contrast (WCAG AA, 4.5:1) for primary-on-dark and onSecondary-on-secondary is enforced in
 * tests/themeConfig.test.ts. A flag color too dark to read (navy, black, dark red) is only ever
 * a fill, border or glow.
 */
export type FlagPalette = {
  /** Official flag colors. Every role below must be one of these (onSecondary may also be APP_INK). */
  flagColors: readonly string[];
  primary: string;
  secondary: string;
  onSecondary: string;
  tertiary: string;
};

export type CityThemeTokens = FlagPalette & {
  bg: { wide: string; long: string };
  micBall?: string | null;
};

/**
 * The app's own near-black background ink. Used as `onSecondary` only where no flag color reaches
 * AA on the button fill (Spain: red/yellow is 4.3:1 either way).
 */
export const APP_INK = "#0B0B0C";

/** Per-dialect hero images: `wide` (desktop), `long` (phone). Ball art aligned with micBall. */
const IMG = {
  london: { wide: "/images/england.jpeg", long: "/images/england.jpeg" },
  brooklyn: { wide: "/images/usa.jpeg", long: "/images/usa.jpeg" },
  kingston: { wide: "/images/jamaika.jpeg", long: "/images/jamaika.jpeg" },
  tokyo: { wide: "/images/japan.jpeg", long: "/images/japan.jpeg" },
  paris: { wide: "/images/france.jpeg", long: "/images/france.jpeg" },
  moscow: { wide: "/images/russia.jpeg", long: "/images/russia.jpeg" },
  mexico: { wide: "/images/mexico.jpeg", long: "/images/mexico.jpeg" },
  rio: { wide: "/images/brasil.jpeg", long: "/images/brasil.jpeg" },
  israel: { wide: "/images/israel.jpeg", long: "/images/israel.jpeg" },
  germany: { wide: "/images/germany.jpeg", long: "/images/germany.jpeg" },
  italy: { wide: "/images/italy.jpeg", long: "/images/italy.jpeg" },
  portugal: { wide: "/images/portugal.jpeg", long: "/images/portugal.jpeg" },
  spain: { wide: "/images/spain.jpeg", long: "/images/spain.jpeg" },
  arabic: { wide: "/images/arabic.jpeg", long: "/images/arabic.jpeg" },
} as const;

/** Official flag palettes with role assignments. Sources noted per flag. */
export const FLAG_PALETTES = {
  /** Jamaica — Jamaica Information Service spec: green, gold, black. */
  jamaica: {
    flagColors: ["#009B3A", "#FED100", "#000000"],
    primary: "#009B3A",
    secondary: "#FED100",
    onSecondary: "#000000",
    tertiary: "#009B3A",
  },
  /** United Kingdom — Union Flag, Pantone 186C red / 280C blue, white. */
  uk: {
    flagColors: ["#C8102E", "#012169", "#FFFFFF"],
    primary: "#FFFFFF",
    secondary: "#C8102E",
    onSecondary: "#FFFFFF",
    tertiary: "#012169",
  },
  /** United States — Old Glory Red / Old Glory Blue, white. */
  usa: {
    flagColors: ["#B22234", "#3C3B6E", "#FFFFFF"],
    primary: "#FFFFFF",
    secondary: "#B22234",
    onSecondary: "#FFFFFF",
    tertiary: "#3C3B6E",
  },
  /** Japan — Nisshōki, crimson disc on white. */
  japan: {
    flagColors: ["#BC002D", "#FFFFFF"],
    primary: "#FFFFFF",
    secondary: "#BC002D",
    onSecondary: "#FFFFFF",
    tertiary: "#BC002D",
  },
  /** France — Système de design de l'État: bleu France, blanc, rouge Marianne. */
  france: {
    flagColors: ["#000091", "#FFFFFF", "#E1000F"],
    primary: "#FFFFFF",
    secondary: "#E1000F",
    onSecondary: "#FFFFFF",
    tertiary: "#000091",
  },
  /** Russia — white, blue, red. */
  russia: {
    flagColors: ["#FFFFFF", "#0039A6", "#D52B1E"],
    primary: "#FFFFFF",
    secondary: "#D52B1E",
    onSecondary: "#FFFFFF",
    tertiary: "#0039A6",
  },
  /** Mexico — Pantone 3425C green, white, 186C red. */
  mexico: {
    flagColors: ["#006847", "#FFFFFF", "#CE1126"],
    primary: "#FFFFFF",
    secondary: "#006847",
    onSecondary: "#FFFFFF",
    tertiary: "#CE1126",
  },
  /** Brazil — green, yellow, blue, white. */
  brazil: {
    flagColors: ["#009C3B", "#FFDF00", "#002776", "#FFFFFF"],
    primary: "#009C3B",
    secondary: "#FFDF00",
    onSecondary: "#002776",
    tertiary: "#002776",
  },
  /** Israel — blue (#0038B8) on white. */
  israel: {
    flagColors: ["#0038B8", "#FFFFFF"],
    primary: "#FFFFFF",
    secondary: "#0038B8",
    onSecondary: "#FFFFFF",
    tertiary: "#0038B8",
  },
  /** Egypt — red, white, black, gold (Eagle of Saladin). */
  egypt: {
    flagColors: ["#CE1126", "#FFFFFF", "#000000", "#C09300"],
    primary: "#FFFFFF",
    secondary: "#C09300",
    onSecondary: "#000000",
    tertiary: "#CE1126",
  },
  /** Spain — Real Decreto 2964/1981 / Manual de identidad: rojo, gualda. */
  spain: {
    flagColors: ["#AA151B", "#F1BF00"],
    primary: "#F1BF00",
    secondary: "#F1BF00",
    onSecondary: APP_INK,
    tertiary: "#AA151B",
  },
  /** Germany — Bundesregierung: schwarz, rot, gold. */
  germany: {
    flagColors: ["#000000", "#DD0000", "#FFCE00"],
    primary: "#FFCE00",
    secondary: "#FFCE00",
    onSecondary: "#000000",
    tertiary: "#DD0000",
  },
  /** Italy — Presidenza del Consiglio: fern green, bright white, flame scarlet. */
  italy: {
    flagColors: ["#009246", "#F4F5F0", "#CE2B37"],
    primary: "#F4F5F0",
    secondary: "#CE2B37",
    onSecondary: "#F4F5F0",
    tertiary: "#009246",
  },
  /** Portugal — green, red, yellow (armillary sphere). */
  portugal: {
    flagColors: ["#006600", "#FF0000", "#FFFF00"],
    primary: "#FFFF00",
    secondary: "#006600",
    onSecondary: "#FFFF00",
    tertiary: "#FF0000",
  },
  /** Saudi Arabia — green, white. */
  saudi: {
    flagColors: ["#006C35", "#FFFFFF"],
    primary: "#FFFFFF",
    secondary: "#006C35",
    onSecondary: "#FFFFFF",
    tertiary: "#006C35",
  },
} as const satisfies Record<string, FlagPalette>;

const P = FLAG_PALETTES;

/** Premium dialects + standard languages: flag palette + optional mic ball art path. */
export const CITY_THEME_BY_DIALECT_ID: Record<string, CityThemeTokens> = {
  "English (Standard)": { ...P.usa, bg: IMG.brooklyn, micBall: "/images/usa.jpeg" },
  Spanish: { ...P.spain, bg: IMG.spain, micBall: "/images/spain.jpeg" },
  French: { ...P.france, bg: IMG.paris, micBall: "/images/france.jpeg" },
  German: { ...P.germany, bg: IMG.germany, micBall: "/images/germany.jpeg" },
  Italian: { ...P.italy, bg: IMG.italy, micBall: "/images/italy.jpeg" },
  Russian: { ...P.russia, bg: IMG.moscow, micBall: "/images/russia.jpeg" },
  Portuguese: { ...P.portugal, bg: IMG.portugal, micBall: "/images/portugal.jpeg" },
  Japanese: { ...P.japan, bg: IMG.tokyo, micBall: "/images/japan.jpeg" },
  "Hebrew (Standard)": { ...P.israel, bg: IMG.israel, micBall: "/images/israel.jpeg" },
  Arabic: { ...P.saudi, bg: IMG.arabic, micBall: "/images/arabic.jpeg" },
  "Tokyo Gyaru": { ...P.japan, bg: IMG.tokyo, micBall: "/images/japan.jpeg" },
  "Russian Street": { ...P.russia, bg: IMG.moscow, micBall: "/images/russia.jpeg" },
  "Mexico City Barrio": { ...P.mexico, bg: IMG.mexico, micBall: "/images/mexico.jpeg" },
  "Rio Favela": { ...P.brazil, bg: IMG.rio, micBall: "/images/brasil.jpeg" },
  "Jamaican Patois": { ...P.jamaica, bg: IMG.kingston, micBall: "/images/jamaika.jpeg" },
  "New York Brooklyn": { ...P.usa, bg: IMG.brooklyn, micBall: "/images/usa.jpeg" },
  "Paris Banlieue": { ...P.france, bg: IMG.paris, micBall: "/images/france.jpeg" },
  "Israeli Street": { ...P.israel, bg: IMG.israel, micBall: "/images/israel.jpeg" },
  "Arabic Egyptian": { ...P.egypt, bg: IMG.arabic, micBall: "/images/arabic.jpeg" },
  "Spanish Madrid": { ...P.spain, bg: IMG.spain, micBall: "/images/spain.jpeg" },
  "London Roadman": { ...P.uk, bg: IMG.london, micBall: "/images/england.jpeg" },
};

/** Neutral gray palette for unknown output ids (no flag). */
const NEUTRAL_PALETTE: FlagPalette = {
  flagColors: [],
  primary: "#888888",
  secondary: "#888888",
  onSecondary: APP_INK,
  tertiary: "#888888",
};

/** Fallback for unknown output languages — generic abstract hero. */
const STANDARD_BG_PLACEHOLDER = IMG.tokyo;

export const DEFAULT_DIALECT_ID = "Jamaican Patois";

export function getCityThemeForDialect(dialectId: string): CityThemeTokens {
  return CITY_THEME_BY_DIALECT_ID[dialectId] ?? { ...NEUTRAL_PALETTE, bg: STANDARD_BG_PLACEHOLDER, micBall: null };
}
