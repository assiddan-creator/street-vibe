/**
 * Native-script read-aloud transliteration: map translated line into the reader’s usual alphabet
 * (per source / UI language), not IPA.
 */

export type ReaderScript =
  | "hebrew"
  | "arabic"
  | "cyrillic"
  | "latin"
  | "cjk"
  | "japan"
  | "korea"
  | "other";

/** BCP-47 primary language → dominant script readers use for informal pronunciation notes. */
export function getReaderScriptCategory(bcp47: string): ReaderScript {
  const base = bcp47.split("-")[0]?.toLowerCase() ?? "";
  if (!base) return "other";
  if (["he", "yi"].includes(base)) return "hebrew";
  if (["ar", "fa", "ur", "ps", "dv", "ks"].includes(base)) return "arabic";
  if (["ru", "uk", "bg", "sr", "mk", "kk", "be", "ky", "tg", "mn"].includes(base)) return "cyrillic";
  if (base === "zh") return "cjk";
  if (base === "ja") return "japan";
  if (base === "ko") return "korea";
  return "latin";
}

function letterCount(text: string, re: RegExp): number {
  return (text.match(re) ?? []).length;
}

/** If the translation is already written mostly in the reader’s usual script, transliteration is redundant. */
export function translationRedundantForReader(translatedMain: string, readerBcp47: string): boolean {
  const stripped = translatedMain.replace(/\s+/g, "");
  if (!stripped) return true;

  const cat = getReaderScriptCategory(readerBcp47);

  switch (cat) {
    case "hebrew": {
      let he = 0;
      for (const ch of stripped) {
        if (/[\u0590-\u05FF]/.test(ch)) he++;
      }
      return he / stripped.length > 0.5;
    }
    case "arabic": {
      const ar = letterCount(stripped, /[\u0600-\u06FF\u0750-\u077F]/g);
      return ar / stripped.length > 0.5;
    }
    case "cyrillic": {
      const cy = letterCount(stripped, /[\u0400-\u04FF]/g);
      return cy / stripped.length > 0.5;
    }
    case "latin": {
      const lat = letterCount(stripped, /[A-Za-zÀ-ÿĀ-ž]/g);
      return lat / Math.max(stripped.length, 1) > 0.5;
    }
    case "cjk": {
      const cjk = letterCount(stripped, /[\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/g);
      return cjk / stripped.length > 0.45;
    }
    case "japan": {
      const jp = letterCount(stripped, /[\u3040-\u30FF\u3400-\u9FFF]/g);
      return jp / stripped.length > 0.45;
    }
    case "korea": {
      const ko = letterCount(stripped, /[\uAC00-\uD7AF]/g);
      return ko / stripped.length > 0.45;
    }
    default:
      return false;
  }
}

export function resolveEffectiveSourceLanguageForTransliteration(
  sourceLanguage?: string | null,
  uiLocale?: string | null
): string {
  const s = (sourceLanguage ?? "").trim();
  if (s) return s;
  const u = (uiLocale ?? "").trim();
  if (u) return u;
  return "en";
}

/** RTL layout for read-aloud block when reader language is typically RTL. */
export function isRtlReaderLanguage(bcp47: string): boolean {
  const b = bcp47.split("-")[0]?.toLowerCase() ?? "";
  return ["he", "ar", "fa", "ur", "ps", "dv", "yi", "ks"].includes(b);
}

/** Reject model slippage (English gloss, empty junk). */
export function looksLikePlausibleNativeTransliteration(s: string, readerBcp47: string): boolean {
  const t = s.trim();
  if (t.length < 2) return false;
  if (/^(note|translation|here|the\s+line)/i.test(t.slice(0, 40))) return false;

  const cat = getReaderScriptCategory(readerBcp47);
  const letters = t.replace(/\s/g, "");

  switch (cat) {
    case "hebrew": {
      const he = letterCount(letters, /[\u0590-\u05FF]/g);
      const lat = letterCount(letters, /[A-Za-z]/g);
      return he >= 3 && he >= lat;
    }
    case "arabic": {
      const ar = letterCount(letters, /[\u0600-\u06FF]/g);
      const lat = letterCount(letters, /[A-Za-z]/g);
      return ar >= 3 && ar >= lat;
    }
    case "cyrillic": {
      const cy = letterCount(letters, /[\u0400-\u04FF]/g);
      return cy >= 3 && cy / Math.max(letters.length, 1) > 0.35;
    }
    case "latin": {
      const lat = letterCount(letters, /[A-Za-zÀ-ÿĀ-ž]/g);
      return lat >= 3 && lat / Math.max(letters.length, 1) > 0.4;
    }
    case "cjk":
    case "japan":
    case "korea": {
      const cjk = letterCount(letters, /[\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/g);
      return cjk >= 2 && cjk / Math.max(letters.length, 1) > 0.25;
    }
    default:
      return t.length >= 2;
  }
}

/**
 * When to show Hebrew labels / RTL on the main result card (מקור / תרגום).
 * Independent of phonetic transliteration, which is now offered for all reader languages.
 */
export function shouldOfferHebrewTransliteration(
  sourceLanguage?: string | null,
  uiLocale?: string | null
): boolean {
  const s = (sourceLanguage ?? "").toLowerCase().trim();
  const u = (uiLocale ?? "").toLowerCase().trim();
  return s.startsWith("he") || u.startsWith("he");
}

export function isPrimarilyHebrewScript(s: string): boolean {
  return translationRedundantForReader(s, "he");
}
