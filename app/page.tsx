"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCityTheme } from "@/components/theme/CityThemeProvider";
import { Toast } from "@/components/Toast";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { THEME_FLIP_BTN, THEME_GLASS_ICON_BTN, THEME_LINK_PILL, THEME_MIC_IDLE } from "@/lib/themeUiClasses";
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
      if (text) setInputText(text);
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
    "w-full rounded-lg border bg-zinc-950/90 px-2.5 py-2 text-xs text-white transition-[border-color] duration-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0";

  const inputLangSelectClass =
    "w-full max-w-[min(100%,280px)] rounded-lg border bg-zinc-950/90 px-2 py-1 text-[11px] leading-tight text-white transition-[border-color] duration-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0";

  return (
    <>
      <Toast message={toast} accent={theme.accent} />
      <div className="mx-auto flex w-full max-w-[min(100%,390px)] flex-col px-2.5 pb-1.5 pt-1.5">
        {/* Top bar */}
        <header className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
          <span className="text-lg font-bold leading-tight tracking-tight text-white transition-colors duration-500">
            StreetVibe
          </span>
          <div
            className="flex max-w-[58%] min-w-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] transition-[border-color,background-color,color] duration-500 ease-in-out"
            style={{
              borderColor: `${theme.accent}55`,
              backgroundColor: `${theme.accent}18`,
              color: theme.accent,
            }}
          >
            <span className="shrink-0 text-base leading-none" aria-hidden>
              {theme.flag}
            </span>
            <span className="truncate font-medium">{theme.city}</span>
          </div>
        </header>

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

        {/* Output card — max height + themed scrollbar */}
        <section className="mb-1.5 shrink-0 overflow-hidden">
          <div
            className="output-card-scroll max-h-[280px] overflow-y-auto overflow-x-hidden rounded-xl border p-2.5 shadow-lg transition-[border-color,background-color] duration-500 ease-in-out"
            style={
              {
                borderColor: `${theme.accent}40`,
                backgroundColor: `${theme.accent}0d`,
                ["--scroll-thumb" as string]: `${theme.accent}88`,
                ["--scroll-thumb-hover" as string]: `${theme.accent}aa`,
                ["--scroll-track" as string]: "rgba(0,0,0,0.45)",
              } as CSSProperties
            }
          >
            <p className="mb-1 text-[9px] font-medium uppercase tracking-wider text-white/40">Original</p>
            <p className="mb-2 min-h-0 max-h-none whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[11px] leading-snug text-white/45 transition-colors duration-500">
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
                  <p
                    className="max-h-none whitespace-pre-wrap break-words text-[11px] leading-snug [overflow-wrap:anywhere]"
                    style={{ color: theme.accent }}
                  >
                    {translatedText}
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

            <div className="mt-1.5 flex max-h-none flex-wrap gap-1 overflow-visible">
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
                <span className="text-[10px] text-white/30">Slang dictionary chips will appear here.</span>
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
              value={inputDisplayValue}
              readOnly={isListening}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Say it plain…"
              className="w-full rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-xs text-white placeholder:text-white/35 transition-[box-shadow,border-color] duration-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0 read-only:opacity-95"
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
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-xl transition-all duration-500 ease-in-out active:scale-95 ${
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
                <svg
                  className={`h-8 w-8 ${isListening ? "text-black/90" : "text-white"}`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14C5.52 16.16 8.53 19 12 19s6.48-2.84 6.93-6.86c.09-.6-.39-1.14-1-1.14z" />
                </svg>
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

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleShare}
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
            </div>
          </div>
        </div>

        <div className="shrink-0 pt-4 pb-2">
          <Link href="/speak" className={THEME_LINK_PILL}>
            Speak Mode with Audio
          </Link>
        </div>
      </div>
    </>
  );
}
