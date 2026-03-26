"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StreetVibeNav } from "@/components/StreetVibeNav";
import { useCityTheme } from "@/components/theme/CityThemeProvider";
import { Toast } from "@/components/Toast";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import {
  GLASS_DUO_CARD,
  GLASS_INPUT,
  GLASS_OUTPUT_CARD,
  GLASS_SELECT,
  GLASS_SELECT_COMPACT,
  THEME_FLIP_BTN,
  THEME_GLASS_ICON_BTN,
  THEME_MIC_IDLE,
  THEME_PLAY_BTN,
} from "@/lib/themeUiClasses";
import { fetchTtsAudioUrl, speakNativeTts } from "@/lib/ttsClient";
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

type DuoTurn = "me" | "them";

type TtsEngine = "minimax" | "google" | "native";

const TTS_ENGINE_STORAGE_KEY = "streetvibe-tts-engine";

function readStoredTtsEngine(): TtsEngine {
  if (typeof window === "undefined") return "minimax";
  const v = localStorage.getItem(TTS_ENGINE_STORAGE_KEY);
  if (v === "minimax" || v === "google" || v === "native") return v;
  return "minimax";
}

const ENGINE_DISPLAY: Record<TtsEngine, string> = {
  minimax: "MiniMax",
  google: "Google",
  native: "Native",
};

export default function SpeakPage() {
  const [outputLang, setOutputLang] = useState("Jamaican Patois");
  const [inputLanguage, setInputLanguage] = useState("he-IL");
  const [buffers, setBuffers] = useState<{ me: string; them: string }>({ me: "", them: "" });
  const [activeTurn, setActiveTurn] = useState<DuoTurn>("me");
  const activeTurnRef = useRef<DuoTurn>("me");

  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [dictionaryPills, setDictionaryPills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [ttsEngine, setTtsEngine] = useState<TtsEngine>(readStoredTtsEngine);
  const [resolvedEngine, setResolvedEngine] = useState<TtsEngine | null>(null);
  const [ttsOutcome, setTtsOutcome] = useState<"unset" | "pending" | "success" | "failed">("unset");
  const [toast, setToast] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    activeTurnRef.current = activeTurn;
  }, [activeTurn]);

  const selectedInputLang = inputLanguage;

  const onFinalSpeech = useCallback((text: string) => {
    const turn = activeTurnRef.current;
    setBuffers((prev) => {
      const key = turn === "me" ? "me" : "them";
      return { ...prev, [key]: (prev[key] + " " + text).trim() };
    });
  }, []);

  const { isListening, interimText, error: micError, toggle: toggleMic } = useSpeechRecognition({
    lang: selectedInputLang,
    onFinalResult: onFinalSpeech,
  });

  const inputDisplayValue = useMemo(() => {
    const base = buffers[activeTurn];
    if (isListening && interimText) {
      return [base.trim(), interimText].filter(Boolean).join(" ");
    }
    return base;
  }, [buffers, activeTurn, interimText, isListening]);

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
      if (text) {
        setBuffers((prev) => ({ ...prev, [activeTurn]: text }));
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
    setBuffers({ me: "", them: "" });
    setOriginalText("");
    setTranslatedText("");
    setDictionaryPills([]);
    setError(null);
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    setTtsError(null);
    setTtsLoading(false);
    setTtsPlaying(false);
    setTtsOutcome("unset");
    setResolvedEngine(null);
  };

  const handlePlayTts = async () => {
    const text = translatedText.trim();
    if (!text || loading) return;

    setTtsError(null);
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== "undefined") window.speechSynthesis.cancel();

    setTtsOutcome("pending");
    setTtsLoading(true);
    setTtsPlaying(false);

    try {
      if (ttsEngine === "minimax") {
        const url = await fetchTtsAudioUrl(text, outputLang, "minimax");
        setTtsLoading(false);
        const audio = new Audio(url);
        audioRef.current = audio;
        setTtsPlaying(true);
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error("Playback failed"));
          void audio.play().catch(reject);
        });
        setResolvedEngine("minimax");
        setTtsOutcome("success");
      } else if (ttsEngine === "google") {
        const url = await fetchTtsAudioUrl(text, outputLang, "google");
        setTtsLoading(false);
        const audio = new Audio(url);
        audioRef.current = audio;
        setTtsPlaying(true);
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error("Playback failed"));
          void audio.play().catch(reject);
        });
        setResolvedEngine("google");
        setTtsOutcome("success");
      } else {
        setTtsPlaying(true);
        await speakNativeTts(text, outputLang);
        setResolvedEngine("native");
        setTtsOutcome("success");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "TTS failed";
      setTtsError(msg);
      setResolvedEngine(ttsEngine);
      setTtsOutcome("failed");
    } finally {
      setTtsLoading(false);
      setTtsPlaying(false);
      audioRef.current = null;
    }
  };

  const handleTtsEngineChange = (value: TtsEngine) => {
    setTtsEngine(value);
    setTtsOutcome("unset");
    setResolvedEngine(null);
    try {
      localStorage.setItem(TTS_ENGINE_STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  };

  const labelEngine: TtsEngine =
    ttsOutcome === "success" || ttsOutcome === "failed" ? (resolvedEngine ?? ttsEngine) : ttsEngine;

  const statusDotColor =
    ttsOutcome === "pending" || ttsOutcome === "unset"
      ? "#6b7280"
      : ttsOutcome === "success"
        ? "#22c55e"
        : "#ef4444";

  const duoBtnClass = (on: boolean) =>
    `flex-1 rounded-lg border px-2 py-1.5 text-center text-[11px] font-semibold transition-all duration-300 ${
      on ? "text-black" : "border-white/10 bg-black/25 text-white/90 backdrop-blur-md"
    }`;

  return (
    <>
      <Toast message={toast} accent={theme.accent} />
      <div className="mx-auto flex w-full max-w-[min(100%,390px)] flex-col px-2.5 pb-1.5 pt-1.5">
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

        <div className="mb-1.5 flex shrink-0 flex-col gap-0.5">
          <label htmlFor="speak-output-lang" className="text-[9px] font-medium uppercase tracking-wide text-white/50">
            Output
          </label>
          <div style={{ "--accent": theme.accent } as CSSProperties}>
            <select
              id="speak-output-lang"
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

        <div className="mb-1.5 flex shrink-0 flex-col gap-0.5">
          <label htmlFor="ttsEngineSelector" className="text-[9px] font-medium uppercase tracking-wide text-white/50">
            TTS engine
          </label>
          <div style={{ "--accent": theme.accent } as CSSProperties}>
            <select
              id="ttsEngineSelector"
              value={ttsEngine}
              onChange={(e) => handleTtsEngineChange(e.target.value as TtsEngine)}
              className={`${GLASS_SELECT} px-2 py-1.5 text-[10px] leading-tight`}
            >
              <option value="minimax" className="bg-zinc-900 text-white">
                MiniMax (Replicate)
              </option>
              <option value="google" className="bg-zinc-900 text-white">
                Google Cloud
              </option>
              <option value="native" className="bg-zinc-900 text-white">
                Native Browser
              </option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 px-0.5 pt-0.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: statusDotColor }}
              aria-hidden
            />
            <span className="text-[10px] font-medium text-white/80">
              Engine: {ENGINE_DISPLAY[labelEngine]}
            </span>
          </div>
        </div>

        <section className="mb-1.5 shrink-0 overflow-hidden">
          <div
            className={`${GLASS_OUTPUT_CARD} max-h-[240px]`}
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

            <div className="mb-0.5 flex items-center justify-between gap-2">
              <p className="text-[9px] font-medium uppercase tracking-wider text-white/40">Street</p>
              <button
                type="button"
                onClick={() => void handlePlayTts()}
                disabled={loading || !translatedText.trim() || ttsLoading}
                className={THEME_PLAY_BTN}
                aria-label={ttsPlaying ? "Playing audio" : "Play translation audio"}
              >
                {ttsLoading ? (
                  <span className="animate-pulse">Loading…</span>
                ) : ttsPlaying ? (
                  <>
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden />
                    Playing
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Play
                  </>
                )}
              </button>
            </div>
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
                    Translation lands here — flip first, then play.
                  </p>
                )
              ) : (
                <p className="text-[11px] font-normal italic leading-tight text-white/35">
                  Flip a line to hear the vibe in {theme.city}.
                </p>
              )}
            </div>
            {ttsError ? (
              <p className="mt-1 text-[10px] font-medium leading-tight text-red-400">{ttsError}</p>
            ) : null}

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

        <div className="flex shrink-0 flex-col gap-1.5 pb-0.5">
          <div className="flex flex-col gap-0.5">
            <label htmlFor="speak-input-lang" className="text-[9px] font-medium uppercase tracking-wide text-white/45">
              From
            </label>
            <div style={{ "--accent": theme.accent } as CSSProperties}>
              <select
                id="speak-input-lang"
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
              onChange={(e) =>
                setBuffers((prev) => ({
                  ...prev,
                  [activeTurn]: e.target.value,
                }))
              }
              placeholder="Say it plain…"
              className={GLASS_INPUT}
            />
          </div>
          <button type="button" onClick={handleFlipIt} disabled={loading} className={THEME_FLIP_BTN}>
            {loading ? "Flipping…" : "Flip it"}
          </button>

          <div className={GLASS_DUO_CARD}>
            <p className="mb-1 text-center text-[9px] font-medium uppercase tracking-wide text-white/45">Duo mode</p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTurn("me")}
                className={duoBtnClass(activeTurn === "me")}
                style={
                  activeTurn === "me"
                    ? { backgroundColor: theme.accent, borderColor: theme.accent, boxShadow: `0 2px 12px ${theme.accent}44` }
                    : { borderColor: `${theme.accent}33` }
                }
              >
                My Turn
              </button>
              <button
                type="button"
                onClick={() => setActiveTurn("them")}
                className={duoBtnClass(activeTurn === "them")}
                style={
                  activeTurn === "them"
                    ? { backgroundColor: theme.accent, borderColor: theme.accent, boxShadow: `0 2px 12px ${theme.accent}44` }
                    : { borderColor: `${theme.accent}33` }
                }
              >
                Their Turn
              </button>
            </div>
            <p className="mt-1 text-center text-[10px] text-white/40">
              Voice goes into {activeTurn === "me" ? "your" : "their"} line.
            </p>
          </div>

          <div className="grid w-full grid-cols-3 items-start gap-1 overflow-visible pb-1 pt-1">
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
                className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full shadow-xl transition-all duration-500 ease-in-out active:scale-95 ${
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
                  className={`h-10 w-10 ${isListening ? "text-black/90" : "text-white"}`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14C5.52 16.16 8.53 19 12 19s6.48-2.84 6.93-6.86c.09-.6-.39-1.14-1-1.14z" />
                </svg>
              </button>
              <span
                className={`mt-1.5 text-center text-[10px] transition-colors duration-300 ${isListening ? "" : "text-white/50"}`}
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
    </>
  );
}
