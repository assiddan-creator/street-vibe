/** Glossy translucent controls — Tailwind theme tokens (see tailwind.config.ts). */

import type { CSSProperties } from "react";
import type { FlagPalette } from "@/lib/themeConfig";

/** Hex alpha for the thin flag outline on every control: resting vs selected / action. */
const OUTLINE_ALPHA = "59"; // ~35%
const OUTLINE_ALPHA_SELECTED = "cc"; // ~80%

function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * `tertiary` for outlines, unless it is too dark to show as a 1px line on black
 * (UK / France navy, Brazil blue) — then the palette's `secondary` instead.
 */
export function visibleTertiary(p: Pick<FlagPalette, "secondary" | "tertiary">): string {
  return relativeLuminance(p.tertiary) < 0.03 ? p.secondary : p.tertiary;
}

/** Thin 1px flag-colored outline. Same thickness everywhere; selected is only more opaque. */
export function flagOutline(color: string, selected = false): CSSProperties {
  return { borderWidth: 1, borderStyle: "solid", borderColor: `${color}${selected ? OUTLINE_ALPHA_SELECTED : OUTLINE_ALPHA}` };
}

/**
 * Subtle flag-tinted button: dark glass fill, thin `secondary` border, readable `secondaryText`,
 * faint `tertiary` glow. Color is a hint, never a solid block (the flag art is the only block).
 */
export function subtleButtonStyle(p: Pick<FlagPalette, "secondary" | "secondaryText" | "tertiary">): CSSProperties {
  return {
    backgroundColor: "rgba(0,0,0,0.35)",
    border: `1px solid ${p.secondary}${OUTLINE_ALPHA_SELECTED}`,
    color: p.secondaryText,
    boxShadow: `0 0 18px -10px ${p.tertiary}`,
  };
}

export const THEME_GLASS_ICON_BTN =
  "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border-2 border-themeButtonBorder bg-themeButton/10 backdrop-blur-sm text-white shadow-glow-theme transition-all hover:bg-themeButton/20 active:scale-[0.98]";

export const THEME_FLIP_BTN =
  "w-full rounded-lg border-2 border-themeButtonBorder bg-themeButton/10 py-2 text-center text-xs font-semibold text-white shadow-glow-theme backdrop-blur-sm transition-all enabled:active:scale-[0.98] hover:bg-themeButton/20 disabled:opacity-60";

export const THEME_LINK_PILL =
  "flex w-full items-center justify-center rounded-lg border-2 border-themeButtonBorder bg-themeButton/10 py-2 text-center text-xs font-semibold text-white shadow-glow-theme backdrop-blur-sm transition-all hover:bg-themeButton/20";

export const THEME_MIC_IDLE =
  "border-2 border-themeButtonBorder bg-themeButton/10 backdrop-blur-sm text-white shadow-glow-theme hover:bg-themeButton/20";

export const THEME_NAV_PILL =
  "inline-flex w-fit items-center rounded-full border-2 border-themeButtonBorder bg-themeButton/10 px-2.5 py-1 text-[10px] font-semibold text-white shadow-glow-theme backdrop-blur-sm transition-all hover:bg-themeButton/20";

export const THEME_PLAY_BTN =
  "inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-themeButtonBorder bg-themeButton/10 px-2 py-0.5 text-[10px] font-semibold text-white shadow-glow-theme backdrop-blur-sm transition-all enabled:active:scale-[0.98] hover:bg-themeButton/20 disabled:cursor-not-allowed disabled:opacity-45";

/** Shared glass surfaces for selects, inputs, and output cards. */
export const GLASS_SELECT =
  "w-full rounded-lg border border-white/10 bg-black/30 backdrop-blur-md text-white transition-[border-color,box-shadow] duration-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0";

export const GLASS_SELECT_COMPACT =
  "w-full max-w-[min(100%,280px)] rounded-lg border border-white/10 bg-black/30 backdrop-blur-md text-white transition-[border-color,box-shadow] duration-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0";

export const GLASS_INPUT =
  "w-full rounded-lg border border-white/10 bg-black/30 backdrop-blur-md px-3 py-2.5 text-sm text-white placeholder:text-white/55 transition-[box-shadow,border-color] duration-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0 read-only:opacity-95";

/** Scrolls vertically when tall; horizontal overflow visible so RTL / long lines wrap instead of clipping (see `min-w-0` on card + text blocks). */
export const GLASS_OUTPUT_CARD =
  "output-card-scroll min-w-0 max-w-full overflow-y-auto overflow-x-visible rounded-2xl border border-white/5 bg-white/5 p-2.5 shadow-none backdrop-blur-2xl transition-[border-color,box-shadow] duration-500 ease-in-out";

export const GLASS_DUO_CARD = "rounded-xl border border-white/10 bg-black/30 backdrop-blur-md p-1.5";
