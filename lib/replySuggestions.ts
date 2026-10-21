/**
 * Reply helper ("Reply" mode): the model returns 3 sendable replies plus plain
 * meanings in the reader's language, so someone who doesn't speak the language
 * knows what they received and what they're about to send.
 */

export type ReplySuggestions = {
  incomingMeaning: string;
  replies: { text: string; meaning: string }[];
};

/** Pull the reply-helper JSON out of a model reply; falls back to plain lines (no meanings). */
export function parseReplyJson(raw: string): ReplySuggestions | null {
  if (!raw?.trim()) return null;
  const s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const o = JSON.parse(s.slice(start, end + 1)) as Record<string, unknown>;
      const replies = (Array.isArray(o.replies) ? o.replies : [])
        .map((r) => {
          const x = (r ?? {}) as Record<string, unknown>;
          const text = typeof r === "string" ? r : typeof x.text === "string" ? x.text : "";
          const meaning = typeof x.meaning === "string" ? x.meaning : "";
          return { text: text.trim(), meaning: meaning.trim().slice(0, 200) };
        })
        .filter((r) => r.text)
        .slice(0, 3);
      if (replies.length) {
        const incomingMeaning =
          typeof o.incoming_meaning === "string" ? o.incoming_meaning.trim().slice(0, 300) : "";
        return { incomingMeaning, replies };
      }
    } catch {
      /* fall through to plain lines */
    }
  }
  const lines = s
    .split(/\r?\n+/)
    .map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").replace(/^["'“”]+|["'“”]+$/g, "").trim())
    .filter((l) => l && !/^[{}\[\]"]/.test(l))
    .slice(0, 3);
  return lines.length ? { incomingMeaning: "", replies: lines.map((text) => ({ text, meaning: "" })) } : null;
}

/** Letters of the reader's script — a reply in another language must not contain them. */
const READER_SCRIPT: Record<string, RegExp> = {
  Hebrew: /[\u0590-\u05FF]/,
  Arabic: /[\u0600-\u06FF]/,
  Russian: /[\u0400-\u04FF]/,
};

/**
 * Drop replies that aren't sendable: leftover placeholders ("[Sua Cidade]") or words
 * leaked from the reader's language into a reply in another language. Null when
 * nothing usable is left.
 */
export function cleanReplySuggestions(
  parsed: ReplySuggestions | null,
  noteLanguage: string,
  replyLanguage: string
): ReplySuggestions | null {
  if (!parsed) return null;
  // replyLanguage is descriptive ("Hebrew (Israeli street / spoken Hebrew)"): same language → no leak check.
  const sameLanguage = replyLanguage.toLowerCase().startsWith(noteLanguage.toLowerCase());
  const leak = sameLanguage ? undefined : READER_SCRIPT[noteLanguage];
  const replies = parsed.replies.filter((r) => !/[[\]{}]|_{3,}/.test(r.text) && !(leak && leak.test(r.text)));
  return replies.length ? { ...parsed, replies } : null;
}
