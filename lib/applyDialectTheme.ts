import type { FlagPalette } from "@/lib/themeConfig";

/** Convert #RRGGBB to space-separated R G B for Tailwind alpha modifiers. */
function hexToRgbChannels(hex: string): string {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return "255 255 255";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return "255 255 255";
  return `${r} ${g} ${b}`;
}

/** CSS custom properties for a flag palette (role tokens + legacy aliases). */
export function dialectThemeCssVars(tokens: FlagPalette): Record<string, string> {
  return {
    "--theme-primary": tokens.primary,
    "--theme-secondary": tokens.secondary,
    "--theme-on-secondary": tokens.onSecondary,
    "--theme-tertiary": tokens.tertiary,
    "--theme-primary-rgb": hexToRgbChannels(tokens.primary),
    "--theme-secondary-rgb": hexToRgbChannels(tokens.secondary),
    "--theme-tertiary-rgb": hexToRgbChannels(tokens.tertiary),
    // Legacy names: glow + borders = tertiary, buttons = secondary, readable accent = primary.
    "--theme-glow": tokens.tertiary,
    "--theme-button": tokens.secondary,
    "--theme-button-border": tokens.tertiary,
    "--theme-button-rgb": hexToRgbChannels(tokens.secondary),
    "--theme-button-border-rgb": hexToRgbChannels(tokens.tertiary),
    "--accent": tokens.primary,
  };
}

/** Push dialect tokens to :root for Tailwind CSS variables and legacy --accent. */
export function applyDialectThemeToDocument(tokens: FlagPalette): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const [name, value] of Object.entries(dialectThemeCssVars(tokens))) {
    root.style.setProperty(name, value);
  }
}
