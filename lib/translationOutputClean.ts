/**
 * Strip model meta / commentary / accidental glossary leakage from the main
 * translation block (the part before |||). Used for UI + Hebrew transliteration.
 */

const LEADING_META_LINE =
  /^\s*(note|translation|output|result|meaning|context|interpretation|here'?s|here is|literal(ly)?|gloss|dictionary)\s*[:.—\-]/i;

const LINE_META_START =
  /^\s*(\(|note:|translation:|meaning:|context:|interpretation:|very\s+direct|this\s+implies|this\s+means|in\s+this\s+context|the\s+phrase|street\s+slang|i\s+would\s+translate|i'?d\s+translate)/i;

/** Paragraphs that are clearly English-only commentary (not sendable target text). */
function isLikelyEnglishMetaParagraph(p: string): boolean {
  const t = p.trim();
  if (t.length < 12) return false;
  const sample = t.slice(0, 500);
  const asciiLetters = (sample.match(/[a-zA-Z]/g) ?? []).length;
  const nonLatinScript = (
    sample.match(/[\u0590-\u05FF\u0400-\u04FF\u0600-\u06FF\u3040-\u30FF\u4E00-\u9FFF]/g) ?? []
  ).length;
  if (nonLatinScript > 10) return false;
  if (asciiLetters < 18) return false;

  const lower = t.slice(0, 280).toLowerCase();
  const starters = [
    "very direct",
    "very casual",
    "this implies",
    "this means",
    "note that",
    "the phrase",
    "in this context",
    "literal translation",
    "interpretation:",
    "street slang",
    "here's a",
    "here is a",
    "i'd translate",
    "i would translate",
    "meaning:",
    "translation note",
    "context note",
    "direct translation",
  ];
  return starters.some((s) => lower.startsWith(s));
}

/** Remove obvious meta lines from the start/middle of the main block. */
function stripMetaLines(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const tr = line.trim();
    if (!tr) {
      if (out.length) out.push(line);
      continue;
    }
    if (LINE_META_START.test(tr)) continue;
    if (LEADING_META_LINE.test(tr) && out.length === 0) continue;
    out.push(line);
  }
  return out.join("\n").trim();
}

/** Drop trailing paragraphs that read as English commentary after the real message. */
function stripTrailingMetaParagraphs(text: string): string {
  const parts = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return text.trim();
  while (parts.length > 1 && isLikelyEnglishMetaParagraph(parts[parts.length - 1]!)) {
    parts.pop();
  }
  return parts.join("\n\n");
}

/** Cut at common separators models use for "message then note". */
function stripAfterSeparators(text: string): string {
  const separators = [
    /\n---+\s*\n/,
    /\n___+\s*\n/,
    /\n\*{3,}\s*\n/,
    /\nNOTE\s*\n/i,
    /\nMETA\s*\n/i,
  ];
  let t = text;
  for (const sep of separators) {
    const m = sep.exec(t);
    if (m && m.index > 0) {
      t = t.slice(0, m.index).trim();
    }
  }
  return t;
}

/**
 * Single public API: clean the pre-||| translation line for display + transliteration.
 */
export function cleanMainTranslationLine(raw: string): string {
  let t = raw.trim();
  if (!t) return t;

  t = stripAfterSeparators(t);
  t = stripMetaLines(t);
  t = stripTrailingMetaParagraphs(t);
  t = stripMetaLines(t);

  const out = t.trim();
  if (!out) {
    const first = raw
      .split(/\n/)
      .map((s) => s.trim())
      .find((line) => line.length > 0 && !LINE_META_START.test(line) && !LEADING_META_LINE.test(line));
    return first ?? raw.trim().split(/\n/)[0]?.trim() ?? "";
  }
  return out;
}
