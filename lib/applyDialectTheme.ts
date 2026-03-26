import type { CityThemeTokens } from "@/lib/themeConfig";

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

/** Push dialect tokens to :root for Tailwind CSS variables and legacy --accent. */
export function applyDialectThemeToDocument(tokens: CityThemeTokens): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--theme-glow", tokens.glow);
  root.style.setProperty("--theme-button", tokens.button);
  root.style.setProperty("--theme-button-border", tokens.buttonBorder);
  root.style.setProperty("--theme-button-rgb", hexToRgbChannels(tokens.button));
  root.style.setProperty("--theme-button-border-rgb", hexToRgbChannels(tokens.buttonBorder));
  root.style.setProperty("--accent", tokens.accent);
}
