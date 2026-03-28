/**
 * Helpers for applying the active dialect accent as #RRGGBBAA (single-theme discipline).
 */

/** Append two hex digits of alpha to a 6-digit theme color. Returns `accent` unchanged if not `#RRGGBB`. */
export function themeAccentAlpha(accent: string, alphaHex: string): string {
  const t = accent.trim();
  if (!/^#[\da-fA-F]{6}$/.test(t)) return t;
  const a = alphaHex.replace(/^#/, "").slice(0, 2);
  return /^[\da-fA-F]{2}$/.test(a) ? `${t}${a}` : t;
}
