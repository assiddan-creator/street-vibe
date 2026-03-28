"use client";

import type { CSSProperties, MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlipButtonSkeleton, PopupWordSkeleton, TranslationBlockSkeleton } from "@/components/ui/Skeleton";
import { StreetVibeNav } from "@/components/StreetVibeNav";
import { useCityTheme } from "@/components/theme/CityThemeProvider";
import { LearnsYouControls } from "@/components/LearnsYouControls";
import { VoiceGenderSegment } from "@/components/VoiceGenderSegment";
import { Toast } from "@/components/Toast";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import {
  GLASS_INPUT,
  GLASS_OUTPUT_CARD,
  GLASS_SELECT,
  GLASS_SELECT_COMPACT,
} from "@/lib/themeUiClasses";
import {
  INPUT_LANGUAGES,
  OUTPUT_PREMIUM_OPTIONS,
  OUTPUT_STANDARD_OPTIONS,
  parseDictionaryPills,
  resolveTheme,
  splitTranslationAndDictionary,
} from "@/lib/streetVibeTheme";
import { getCityThemeForDialect } from "@/lib/themeConfig";
import { lookupSlang } from "@/lib/slangDictionary";
import {
  ANALYTICS_EVENT_NAMES,
  ANALYTICS_MODE,
  analyticsDurationFieldsFromStart,
  clipAnalyticsErrorCode,
  trackAnalyticsEvent,
} from "@/lib/analyticsEvents";
import {
  getImplicitSoftExtrasForRequests,
  getLearnsYouEnabled,
  recordInteractionSignal,
} from "@/lib/implicitPreferenceEngine";
import { themeAccentAlpha } from "@/lib/themeAccent";
import { TOP_HELPER_LABEL_CLASS, TOP_STACK_CLASS } from "@/lib/topSectionUi";
import { type TtsVoiceGender, getStoredTtsGender, setStoredTtsGender } from "@/lib/ttsVoiceGender";

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
  const [ttsGender, setTtsGender] = useState<TtsVoiceGender>("male");

  useEffect(() => {
    setTtsGender(getStoredTtsGender());
  }, []);

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

  const translateText = async (text: string, dialect: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setOriginalText(trimmed);
    setTranslatedText("");
    setDictionaryPills([]);

    const learnsYouOn = getLearnsYouEnabled();
    const implicitExtras = getImplicitSoftExtrasForRequests(learnsYouOn, false, undefined);
    const implicitPresent = Boolean(
      implicitExtras?.personalSlangProfile || implicitExtras?.personaPresetId
    );
    const translatePerfStart = performance.now();
    trackAnalyticsEvent({
      name: ANALYTICS_EVENT_NAMES.TRANSLATE_REQUESTED,
      mode: ANALYTICS_MODE.TEXT,
      targetDialect: dialect,
      sourceLanguage: selectedInputLang,
      slangLevel,
      vibe: context,
      textLengthChars: trimmed.length,
      learnsYouEnabled: learnsYouOn,
      implicitGuidancePresent: implicitPresent,
    });

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
          ...implicitExtras,
        }),
      });

      const data = (await res.json()) as { fullText?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Translation failed");
      }

      trackAnalyticsEvent({
        name: ANALYTICS_EVENT_NAMES.TRANSLATE_SUCCEEDED,
        mode: ANALYTICS_MODE.TEXT,
        targetDialect: dialect,
        learnsYouEnabled: learnsYouOn,
        implicitGuidancePresent: implicitPresent,
        ...analyticsDurationFieldsFromStart(translatePerfStart),
      });

      if (getLearnsYouEnabled()) {
        recordInteractionSignal({
          type: "translate_success",
          snapshot: {
            dialectId: dialect,
            slangLevel,
            context,
            ttsGender,
            inputLanguage: selectedInputLang,
            timestampMs: Date.now(),
          },
        });
      }

      const fullText = String(data.fullText ?? "").trim();
      const { translated, dictRaw } = splitTranslationAndDictionary(fullText);
      const pills = parseDictionaryPills(dictRaw);

      setTranslatedText(translated);
      setDictionaryPills(pills);
    } catch (e) {
      trackAnalyticsEvent({
        name: ANALYTICS_EVENT_NAMES.TRANSLATE_FAILED,
        mode: ANALYTICS_MODE.TEXT,
        targetDialect: dialect,
        errorCode: clipAnalyticsErrorCode(e instanceof Error ? e.message : "translate_error"),
        learnsYouEnabled: getLearnsYouEnabled(),
        ...analyticsDurationFieldsFromStart(translatePerfStart),
      });
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
  const isActive = inputText.trim().length > 0 || originalText.trim().length > 0;
  const isIdle = !isActive;

  return (
    <>
      <Toast message={toast} accent={theme.accent} />
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
          {popupLoading ? (
            <PopupWordSkeleton />
          ) : (
            <p className="text-[11px] text-white/80">{popupWord.meaning}</p>
          )}
          {popupWord.example ? (
            <p className="mt-1 text-[10px] italic text-white/50">&quot;{popupWord.example}&quot;</p>
          ) : null}
        </div>
      )}

      <div
        className="mx-auto flex w-full max-w-[min(100%,390px)] flex-col px-2.5 pb-4 pt-3"
        onClick={() => setPopupWord(null)}
      >
        <header className="mb-4 flex shrink-0 items-center justify-center">
          {isIdle ? (
            <span
              className="text-xl text-white"
              style={{
                fontFamily: "'Permanent Marker', cursive",
                opacity: 0.7,
                letterSpacing: "0.05em",
              }}
            >
              StreetVibe
            </span>
          ) : (
            <span
              className="text-3xl text-white drop-shadow-lg"
              style={{
                fontFamily: "'Permanent Marker', cursive",
                textShadow: `0 0 20px ${theme.accent}88, 0 2px 4px rgba(0,0,0,0.8)`,
              }}
            >
              StreetVibe
            </span>
          )}
        </header>

        <StreetVibeNav />

        <div className={TOP_STACK_CLASS}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="input-lang" className={TOP_HELPER_LABEL_CLASS}>
            I speak
          </label>
          {isIdle ? (
            <div
              className="mx-auto w-full rounded-xl border border-white/[0.05] bg-black/18 px-3 py-0.5 backdrop-blur-sm"
              style={{ boxShadow: `inset 0 0 0 1px ${themeAccentAlpha(theme.accent, "10")}` }}
            >
            <select
              id="input-lang"
              value={inputLanguage}
              onChange={(e) => {
                const v = e.target.value;
                setInputLanguage(v);
                trackAnalyticsEvent({
                  name: ANALYTICS_EVENT_NAMES.SOURCE_LANGUAGE_SELECTED,
                  sourceLanguage: v,
                  mode: ANALYTICS_MODE.TEXT,
                });
                if (getLearnsYouEnabled()) {
                  recordInteractionSignal({
                    type: "input_language_select",
                    inputLanguage: v,
                    timestampMs: Date.now(),
                  });
                }
              }}
              className="w-full cursor-pointer border-0 bg-transparent py-2 text-center text-[11px] text-white/72 outline-none ring-0"
            >
              {INPUT_LANGUAGES.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
            </div>
          ) : (
            <div style={{ "--accent": theme.accent } as CSSProperties}>
              <select
                id="input-lang"
                value={inputLanguage}
                onChange={(e) => {
                  const v = e.target.value;
                  setInputLanguage(v);
                  trackAnalyticsEvent({
                    name: ANALYTICS_EVENT_NAMES.SOURCE_LANGUAGE_SELECTED,
                    sourceLanguage: v,
                    mode: ANALYTICS_MODE.TEXT,
                  });
                  if (getLearnsYouEnabled()) {
                    recordInteractionSignal({
                      type: "input_language_select",
                      inputLanguage: v,
                      timestampMs: Date.now(),
                    });
                  }
                }}
                className={`${GLASS_SELECT_COMPACT} px-2.5 py-1.5 text-center text-[12px] font-medium leading-tight text-white/90`}
              >
                {INPUT_LANGUAGES.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="output-lang" className={TOP_HELPER_LABEL_CLASS}>
            Translate to
          </label>
          {isIdle ? (
            <div
              className="mx-auto w-full rounded-xl border border-white/[0.05] bg-black/18 px-3 py-0.5 backdrop-blur-sm"
              style={{ boxShadow: `inset 0 0 0 1px ${themeAccentAlpha(theme.accent, "10")}` }}
            >
            <select
              id="output-lang"
              value={outputLang}
              onChange={(e) => {
                const v = e.target.value;
                setOutputLang(v);
                trackAnalyticsEvent({
                  name: ANALYTICS_EVENT_NAMES.TARGET_DIALECT_SELECTED,
                  targetDialect: v,
                  mode: ANALYTICS_MODE.TEXT,
                });
                if (getLearnsYouEnabled()) {
                  recordInteractionSignal({ type: "dialect_select", dialectId: v, timestampMs: Date.now() });
                }
              }}
              className="w-full cursor-pointer border-0 bg-transparent py-2 text-center text-[11px] text-white/72 outline-none ring-0"
            >
              <optgroup label="Street slang — AI voice" className="bg-zinc-900 text-white">
                {OUTPUT_PREMIUM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-zinc-900 text-white">
                    {o.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="All languages — Google voice" className="bg-zinc-900 text-white">
                {OUTPUT_STANDARD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-zinc-900 text-white">
                    {o.label}
                  </option>
                ))}
              </optgroup>
            </select>
            </div>
          ) : (
            <div style={{ "--accent": theme.accent } as CSSProperties}>
              <select
                id="output-lang"
                value={outputLang}
                onChange={(e) => {
                  const v = e.target.value;
                  setOutputLang(v);
                  trackAnalyticsEvent({
                    name: ANALYTICS_EVENT_NAMES.TARGET_DIALECT_SELECTED,
                    targetDialect: v,
                    mode: ANALYTICS_MODE.TEXT,
                  });
                  if (getLearnsYouEnabled()) {
                    recordInteractionSignal({ type: "dialect_select", dialectId: v, timestampMs: Date.now() });
                  }
                }}
                className={`${GLASS_SELECT} px-3 py-2.5 text-center text-[13px] font-medium leading-snug text-white/90`}
              >
                <optgroup label="Street slang — AI voice" className="bg-zinc-900 text-white">
                  {OUTPUT_PREMIUM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-zinc-900 text-white">
                      {o.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="All languages — Google voice" className="bg-zinc-900 text-white">
                  {OUTPUT_STANDARD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-zinc-900 text-white">
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}
        </div>

        <div className="flex w-full justify-center">
          <VoiceGenderSegment
            accent={theme.accent}
            idle={isIdle}
            value={ttsGender}
            onChange={(value) => {
              setTtsGender(value);
              setStoredTtsGender(value);
              trackAnalyticsEvent({
              name: ANALYTICS_EVENT_NAMES.VOICE_GENDER_SELECTED,
              ttsGender: value,
              mode: ANALYTICS_MODE.TEXT,
            });
              if (getLearnsYouEnabled()) {
                recordInteractionSignal({
                  type: "tts_gender_select",
                  gender: value,
                  timestampMs: Date.now(),
                });
              }
            }}
          />
        </div>
        </div>

        <div className={`flex flex-col items-center transition-all duration-500 ${isActive ? "mb-4 mt-0" : "mb-8 mt-8"}`}>
          <button
            type="button"
            onClick={toggleMic}
            aria-label={isListening ? "Stop listening" : "Tap to speak"}
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full shadow-2xl transition-all duration-500 ease-in-out active:scale-95 ${
              isActive ? "h-24 w-24" : "h-48 w-48"
            } ${isListening ? "mic-pulse border-transparent" : isIdle ? "animate-pulse-slow" : ""}`}
            style={
              isListening
                ? {
                    background: `linear-gradient(145deg, ${theme.accent}ee, ${theme.accent}88)`,
                    boxShadow: `0 8px 28px ${theme.accent}55`,
                  }
                : { boxShadow: `0 0 40px ${theme.accent}33, 0 8px 32px rgba(0,0,0,0.6)` }
            }
          >
            {micBall ? (
              <img src={micBall} alt="mic" className="h-full w-full rounded-full object-cover" draggable={false} />
            ) : (
              <svg
                className={`${isActive ? "h-10 w-10" : "h-24 w-24"} ${isListening ? "text-black/90" : "text-white"}`}
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14C5.52 16.16 8.53 19 12 19s6.48-2.84 6.93-6.86c.09-.6-.39-1.14-1-1.14z" />
              </svg>
            )}
          </button>
          {isListening ? (
            <span
              className="mt-2 text-center text-[11px] transition-all duration-300"
              style={{ color: theme.accent }}
            >
              listening...
            </span>
          ) : isActive ? (
            <span className="mt-2 text-center text-[11px] text-white/40 transition-all duration-300">
              tap to speak again
            </span>
          ) : (
            <>
              <span
                className="mt-3 text-center text-base uppercase tracking-widest"
                style={{ color: theme.accent, opacity: 0.7, letterSpacing: "0.15em" }}
              >
                tap to speak
              </span>
              <p className="mt-1 text-center text-[9px] tracking-wider text-white/25">
                speak or type in any language
              </p>
            </>
          )}
          {micError ? <p className="mt-1 text-center text-[10px] text-red-400">{micError}</p> : null}
        </div>

        <div className="mx-auto mt-2 flex w-full max-w-[min(100%,390px)] flex-col items-center px-2 pb-1">
          <LearnsYouControls accent={theme.accent} idle={isIdle} belowHero />
        </div>

        <div
          className={`flex flex-col gap-3 transition-all duration-500 ${
            isActive ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"
          }`}
        >
          <div style={{ "--accent": theme.accent } as CSSProperties}>
            <input
              type="text"
              value={inputDisplayValue}
              readOnly={isListening}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Say it plain…"
              className={`${GLASS_INPUT} border-white/5 bg-white/3`}
            />
          </div>

          <div>
            <p className="mb-1 text-center text-[9px] font-medium uppercase tracking-widest text-white/40">
              ⚡ Intensity
            </p>
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
                    onClick={() => {
                      setSlangLevel(level);
                      trackAnalyticsEvent({
                      name: ANALYTICS_EVENT_NAMES.SLANG_LEVEL_SELECTED,
                      slangLevel: level,
                      mode: ANALYTICS_MODE.TEXT,
                    });
                      if (getLearnsYouEnabled()) {
                        recordInteractionSignal({
                          type: "slang_level_select",
                          level,
                          timestampMs: Date.now(),
                        });
                      }
                    }}
                    className={`shrink-0 rounded-full border px-4 py-1.5 text-[11px] font-semibold backdrop-blur-md transition-all duration-300 ${
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

          <div>
            <p className="mb-1 text-center text-[9px] font-medium uppercase tracking-widest text-white/40">🎭 Vibe</p>
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
                    onClick={() => {
                      setContext(value);
                      trackAnalyticsEvent({
                      name: ANALYTICS_EVENT_NAMES.VIBE_SELECTED,
                      vibe: value,
                      mode: ANALYTICS_MODE.TEXT,
                    });
                      if (getLearnsYouEnabled()) {
                        recordInteractionSignal({
                          type: "context_select",
                          context: value,
                          timestampMs: Date.now(),
                        });
                      }
                    }}
                    className={`shrink-0 rounded-full border px-4 py-1.5 text-[11px] font-semibold backdrop-blur-md transition-all duration-300 ${
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

          <div className="flex w-full items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCopy()}
              aria-label="Copy"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border bg-black/25 text-white/70 backdrop-blur-md transition-all duration-200 hover:bg-white/10 active:scale-95"
              style={{ borderColor: `${theme.accent}30` }}
            >
              <svg className="h-[20px] w-[20px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
              onClick={handleFlipIt}
              disabled={loading}
              className="relative flex-1 overflow-hidden rounded-xl py-3 font-bold text-white transition-all duration-300 active:scale-95 disabled:opacity-60"
              style={{
                fontFamily: "'Permanent Marker', cursive",
                fontSize: "1.1rem",
                boxShadow: `0 4px 20px ${theme.accent}44`,
              }}
            >
              {cityTheme.bg?.wide ? (
                <img
                  src={cityTheme.bg.wide}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-75"
                  draggable={false}
                />
              ) : null}
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(135deg, ${theme.accent}33 0%, #00000099 100%)` }}
              />
              <span className="relative z-10 flex w-full justify-center drop-shadow-lg">
                {loading ? <FlipButtonSkeleton /> : "Flip it 🔥"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border bg-black/25 text-white/70 backdrop-blur-md transition-all duration-200 hover:bg-white/10 active:scale-95"
              style={{ borderColor: `${theme.accent}30` }}
            >
              <svg className="h-[20px] w-[20px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>

          <section
            className={`shrink-0 overflow-hidden transition-all duration-500 ${
              translatedText || loading || error ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <div
              className={`${GLASS_OUTPUT_CARD} min-h-[200px] max-h-none overflow-visible !p-4`}
              style={
                {
                  ["--scroll-thumb" as string]: `${theme.accent}88`,
                  ["--scroll-thumb-hover" as string]: `${theme.accent}aa`,
                  ["--scroll-track" as string]: "rgba(0,0,0,0.35)",
                } as CSSProperties
              }
            >
              <p className="mb-1 text-[10px] text-white/50">Original</p>
              <p className="mb-2 whitespace-pre-wrap break-words text-[11px] leading-snug text-white/80">
                {originalText.trim() || "—"}
              </p>
              <p className="mb-0.5 text-[10px] text-white/50">Street</p>
              <div className="min-h-0 text-sm font-bold leading-snug">
                {loading ? (
                  <TranslationBlockSkeleton accent={theme.accent} />
                ) : error ? (
                  <p className="text-[11px] font-normal text-red-400">{error}</p>
                ) : translatedText.trim() ? (
                  <p
                    className="text-[13px] leading-relaxed [overflow-wrap:anywhere]"
                    style={{ color: theme.accent }}
                  >
                    {translatedText.split(/(\s+)/).map((token, i) =>
                      token.trim() ? (
                        <span
                          key={i}
                          onClick={(e) => void handleWordClick(token, e)}
                          className="cursor-pointer rounded px-0.5 transition-all duration-150 hover:bg-white/10 active:bg-white/20"
                        >
                          {token}
                        </span>
                      ) : (
                        <span key={i}>{token}</span>
                      ),
                    )}
                  </p>
                ) : null}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
                {dictionaryPills.map((pill, i) => (
                  <span
                    key={`${pill}-${i}`}
                    className="whitespace-pre-wrap break-words rounded-full border px-3 py-1 text-[11px] font-medium leading-tight transition-all duration-500"
                    style={{
                      borderColor: `${theme.accent}55`,
                      color: theme.accent,
                      backgroundColor: `${theme.accent}15`,
                    }}
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
