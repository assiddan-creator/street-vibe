"use client";

import type { CSSProperties, MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StreetVibeNav } from "@/components/StreetVibeNav";
import { useCityTheme } from "@/components/theme/CityThemeProvider";
import { Toast } from "@/components/Toast";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import {
  GLASS_INPUT,
  GLASS_OUTPUT_CARD,
  GLASS_SELECT,
  GLASS_SELECT_COMPACT,
  THEME_FLIP_BTN,
  THEME_GLASS_ICON_BTN,
  THEME_MIC_IDLE,
} from "@/lib/themeUiClasses";
import {
  INPUT_LANGUAGES,
  LOADING_MESSAGES,
  OUTPUT_PREMIUM_OPTIONS,
  OUTPUT_STANDARD_OPTIONS,
  STANDARD_LOADING,
  isPremiumSlang,
  parseDictionaryPills,
  resolveTheme,
  splitTranslationAndDictionary,
} from "@/lib/streetVibeTheme";
import { MicBallContent } from "@/components/theme/MicBallContent";
import { getCityThemeForDialect } from "@/lib/themeConfig";
import { lookupSlang } from "@/lib/slangDictionary";

export default function Home() {
  const [outputLang, setOutputLang] = useState("Jamaican Patois");
  const [inputLanguage, setInputLanguage] = useState("he-IL");
  const [inputText, setInputText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [dictionaryPills, setDictionaryPills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [slangLevel, setSlangLevel] = useState<1 | 2 | 3>(2);
  const [context, setContext] = useState<string>("dm");
  const [popupWord, setPopupWord] = useState<{
    word: string;
    meaning: string;
    example: string;
    x: number;
    y: number;
  } | null>(null);
  const [popupLoading, setPopupLoading] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const selectedInputLang = inputLanguage;

  const onFinalSpeech = useCallback((text: string) => {
    setInputText((prev) => (prev + " " + text).trim());
  }, []);

  const { isListening, interimText, error: micError, toggle: toggleMic } = useSpeechRecognition({
    lang: selectedInputLang,
    onFinalResult: onFinalSpeech,
  });

  const inputDisplayValue = useMemo(() => {
    if (isListening && interimText) {
      return [inputText.trim(), interimText].filter(Boolean).join(" ");
    }
    return inputText;
  }, [inputText, interimText, isListening]);

  const theme = resolveTheme(outputLang);
  const { setDialect } = useCityTheme();

  useEffect(() => {
    setDialect(outputLang);
  }, [outputLang, setDialect]);

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
          slangLevel,
          isPremiumSelected: true,
          context,
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
    void translateText(inputDisplayValue.trim(), outputLang);
  };

  const handleCopy = async () => {
    const text = translatedText.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied!");
    } catch {
      /* ignore */
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
        setToast("Pasted!");
      }
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

  const handleClear = () => {
    setInputText("");
    setOriginalText("");
    setTranslatedText("");
    setDictionaryPills([]);
    setError(null);
  };

  const handleWordClick = async (word: string, e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = rect.left;
    const y = rect.bottom + window.scrollY + 6;
    const clean = word.replace(/[^a-zA-ZÀ-ÿА-яёÀ-ÿ\u3040-\u30FF\uAC00-\uD7AF]/g, "").trim();
    if (!clean) return;
    const local = lookupSlang(clean, outputLang);
    if (local) {
      setPopupWord({ word: clean, meaning: local.meaning, example: local.example, x, y });
      return;
    }
    setPopupLoading(true);
    setPopupWord({ word: clean, meaning: "...", example: "", x, y });
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `In the context of ${outputLang} slang, the sentence is: "${translatedText}". What does the word "${clean}" mean in THIS specific context? Reply in this exact format: MEANING: <one line meaning in context> | EXAMPLE: <one example sentence>`,
          currentLang: "English",
          translationMode: "standard",
          slangLevel: 1,
          isPremiumSelected: false,
          context: "default",
          previousMessage: null,
        }),
      });
      const data = (await res.json()) as { fullText?: string };
      const full = data.fullText ?? "";
      const meaning = full.match(/MEANING:\s*(.+?)(\||$)/)?.[1]?.trim() ?? full;
      const example = full.match(/EXAMPLE:\s*(.+)/)?.[1]?.trim() ?? "";
      setPopupWord({ word: clean, meaning, example, x, y });
    } catch {
      setPopupWord(null);
    } finally {
      setPopupLoading(false);
    }
  };

  const cityTheme = getCityThemeForDialect(outputLang);
  const micBall = cityTheme.micBall ?? null;

  return (
    <>
      <Toast message={toast} accent={theme.accent} />
      <div
        className="mx-auto flex w-full max-w-[min(100%,390px)] flex-col px-2.5 pb-1.5 pt-1.5"
        onClick={() => setPopupWord(null)}
      >
        {/* Top bar */}
        <header className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
          <span className="text-lg font-bold leading-tight tracking-tight text-white drop-shadow-md transition-colors duration-500">
            StreetVibe
          </span>
          <div
            className="flex max-w-[58%] min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white backdrop-blur-md transition-colors duration-500 ease-in-out"
            style={{ color: theme.accent }}
          >
            <span className="shrink-0 text-base leading-none" aria-hidden>
              {theme.flag}
            </span>
            <span className="truncate font-medium">{theme.city}</span>
          </div>
        </header>

        <StreetVibeNav />

        {/* Output / dialect dropdown */}
        <div className="mb-1.5 flex shrink-0 flex-col gap-0.5">
          <label htmlFor="output-lang" className="text-[9px] font-medium uppercase tracking-wide text-white/50">
            Output
          </label>
          <div style={{ "--accent": theme.accent } as CSSProperties}>
            <select
              id="output-lang"
              value={outputLang}
              onChange={(e) => setOutputLang(e.target.value)}
              className={`${GLASS_SELECT} px-2.5 py-2 text-xs`}
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

        <div className="mb-1.5 flex shrink-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-center gap-1">
            {(
              [
                { level: 1 as const, label: "🌿 Mild" },
                { level: 2 as const, label: "🔥 Street" },
                { level: 3 as const, label: "💀 Raw" },
              ] as const
            ).map(({ level, label }) => {
              const on = slangLevel === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSlangLevel(level)}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md transition-all duration-300 ${
                    on ? "border-2" : "border border-white/10 bg-black/25 text-white/90"
                  }`}
                  style={
                    on
                      ? { borderColor: theme.accent, color: theme.accent, backgroundColor: `${theme.accent}18` }
                      : undefined
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {(
              [
                { value: "dm", label: "📱 Friend" },
                { value: "flirt", label: "😏 Flirty" },
                { value: "angry", label: "😤 Angry" },
                { value: "stoned", label: "🌀 Stoned" },
              ] as const
            ).map(({ value, label }) => {
              const on = context === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setContext(value)}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md transition-all duration-300 ${
                    on ? "border-2" : "border border-white/10 bg-black/25 text-white/90"
                  }`}
                  style={
                    on
                      ? { borderColor: theme.accent, color: theme.accent, backgroundColor: `${theme.accent}18` }
                      : undefined
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Output card — max height + themed scrollbar */}
        <section className="mb-1.5 shrink-0 overflow-hidden">
          <div
            className={`${GLASS_OUTPUT_CARD} max-h-[280px]`}
            style={
              {
                ["--scroll-thumb" as string]: `${theme.accent}88`,
                ["--scroll-thumb-hover" as string]: `${theme.accent}aa`,
                ["--scroll-track" as string]: "rgba(0,0,0,0.35)",
              } as CSSProperties
            }
          >
            <p className="mb-1 text-[9px] font-medium uppercase tracking-wider text-white/40">Original</p>
            <p className="mb-2 min-h-0 max-h-none whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[11px] leading-snug text-white/80 drop-shadow-sm transition-colors duration-500">
              {loading || originalText.trim() ? (
                originalText.trim() || "—"
              ) : (
                <span className="italic">Your original line will show here after you flip it.</span>
              )}
            </p>

            <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wider text-white/40">Street</p>
            <div className="min-h-0 max-h-none overflow-visible text-sm font-bold leading-snug transition-colors duration-500">
              {loading ? (
                <p className="animate-pulse text-xs font-semibold leading-tight" style={{ color: theme.accent }}>
                  {loadingMessage}
                </p>
              ) : error ? (
                <p className="max-h-none whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[11px] font-normal leading-tight text-red-400">
                  {error}
                </p>
              ) : originalText.trim() ? (
                translatedText.trim() ? (
                  <p className="max-h-none leading-snug [overflow-wrap:anywhere]" style={{ color: theme.accent }}>
                    {translatedText.split(/(\s+)/).map((token, i) =>
                      token.trim() ? (
                        <span
                          key={i}
                          onClick={(e) => void handleWordClick(token, e)}
                          className="cursor-pointer rounded px-0.5 text-[11px] transition-all duration-150 hover:bg-white/10 active:bg-white/20"
                        >
                          {token}
                        </span>
                      ) : (
                        <span key={i}>{token}</span>
                      ),
                    )}
                  </p>
                ) : (
                  <p className="text-[11px] font-normal italic leading-tight text-white/35">
                    Translation lands here — coming next.
                  </p>
                )
              ) : (
                <p className="text-[11px] font-normal italic leading-tight text-white/35">
                  Flip a line to see the vibe in {theme.city}.
                </p>
              )}
            </div>

            <div className="mt-1.5 flex max-h-none flex-wrap items-center justify-center gap-1 overflow-visible">
              {loading ? (
                <span className="text-[10px] text-white/35">…</span>
              ) : dictionaryPills.length > 0 ? (
                dictionaryPills.map((pill, i) => (
                  <span
                    key={`${pill}-${i}`}
                    className="max-w-full whitespace-pre-wrap break-words rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight transition-all duration-500"
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
                <span className="w-full text-center text-[10px] text-white/30">
                  Slang dictionary chips will appear here.
                </span>
              )}
            </div>
          </div>
        </section>

        {/* From → input → Flip → mic row */}
        <div className="flex shrink-0 flex-col gap-1.5 pb-0.5">
          <div className="flex flex-col gap-0.5">
            <label htmlFor="input-lang" className="text-[9px] font-medium uppercase tracking-wide text-white/45">
              From
            </label>
            <div style={{ "--accent": theme.accent } as CSSProperties}>
              <select
                id="input-lang"
                value={inputLanguage}
                onChange={(e) => setInputLanguage(e.target.value)}
                className={`${GLASS_SELECT_COMPACT} px-2 py-1 text-[11px] leading-tight`}
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
              value={inputDisplayValue}
              readOnly={isListening}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Say it plain…"
              className={GLASS_INPUT}
            />
          </div>
          <button type="button" onClick={handleFlipIt} disabled={loading} className={THEME_FLIP_BTN}>
            {loading ? "Flipping…" : "Flip it"}
          </button>

          {/* Copy / Paste | Mic | Share — 48×48 icon buttons */}
          <div className="grid w-full grid-cols-3 items-start gap-1 overflow-visible pt-0.5">
            <div className="flex justify-center gap-1">
              <button
                type="button"
                onClick={() => void handleCopy()}
                aria-label="Copy Street translation"
                className={THEME_GLASS_ICON_BTN}
              >
                <svg className="h-[22px] w-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
                onClick={() => void handlePaste()}
                aria-label="Paste from clipboard"
                className={THEME_GLASS_ICON_BTN}
              >
                <svg className="h-[22px] w-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </button>
            </div>

            <div className="flex min-w-0 flex-col items-center">
              <button
                type="button"
                onClick={toggleMic}
                aria-label={isListening ? "Stop listening" : "Tap to speak"}
                className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-xl transition-all duration-500 ease-in-out active:scale-95 ${
                  isListening ? "mic-pulse border-transparent" : THEME_MIC_IDLE
                }`}
                style={
                  isListening
                    ? {
                        background: `linear-gradient(145deg, ${theme.accent}ee, ${theme.accent}88)`,
                        boxShadow: `0 8px 28px ${theme.accent}55, 0 0 15px -1px var(--theme-glow)`,
                      }
                    : undefined
                }
              >
                <MicBallContent micBall={micBall} isListening={isListening} iconClassName="h-8 w-8" />
              </button>
              <span
                className={`mt-1 text-center text-[10px] transition-colors duration-300 ${isListening ? "" : "text-white/50"}`}
                style={isListening ? { color: theme.accent } : undefined}
              >
                {isListening ? "listening..." : "tap to speak"}
              </span>
              {micError ? (
                <p className="mt-1 max-w-[220px] text-center text-[10px] font-medium leading-tight text-red-400">
                  {micError}
                </p>
              ) : null}
            </div>

            <div className="flex justify-center gap-1">
              <button
                type="button"
                onClick={() => void handleShare()}
                aria-label="Share"
                className={THEME_GLASS_ICON_BTN}
              >
                <svg className="h-[22px] w-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear text and translation"
                className={THEME_GLASS_ICON_BTN}
              >
                <svg className="h-[22px] w-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

      </div>

      {popupWord && (
        <div
          className="fixed z-50 max-w-[260px] rounded-xl border border-white/10 bg-black/90 p-3 shadow-2xl backdrop-blur-md"
          style={{ left: Math.min(popupWord.x, window.innerWidth - 280), top: popupWord.y }}
        >
          <button
            type="button"
            onClick={() => setPopupWord(null)}
            className="absolute right-2 top-2 text-white/40 hover:text-white"
          >
            ✕
          </button>
          <p className="mb-1 pr-6 text-[11px] font-bold text-white">{popupWord.word}</p>
          <p className="text-[11px] text-white/80">{popupLoading ? "Looking up..." : popupWord.meaning}</p>
          {popupWord.example ? (
            <p className="mt-1 text-[10px] italic text-white/50">&quot;{popupWord.example}&quot;</p>
          ) : null}
        </div>
      )}
    </>
  );
}
