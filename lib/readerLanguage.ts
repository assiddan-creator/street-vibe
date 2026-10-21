/**
 * Language for explanations (slang notes, check verdicts, reply meanings): the
 * reader's own language — the "I speak" setting first, then the browser locale.
 * Hebrew speakers with an English browser used to get English notes.
 */
export function readerNoteLanguage(sourceLanguage: unknown, uiLocale: unknown): string {
  for (const tag of [sourceLanguage, uiLocale]) {
    if (typeof tag !== "string" || !tag.trim()) continue;
    const base = tag.trim().split(/[-_]/)[0].toLowerCase();
    try {
      const name = new Intl.DisplayNames(["en"], { type: "language" }).of(base);
      if (name && name.toLowerCase() !== base) return name;
    } catch {
      /* invalid tag — try the next one */
    }
  }
  return "English";
}

/** "Someone new" stays natural even when the intensity control says Street or Heavy. */
export function effectiveSlangLevel(level: number, context: unknown): number {
  return context === "new" ? Math.min(level, 1) : level;
}
