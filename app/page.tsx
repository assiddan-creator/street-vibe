"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

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

type StandardOption = { value: string; label: string; flag: string };

const STANDARD_LANGUAGES: StandardOption[] = [
  { value: "English (Standard)", label: "English", flag: "🇺🇸" },
  { value: "Spanish", label: "Spanish", flag: "🇪🇸" },
  { value: "French", label: "French", flag: "🇫🇷" },
  { value: "German", label: "German", flag: "🇩🇪" },
  { value: "Italian", label: "Italian", flag: "🇮🇹" },
  { value: "Russian", label: "Russian", flag: "🇷🇺" },
  { value: "Portuguese", label: "Portuguese", flag: "🇵🇹" },
  { value: "Japanese", label: "Japanese", flag: "🇯🇵" },
  { value: "Arabic", label: "Arabic", flag: "🇸🇦" },
  { value: "Hebrew (Standard)", label: "Hebrew", flag: "🇮🇱" },
];

const OUTPUT_PREMIUM_OPTIONS: { value: string; label: string }[] = [
  { value: "Jamaican Patois", label: "🇯🇲 Jamaican Patois" },
  { value: "London Roadman", label: "🇬🇧 London Roadman" },
  { value: "New York Brooklyn", label: "🗽 New York Brooklyn" },
  { value: "Tokyo Gyaru", label: "🇯🇵 Tokyo Gyaru" },
  { value: "Paris Banlieue", label: "🇫🇷 Paris Banlieue" },
  { value: "Russian Street", label: "🇷🇺 Russian Street" },
  { value: "Mumbai Hinglish", label: "🇮🇳 Mumbai Hinglish" },
  { value: "Mexico City Barrio", label: "🇲🇽 Mexico City Barrio" },
  { value: "Rio Favela", label: "🇧🇷 Rio Favela" },
];

const OUTPUT_STANDARD_OPTIONS: { value: string; label: string }[] = [
  { value: "English (Standard)", label: "🇺🇸 English" },
  { value: "Spanish", label: "🇪🇸 Spanish" },
  { value: "French", label: "🇫🇷 French" },
  { value: "German", label: "🇩🇪 German" },
  { value: "Italian", label: "🇮🇹 Italian" },
  { value: "Russian", label: "🇷🇺 Russian" },
  { value: "Portuguese", label: "🇵🇹 Portuguese" },
  { value: "Japanese", label: "🇯🇵 Japanese" },
  { value: "Arabic", label: "🇸🇦 Arabic" },
  { value: "Hebrew (Standard)", label: "🇮🇱 Hebrew" },
];

const NEUTRAL_BG = "#111111";
const NEUTRAL_ACCENT = "#888888";

const LOADING_MESSAGES: Record<string, string> = {
  "London Roadman": "Hold tight bruv, mandem is translating...",
  "Jamaican Patois": "Hold a vibes, mi a cook di patwa...",
  "New York Brooklyn": "Hold up my guy, cooking up the heat...",
  "Tokyo Gyaru": "Chotto matte! Cooking something yabai...",
  "Paris Banlieue": "Attends 2s gros, je prépare une dinguerie...",
  "Russian Street": "Sekundu bratan, shcha vsyo budet...",
  "Mumbai Hinglish": "Arey bhai, zara ruk na public...",
  "Mexico City Barrio": "Aguanta tantito, wey...",
  "Rio Favela": "Segura aí, mano...",
};

const STANDARD_LOADING = "Translating…";

function parseDictionaryPills(raw: string): string[] {
  const cleaned = raw.replace(/^dictionary:\s*/i, "").trim();
  if (!cleaned) return [];
  return cleaned
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const DICT_SEPARATOR = "|||";

/** Split API output on the first `|||` only so translated text can contain that sequence. */
function splitTranslationAndDictionary(fullText: string): { translated: string; dictRaw: string } {
  const trimmed = fullText.trim();
  const idx = trimmed.indexOf(DICT_SEPARATOR);
  if (idx === -1) {
    return { translated: trimmed, dictRaw: "" };
  }
  return {
    translated: trimmed.slice(0, idx).trim(),
    dictRaw: trimmed.slice(idx + DICT_SEPARATOR.length).trim(),
  };
}

const INPUT_LANGUAGES = [
  { value: "he-IL", label: "עברית / Hebrew" },
  { value: "en-US", label: "English" },
  { value: "ru-RU", label: "Русский / Russian" },
  { value: "ar-SA", label: "العربية / Arabic" },
  { value: "es-ES", label: "Español / Spanish" },
] as const;

function resolveTheme(outputLang: string): {
  bg: string;
  accent: string;
  flag: string;
  city: string;
} {
  const premium = DIALECT_THEMES.find((t) => t.id === outputLang);
  if (premium) {
    return { bg: premium.bg, accent: premium.accent, flag: premium.flag, city: premium.city };
  }
  const std = STANDARD_LANGUAGES.find((o) => o.value === outputLang);
  return {
    bg: NEUTRAL_BG,
    accent: NEUTRAL_ACCENT,
    flag: std?.flag ?? "🌐",
    city: std?.label ?? outputLang,
  };
}

function isPremiumSlang(value: string): boolean {
  return DIALECT_THEMES.some((t) => t.id === value);
}

export default function Home() {
  const [outputLang, setOutputLang] = useState("Jamaican Patois");
  const [inputLanguage, setInputLanguage] = useState("he-IL");
  const [inputText, setInputText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [dictionaryPills, setDictionaryPills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = resolveTheme(outputLang);

  const loadingMessage =
    isPremiumSlang(outputLang) && LOADING_MESSAGES[outputLang]
      ? LOADING_MESSAGES[outputLang]
      : STANDARD_LOADING;

  const translateText = async (text: string, dialect: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setOriginalText(trimmed);
    setTranslatedText("");
    setDictionaryPills([]);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          currentLang: dialect,
          translationMode: "slang",
          slangLevel: 2,
          isPremiumSelected: true,
          context: "dm",
          previousMessage: null,
        }),
      });

      const data = (await res.json()) as { fullText?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Translation failed");
      }

      const fullText = String(data.fullText ?? "").trim();
      const { translated, dictRaw } = splitTranslationAndDictionary(fullText);
      const pills = parseDictionaryPills(dictRaw);

      setTranslatedText(translated);
      setDictionaryPills(pills);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translation failed");
      setTranslatedText("");
      setDictionaryPills([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFlipIt = () => {
    void translateText(inputText, outputLang);
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

  const selectDropdownClass =
    "w-full rounded-lg border bg-zinc-950/90 px-3 py-2.5 text-sm text-white transition-[border-color] duration-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0";

  const inputLangSelectClass =
    "w-full max-w-[min(100%,280px)] rounded-lg border bg-zinc-950/90 px-2.5 py-1.5 text-xs text-white transition-[border-color] duration-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0";

  return (
    <div
      className="min-h-[100dvh] overflow-x-hidden transition-[background-color] duration-500 ease-in-out"
      style={{ backgroundColor: theme.bg }}
    >
      <div className="mx-auto flex h-[100dvh] max-h-[100dvh] max-w-[480px] flex-col overflow-hidden px-3 pb-2 pt-2">
        {/* Top bar */}
        <header className="mb-2 flex shrink-0 items-center justify-between gap-3">
          <span className="text-xl font-bold tracking-tight text-white transition-colors duration-500">
            StreetVibe
          </span>
          <div
            className="flex max-w-[55%] min-w-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-[border-color,background-color,color] duration-500 ease-in-out"
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

        {/* Output / dialect dropdown */}
        <div className="mb-2 flex shrink-0 flex-col gap-1">
          <label htmlFor="output-lang" className="text-[10px] font-medium uppercase tracking-wide text-white/50">
            Output
          </label>
          <div style={{ "--accent": theme.accent } as CSSProperties}>
            <select
              id="output-lang"
              value={outputLang}
              onChange={(e) => setOutputLang(e.target.value)}
              className={selectDropdownClass}
              style={{ borderColor: `${theme.accent}88` }}
            >
              <optgroup label="💎 Premium Slangs" className="bg-zinc-900 text-white">
                {OUTPUT_PREMIUM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-zinc-900 text-white">
                    {o.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="🌐 Standard Languages" className="bg-zinc-900 text-white">
                {OUTPUT_STANDARD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-zinc-900 text-white">
                    {o.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Output card — scrolls; keeps mic + inputs in view */}
        <section className="mb-2 min-h-0 flex-1 overflow-hidden">
          <div
            className="h-full min-h-0 overflow-y-auto overflow-x-hidden rounded-2xl border p-3 shadow-lg transition-[border-color,background-color] duration-500 ease-in-out"
            style={{
              borderColor: `${theme.accent}40`,
              backgroundColor: `${theme.accent}0d`,
            }}
          >
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-white/40">Original</p>
            <p className="mb-3 min-h-0 max-h-none whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-xs leading-relaxed text-white/45 transition-colors duration-500">
              {loading || originalText.trim() ? (
                originalText.trim() || "—"
              ) : (
                <span className="italic">Your original line will show here after you flip it.</span>
              )}
            </p>

            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-white/40">Street</p>
            <div className="min-h-0 max-h-none overflow-visible text-base font-bold leading-snug transition-colors duration-500">
              {loading ? (
                <p className="animate-pulse text-sm font-semibold" style={{ color: theme.accent }}>
                  {loadingMessage}
                </p>
              ) : error ? (
                <p className="max-h-none whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-xs font-normal text-red-400">
                  {error}
                </p>
              ) : originalText.trim() ? (
                translatedText.trim() ? (
                  <p
                    className="max-h-none whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                    style={{ color: theme.accent }}
                  >
                    {translatedText}
                  </p>
                ) : (
                  <p className="text-xs font-normal italic text-white/35">
                    Translation lands here — coming next.
                  </p>
                )
              ) : (
                <p className="text-xs font-normal italic text-white/35">
                  Flip a line to see the vibe in {theme.city}.
                </p>
              )}
            </div>

            <div className="mt-2 flex max-h-none flex-wrap gap-1.5 overflow-visible">
              {loading ? (
                <span className="text-xs text-white/35">…</span>
              ) : dictionaryPills.length > 0 ? (
                dictionaryPills.map((pill, i) => (
                  <span
                    key={`${pill}-${i}`}
                    className="max-w-full whitespace-pre-wrap break-words rounded-full border px-3 py-1 text-xs font-medium transition-all duration-500"
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

        {/* Mic + actions — fixed above inputs so visible without scrolling the page */}
        <div className="flex shrink-0 items-end justify-center gap-3 overflow-visible py-2">
          <div className="flex flex-col items-center">
            <button
              type="button"
              aria-label="Tap to speak"
              className="flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-500 ease-in-out active:scale-95"
              style={{
                background: `linear-gradient(145deg, ${theme.accent}ee, ${theme.accent}88)`,
                boxShadow: `0 8px 28px ${theme.accent}55`,
              }}
            >
              <svg className="h-7 w-7 text-black/90" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14C5.52 16.16 8.53 19 12 19s6.48-2.84 6.93-6.86c.09-.6-.39-1.14-1-1.14z" />
              </svg>
            </button>
            <span className="mt-1 text-[10px] text-white/50">tap to speak</span>
          </div>

          <div className="flex gap-2 pb-1">
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

        {/* Input + Flip */}
        <div className="flex shrink-0 flex-col gap-2 pb-1">
          <div className="flex flex-col gap-1">
            <label htmlFor="input-lang" className="text-[10px] font-medium uppercase tracking-wide text-white/45">
              From
            </label>
            <div style={{ "--accent": theme.accent } as CSSProperties}>
              <select
                id="input-lang"
                value={inputLanguage}
                onChange={(e) => setInputLanguage(e.target.value)}
                className={inputLangSelectClass}
                style={{ borderColor: `${theme.accent}88` }}
              >
                {INPUT_LANGUAGES.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ "--accent": theme.accent } as CSSProperties}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Say it plain…"
              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white placeholder:text-white/35 transition-[box-shadow,border-color] duration-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0"
            />
          </div>
          <button
            type="button"
            onClick={handleFlipIt}
            disabled={loading}
            className="w-full rounded-xl py-2.5 text-center text-sm font-semibold text-black transition-[background-color,box-shadow] duration-500 ease-in-out enabled:active:scale-[0.98] disabled:opacity-60"
            style={{
              backgroundColor: theme.accent,
              boxShadow: `0 4px 20px ${theme.accent}44`,
            }}
          >
            {loading ? "Flipping…" : "Flip it"}
          </button>
        </div>
      </div>
    </div>
  );
}
