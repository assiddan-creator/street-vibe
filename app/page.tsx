"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

type DialectTheme = {
  id: string;
  pillLabel: string;
  bg: string;
  accent: string;
  flag: string;
  city: string;
};

const DIALECT_THEMES: DialectTheme[] = [
  {
    id: "London Roadman",
    pillLabel: "London",
    bg: "#0d0d1a",
    accent: "#a78bfa",
    flag: "🇬🇧",
    city: "London",
  },
  {
    id: "Jamaican Patois",
    pillLabel: "Kingston",
    bg: "#0a1a0a",
    accent: "#4ade80",
    flag: "🇯🇲",
    city: "Kingston",
  },
  {
    id: "New York Brooklyn",
    pillLabel: "NYC",
    bg: "#1a0a0a",
    accent: "#f87171",
    flag: "🇺🇸",
    city: "Brooklyn",
  },
  {
    id: "Tokyo Gyaru",
    pillLabel: "Tokyo",
    bg: "#0a0f1a",
    accent: "#60a5fa",
    flag: "🇯🇵",
    city: "Tokyo",
  },
  {
    id: "Paris Banlieue",
    pillLabel: "Paris",
    bg: "#1a1400",
    accent: "#fbbf24",
    flag: "🇫🇷",
    city: "Paris",
  },
  {
    id: "Russian Street",
    pillLabel: "Moscow",
    bg: "#0f0f0f",
    accent: "#e2e8f0",
    flag: "🇷🇺",
    city: "Moscow",
  },
  {
    id: "Mumbai Hinglish",
    pillLabel: "Mumbai",
    bg: "#1a0f00",
    accent: "#fb923c",
    flag: "🇮🇳",
    city: "Mumbai",
  },
  {
    id: "Mexico City Barrio",
    pillLabel: "CDMX",
    bg: "#1a0a0f",
    accent: "#f472b6",
    flag: "🇲🇽",
    city: "Mexico City",
  },
  {
    id: "Rio Favela",
    pillLabel: "Rio",
    bg: "#001a0f",
    accent: "#34d399",
    flag: "🇧🇷",
    city: "Rio",
  },
];

export default function Home() {
  const [selectedDialectId, setSelectedDialectId] = useState(DIALECT_THEMES[0].id);
  const [inputText, setInputText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [dictionaryPills, setDictionaryPills] = useState<string[]>([]);

  const theme = useMemo(
    () => DIALECT_THEMES.find((t) => t.id === selectedDialectId) ?? DIALECT_THEMES[0],
    [selectedDialectId]
  );

  const hasOutput = originalText.trim().length > 0 || translatedText.trim().length > 0;

  const handleFlipIt = () => {
    setOriginalText(inputText);
    setTranslatedText("");
    setDictionaryPills([]);
  };

  const handleCopy = async () => {
    const text = translatedText.trim() || originalText.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const handleShare = async () => {
    const text = translatedText.trim() || originalText.trim();
    if (!text) return;
    try {
      if (navigator.share) {
        await navigator.share({ text, title: "StreetVibe" });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="min-h-screen transition-[background-color] duration-500 ease-in-out"
      style={{ backgroundColor: theme.bg }}
    >
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col px-4 pb-8 pt-4">
        {/* Top bar */}
        <header className="mb-4 flex items-center justify-between gap-3">
          <span className="text-xl font-bold tracking-tight text-white transition-colors duration-500">
            StreetVibe
          </span>
          <div
            className="flex max-w-[55%] items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-[border-color,background-color,color] duration-500 ease-in-out"
            style={{
              borderColor: `${theme.accent}55`,
              backgroundColor: `${theme.accent}18`,
              color: theme.accent,
            }}
          >
            <span className="shrink-0 text-lg leading-none" aria-hidden>
              {theme.flag}
            </span>
            <span className="truncate font-medium">{theme.city}</span>
          </div>
        </header>

        {/* Dialect pills */}
        <div className="mb-5 -mx-1">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {DIALECT_THEMES.map((d) => {
              const selected = d.id === selectedDialectId;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDialectId(d.id)}
                  className="shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-500 ease-in-out"
                  style={
                    selected
                      ? {
                          borderColor: d.accent,
                          backgroundColor: `${d.accent}33`,
                          color: d.accent,
                          boxShadow: `0 0 0 1px ${d.accent}40`,
                        }
                      : {
                          borderColor: `${d.accent}35`,
                          backgroundColor: `${d.accent}12`,
                          color: `${d.accent}aa`,
                        }
                  }
                >
                  {d.pillLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Output card */}
        <section className="mb-5 flex-1">
          <div
            className="rounded-2xl border p-4 shadow-lg transition-[border-color,background-color] duration-500 ease-in-out"
            style={{
              borderColor: `${theme.accent}40`,
              backgroundColor: `${theme.accent}0d`,
            }}
          >
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">Original</p>
            <p className="mb-6 min-h-[2.5rem] text-sm leading-relaxed text-white/45 transition-colors duration-500">
              {hasOutput ? (
                originalText.trim() || "—"
              ) : (
                <span className="italic">Your original line will show here after you flip it.</span>
              )}
            </p>

            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">Street</p>
            <div className="min-h-[3rem] text-xl font-bold leading-snug transition-colors duration-500">
              {hasOutput ? (
                translatedText.trim() ? (
                  <p style={{ color: theme.accent }}>{translatedText}</p>
                ) : (
                  <p className="text-base font-normal italic text-white/35">
                    Translation lands here — coming next.
                  </p>
                )
              ) : (
                <p className="text-base font-normal italic text-white/35">
                  Flip a line to see the vibe in {theme.city}.
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {dictionaryPills.length > 0 ? (
                dictionaryPills.map((pill, i) => (
                  <span
                    key={`${pill}-${i}`}
                    className="rounded-full border px-3 py-1 text-xs font-medium transition-all duration-500"
                    style={{
                      borderColor: `${theme.accent}55`,
                      color: theme.accent,
                      backgroundColor: `${theme.accent}15`,
                    }}
                  >
                    {pill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-white/30">Slang dictionary chips will appear here.</span>
              )}
            </div>
          </div>
        </section>

        {/* Input + Flip */}
        <div className="mb-8 flex flex-col gap-3">
          <div style={{ "--accent": theme.accent } as CSSProperties}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Say it plain…"
              className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-base text-white placeholder:text-white/35 transition-[box-shadow,border-color] duration-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0"
            />
          </div>
          <button
            type="button"
            onClick={handleFlipIt}
            className="w-full rounded-xl py-3.5 text-center text-base font-semibold text-black transition-[background-color,box-shadow] duration-500 ease-in-out active:scale-[0.98]"
            style={{
              backgroundColor: theme.accent,
              boxShadow: `0 4px 20px ${theme.accent}44`,
            }}
          >
            Flip it
          </button>
        </div>

        {/* Mic + actions */}
        <div className="mt-auto flex items-end justify-center gap-4 pb-2">
          <div className="flex flex-col items-center">
            <button
              type="button"
              aria-label="Tap to speak"
              className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full shadow-xl transition-all duration-500 ease-in-out active:scale-95"
              style={{
                background: `linear-gradient(145deg, ${theme.accent}ee, ${theme.accent}88)`,
                boxShadow: `0 8px 28px ${theme.accent}55`,
              }}
            >
              <svg className="h-9 w-9 text-black/90" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14C5.52 16.16 8.53 19 12 19s6.48-2.84 6.93-6.86c.09-.6-.39-1.14-1-1.14z" />
              </svg>
            </button>
            <span className="mt-2 text-xs text-white/50">tap to speak</span>
          </div>

          <div className="flex gap-2 pb-7">
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/80 transition-[border-color,color,background-color] duration-500 hover:bg-white/10"
              style={{ borderColor: `${theme.accent}44` }}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/80 transition-[border-color,color,background-color] duration-500 hover:bg-white/10"
              style={{ borderColor: `${theme.accent}44` }}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
