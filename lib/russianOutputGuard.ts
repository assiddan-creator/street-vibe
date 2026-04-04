/**
 * Post-process Russian Street model output: Cyrillic-only dictionary lines, minimal safe fallback.
 */

const ENGLISH_GLOSS_PATTERN =
  /\b(the|and|send|from|when|your|informal|casual|for|literally|what|who|guess|favorite|favourite|tell|mine|yours|drop|hooked|slang|option|note|meaning|example|variants|inform)\b/i;

function latinLetterCount(s: string): number {
  return (s.match(/[A-Za-z]/g) ?? []).length;
}

function cyrillicLetterCount(s: string): number {
  return (s.match(/[А-Яа-яЁё]/g) ?? []).length;
}

function looksTruncatedLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 4) return false;
  if (/[(\u2013\u2014,/]$/.test(t)) return true;
  if (t.includes("(") && !t.includes(")")) return true;
  return false;
}

function lineIsPollutedGloss(line: string): boolean {
  const t = line.trim();
  if (!t || t === "—" || t === "-") return false;
  if (ENGLISH_GLOSS_PATTERN.test(t)) return true;
  const L = latinLetterCount(t);
  const C = cyrillicLetterCount(t);
  if (L >= 4 && C === 0) return true;
  if (L > 8 && L > C * 1.5) return true;
  if (looksTruncatedLine(t)) return true;
  return false;
}

/**
 * If any gloss line is English-heavy, mixed, or truncated, replace the whole dictionary with a single em dash.
 */
export function sanitizeRussianStreetDictionary(dictRaw: string): string {
  const trimmed = dictRaw.trim();
  if (!trimmed) return "";

  const lines = trimmed
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (lineIsPollutedGloss(line)) return "—";
  }

  return lines.join("\n");
}
