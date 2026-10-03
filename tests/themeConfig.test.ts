/**
 * Per-city flag palettes: only flag colors, every flag color has a role, WCAG AA for every text pair.
 *
 *     npm test
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { APP_INK, CITY_THEME_BY_DIALECT_ID, FLAG_PALETTES, getCityThemeForDialect } from "../lib/themeConfig";
import { DIALECT_THEMES, OUTPUT_PREMIUM_OPTIONS, OUTPUT_STANDARD_OPTIONS, resolveTheme } from "../lib/streetVibeTheme";
import { dialectThemeCssVars } from "../lib/applyDialectTheme";

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `top` at `alpha` composited over opaque `bottom`. */
function over(top: string, alpha: number, bottom: string): string {
  const t = rgb(top);
  const b = rgb(bottom);
  return `#${t.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, "0")).join("")}`;
}

const AA = 4.5;
const PAGE = "#000000"; // CityThemeProvider ground
const CARD = over("#FFFFFF", 0.05, PAGE); // bg-white/5 glass cards

const ALL_OUTPUT_IDS = [...OUTPUT_PREMIUM_OPTIONS, ...OUTPUT_STANDARD_OPTIONS].map((o) => o.value);

describe("flag palettes", () => {
  test("every selectable output dialect has a flag palette", () => {
    for (const id of ALL_OUTPUT_IDS) {
      assert.ok(CITY_THEME_BY_DIALECT_ID[id], `missing palette for ${id}`);
    }
    for (const t of DIALECT_THEMES) {
      assert.ok(CITY_THEME_BY_DIALECT_ID[t.id], `missing palette for ${t.id}`);
    }
  });

  for (const [name, p] of Object.entries(FLAG_PALETTES)) {
    describe(name, () => {
      const flag = p.flagColors.map((c) => c.toUpperCase());
      const inFlag = (c: string) => flag.includes(c.toUpperCase());

      test("roles use only flag colors (onSecondary may be the app ink)", () => {
        assert.ok(inFlag(p.primary), `primary ${p.primary}`);
        assert.ok(inFlag(p.secondary), `secondary ${p.secondary}`);
        assert.ok(inFlag(p.tertiary), `tertiary ${p.tertiary}`);
        assert.ok(inFlag(p.onSecondary) || p.onSecondary === APP_INK, `onSecondary ${p.onSecondary}`);
      });

      test("every non-white flag color has a role", () => {
        const used = [p.primary, p.secondary, p.onSecondary, p.tertiary].map((c) => c.toUpperCase());
        for (const c of flag) {
          if (luminance(c) > 0.85) continue; // white is the app's neutral text everywhere
          assert.ok(used.includes(c), `${c} unused`);
        }
      });

      test("primary text passes AA on the page, cards and its own selected-tab tint", () => {
        const tab = over(p.primary, 0x24 / 255, CARD);
        const ctaBox = over(p.tertiary, 0x12 / 255, PAGE);
        for (const [surface, bg] of [["page", PAGE], ["card", CARD], ["selected tab", tab], ["CTA box", ctaBox]]) {
          const r = contrast(p.primary, bg);
          assert.ok(r >= AA, `${p.primary} on ${surface} ${bg}: ${r.toFixed(2)}`);
        }
      });

      test("button text passes AA on the button fill", () => {
        const r = contrast(p.onSecondary, p.secondary);
        assert.ok(r >= AA, `${p.onSecondary} on ${p.secondary}: ${r.toFixed(2)}`);
      });
    });
  }
});

describe("theme plumbing", () => {
  test("resolveTheme exposes the same palette as themeConfig", () => {
    for (const id of ALL_OUTPUT_IDS) {
      const t = resolveTheme(id);
      const c = getCityThemeForDialect(id);
      assert.deepEqual(
        [t.primary, t.secondary, t.onSecondary, t.tertiary],
        [c.primary, c.secondary, c.onSecondary, c.tertiary],
        id,
      );
    }
  });

  test("CSS vars map roles and legacy aliases", () => {
    const vars = dialectThemeCssVars(FLAG_PALETTES.brazil);
    assert.equal(vars["--theme-primary"], "#009C3B");
    assert.equal(vars["--theme-secondary"], "#FFDF00");
    assert.equal(vars["--theme-on-secondary"], "#002776");
    assert.equal(vars["--theme-tertiary"], "#002776");
    assert.equal(vars["--theme-secondary-rgb"], "255 223 0");
    assert.equal(vars["--accent"], "#009C3B");
    assert.equal(vars["--theme-glow"], "#002776");
    assert.equal(vars["--theme-button"], "#FFDF00");
  });

  test("unknown dialect falls back to a neutral palette", () => {
    const t = getCityThemeForDialect("Klingon");
    assert.equal(t.flagColors.length, 0);
    assert.ok(contrast(t.primary, PAGE) >= AA);
    assert.ok(contrast(t.onSecondary, t.secondary) >= AA);
  });
});
