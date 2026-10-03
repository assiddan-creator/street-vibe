"use client";

import type { CSSProperties, MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { MaterialSymbol } from "@/components/ui/MaterialSymbol";
import { FlipButtonSkeleton, PopupWordSkeleton, TtsPlaySkeleton } from "@/components/ui/Skeleton";
import { HistoryVaultSheet } from "@/components/HistoryVaultSheet";
import { useCityTheme } from "@/components/theme/CityThemeProvider";
import { LearnsYouControls } from "@/components/LearnsYouControls";
import { VoiceGenderSegment } from "@/components/VoiceGenderSegment";
import { AmbientAccentGlows } from "@/components/AmbientAccentGlows";
import { GraffitiLogo } from "@/components/GraffitiLogo";
import { AuthControl } from "@/components/AuthControl";
import { UsageMeter, type PublicUsage } from "@/components/UsageMeter";
import { Toast } from "@/components/Toast";
import { NativeTransliterationCard } from "@/components/NativeTransliterationCard";
import { TranslationResultCard } from "@/components/TranslationResultCard";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import {
  GLASS_INPUT,
  GLASS_SELECT,
  GLASS_SELECT_COMPACT,
  flagOutline,
  subtleButtonStyle,
  visibleTertiary,
} from "@/lib/themeUiClasses";
import { SLANG_INTENSITY_SEGMENTS, VIBE_SEGMENTS, isAudienceValue } from "@/lib/slangSegmentControls";
import { loadLastAudience, loadLastCity, saveLastAudience, saveLastCity } from "@/lib/lastChoices";
import { exampleInputsFor } from "@/lib/exampleInputs";
import { shareOrDownloadCard } from "@/lib/shareImage";
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
  categorizeTranslateAnalyticsFailure,
  trackAnalyticsEvent,
} from "@/lib/analyticsEvents";
import {
  getImplicitSoftExtrasForRequests,
  getLearnsYouEnabled,
  recordInteractionSignal,
} from "@/lib/implicitPreferenceEngine";
import {
  appendHistoryVaultEntry,
  clearHistoryVault,
  loadHistoryVault,
  type HistoryVaultEntry,
} from "@/lib/historyVault";
import { usesPremiumStreetIntensityControls } from "@/lib/dialectRegistry";
import { shouldOfferHebrewTransliteration } from "@/lib/transliterationPolicy";
import { TOP_HELPER_LABEL_CLASS } from "@/lib/topSectionUi";
import { textDirection } from "@/lib/textDirection";
import { AudioShareButton } from "@/components/AudioShareButton";
import { fetchTtsAudioUrl, type TtsClientEngine } from "@/lib/ttsClient";
import { canOfferBasicVoice, ttsFailureMessage } from "@/lib/ttsErrors";
import { createComparisonController, requestCompareCity, type CompareRow } from "@/lib/compareTranslations";
import { type TtsVoiceGender, getStoredTtsGender, setStoredTtsGender } from "@/lib/ttsVoiceGender";

export function TranslatorView() {
  const [outputLang, setOutputLang] = useState("Jamaican Patois");
  const [inputLanguage, setInputLanguage] = useState("he-IL");
  const [inputText, setInputText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  // Result actions use the settings that produced this text, not the next request's selectors.
  const [resultContext, setResultContext] = useState<{ dialect: string; vibe: string } | null>(null);
  const [dictionaryPills, setDictionaryPills] = useState<string[]>([]);
  const [nativeTransliteration, setNativeTransliteration] = useState<string | null>(null);
  const [uiLocale, setUiLocale] = useState("en");
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
  const [ttsEngine] = useState<TtsClientEngine>("minimax");
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioPreparing, setAudioPreparing] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [offerBasicVoice, setOfferBasicVoice] = useState(false);
  const ttsRequestIdRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Generated audio per (city, voice, vibe, line) — replays never re-bill the voice engine. */
  const ttsAudioCacheRef = useRef(new Map<string, string>());
  const ttsPlayAttemptForCurrentTranslationRef = useRef(0);
  /** Bumped per translation so a slow read-aloud fetch can't land on a newer result. */
  const translitReqIdRef = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryVaultEntry[]>([]);
  const [sharing, setSharing] = useState(false);
  const [appMode, setAppMode] = useState<"translate" | "reply" | "compare" | "check">("translate");
  const [replies, setReplies] = useState<string[]>([]);
  const [compareResults, setCompareResults] = useState<CompareRow[]>([]);
  const [checkResult, setCheckResult] = useState<
    { score: number; verdict: string; fixed: string; tells: string[] } | null
  >(null);
  const [usage, setUsage] = useState<PublicUsage | null>(null);
  const [upgradeAvailable, setUpgradeAvailable] = useState(false);
  const [annualAvailable, setAnnualAvailable] = useState(false);
  const comparisonRef = useRef<ReturnType<typeof createComparisonController> | null>(null);
  if (!comparisonRef.current) {
    comparisonRef.current = createComparisonController(requestCompareCity, (rows) => {
      setCompareResults(rows);
      setLoading(rows.some(row => row.status === "pending"));
    }, setUsage);
  }
  useEffect(() => () => comparisonRef.current?.dispose(), []);


  useEffect(() => {
    setTtsGender(getStoredTtsGender());
    // Returning users land on the city and recipient they used last time.
    const lastCity = loadLastCity();
    if (lastCity && [...OUTPUT_PREMIUM_OPTIONS, ...OUTPUT_STANDARD_OPTIONS].some((o) => o.value === lastCity)) {
      setOutputLang(lastCity);
    }
    const lastAudience = loadLastAudience();
    if (isAudienceValue(lastAudience)) setContext(lastAudience);
  }, []);

  // Daily-quota state for the meter. Silently no-ops when metering is disabled.
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/usage")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { metered?: boolean; upgradeAvailable?: boolean; annualAvailable?: boolean; translate?: PublicUsage } | null) => {
          if (!alive || !d) return;
          setUpgradeAvailable(!!d.upgradeAvailable);
          setAnnualAvailable(!!d.annualAvailable);
          if (d.metered && d.translate) setUsage(d.translate);
        })
        .catch(() => {});
    load();

    // Returning from a successful checkout — celebrate and refresh the plan.
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("upgraded") === "1") {
        setToast("You're on Pro now — unlimited 🎉");
        params.delete("upgraded");
        const qs = params.toString();
        window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
        setTimeout(load, 1500);
      }
    } catch {
      /* ignore */
    }
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setHistoryEntries(loadHistoryVault());
  }, []);

  useEffect(() => {
    setUiLocale(typeof navigator !== "undefined" ? navigator.language : "en");
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const notifyCopiedToast = useCallback(() => {
    setToast("Copied! Ready to paste.");
  }, []);

  const openHistory = useCallback(() => {
    setHistoryEntries(loadHistoryVault());
    setHistoryOpen(true);
  }, []);

  const handleClearHistoryVault = useCallback(() => {
    clearHistoryVault();
    setHistoryEntries([]);
  }, []);

  const copySlangFromHistory = useCallback(
    async (slang: string) => {
      if (!slang.trim()) return;
      try {
        await navigator.clipboard.writeText(slang);
        notifyCopiedToast();
      } catch {
        /* ignore */
      }
    },
    [notifyCopiedToast]
  );

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

  // Auto-grow the input as it fills, capped so it never eats the screen.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [inputDisplayValue]);

  const exampleInputs = useMemo(() => exampleInputsFor(inputLanguage), [inputLanguage]);

  const theme = resolveTheme(outputLang);
  const resultTheme = resultContext ? resolveTheme(resultContext.dialect) : theme;
  const showPremiumIntensityControls = usesPremiumStreetIntensityControls(outputLang);
  const { setDialect } = useCityTheme();

  const restoreFromHistory = useCallback(
    (entry: HistoryVaultEntry) => {
      comparisonRef.current?.clear();
      setAppMode("translate");
      setHistoryOpen(false);
      audioRef.current?.pause();
      audioRef.current = null;
      setTtsPlaying(false);
      setTtsError(null);
      setOutputLang(entry.dialect);
      setInputLanguage(entry.inputLanguage);
      setInputText(entry.sourceText);
      setOriginalText(entry.sourceText);
      setTranslatedText(entry.translatedSlang);
      setResultContext({ dialect: entry.dialect, vibe: entry.vibe });
      setContext(entry.vibe);
      setSlangLevel(entry.slangLevel);
      setNativeTransliteration(entry.nativeTransliteration);
      setDictionaryPills([]);
      setError(null);
      setDialect(entry.dialect);
    },
    [setDialect]
  );

  useEffect(() => {
    setDialect(outputLang);
  }, [outputLang, setDialect]);

  useEffect(() => {
    ttsPlayAttemptForCurrentTranslationRef.current = 0;
  }, [translatedText]);

  useEffect(() => {
    // A late voice response must not play after a different result/voice is selected.
    ttsRequestIdRef.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
    setTtsPlaying(false);
    setTtsLoading(false);
    setTtsError(null);
    setOfferBasicVoice(false);
    return () => {
      ttsRequestIdRef.current += 1;
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
    };
  }, [translatedText, resultContext, ttsGender]);

  const translateText = async (text: string, dialect: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setOriginalText(trimmed);
    setTranslatedText("");
    setResultContext(null);
    setDictionaryPills([]);
    setNativeTransliteration(null);
    const translitReqId = ++translitReqIdRef.current;

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
          isPremiumSelected: usesPremiumStreetIntensityControls(dialect),
          context,
          previousMessage: null,
          sourceLanguage: selectedInputLang,
          uiLocale,
          ...implicitExtras,
        }),
      });

      const data = (await res.json()) as {
        fullText?: string;
        translatedText?: string;
        nativeTransliteration?: string;
        error?: string;
        usage?: PublicUsage;
      };
      if (data.usage) setUsage(data.usage);
      if (!res.ok) {
        const err = new Error(data.error || "Translation failed") as Error & { httpStatus?: number };
        err.httpStatus = res.status;
        throw err;
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
      const translatedFinal = String(data.translatedText ?? translated).trim();

      setTranslatedText(translatedFinal);
      setResultContext({ dialect, vibe: context });
      setDictionaryPills(pills);
      setNativeTransliteration(data.nativeTransliteration?.trim() || null);

      // Read-aloud phonetics: fetched separately so the result isn't blocked on it.
      if (translatedFinal && !data.nativeTransliteration) {
        void fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "transliterate",
            line: translatedFinal,
            sourceLanguage: selectedInputLang,
            uiLocale,
          }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d: { nativeTransliteration?: string } | null) => {
            const t = d?.nativeTransliteration?.trim();
            if (t && translitReqIdRef.current === translitReqId) setNativeTransliteration(t);
          })
          .catch(() => {});
      }

      if (translatedFinal) {
        appendHistoryVaultEntry({
          sourceText: trimmed,
          translatedSlang: translatedFinal,
          nativeTransliteration: data.nativeTransliteration?.trim() || null,
          dialect,
          vibe: context,
          slangLevel,
          inputLanguage: selectedInputLang,
        });
        setHistoryEntries(loadHistoryVault());
      }
    } catch (e) {
      trackAnalyticsEvent({
        name: ANALYTICS_EVENT_NAMES.TRANSLATE_FAILED,
        mode: ANALYTICS_MODE.TEXT,
        targetDialect: dialect,
        failureCategory: categorizeTranslateAnalyticsFailure(e),
        learnsYouEnabled: getLearnsYouEnabled(),
        ...analyticsDurationFieldsFromStart(translatePerfStart),
      });
      setError(e instanceof Error ? e.message : "Translation failed");
      setTranslatedText("");
      setResultContext(null);
      setDictionaryPills([]);
      setNativeTransliteration(null);
    } finally {
      setLoading(false);
    }
  };

  const getReplies = async (received: string, dialect: string) => {
    const trimmed = received.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setOriginalText(trimmed);
    setReplies([]);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "reply",
          text: trimmed,
          currentLang: dialect,
          context,
          slangLevel,
        }),
      });
      const data = (await res.json()) as { replies?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Couldn't get replies");
      setReplies(Array.isArray(data.replies) ? data.replies : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't get replies");
      setReplies([]);
    } finally {
      setLoading(false);
    }
  };

  const getCompare = async (source: string, primary: string) => {
    const trimmed = source.trim();
    if (!trimmed) return;
    setError(null);
    setOriginalText(trimmed);
    await comparisonRef.current?.start({
      text: trimmed, slangLevel, context, sourceLanguage: selectedInputLang, uiLocale,
    }, primary);
  };

  const getNaturalnessCheck = async (draft: string, dialect: string) => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setOriginalText(trimmed);
    setCheckResult(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "naturalness",
          text: trimmed,
          currentLang: dialect,
          context,
          uiLocale,
        }),
      });
      const data = (await res.json()) as {
        naturalness?: { score: number; verdict: string; fixed: string; tells: string[] };
        usage?: PublicUsage;
        error?: string;
      };
      if (data.usage) setUsage(data.usage);
      if (!res.ok || !data.naturalness) throw new Error(data.error || "Couldn't check that");
      setCheckResult(data.naturalness);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't check that");
      setCheckResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFlipIt = () => {
    const src = inputDisplayValue.trim();
    if (appMode === "reply") void getReplies(src, outputLang);
    else if (appMode === "compare") void getCompare(src, outputLang);
    else if (appMode === "check") void getNaturalnessCheck(src, outputLang);
    else void translateText(src, outputLang);
  };

  const switchAppMode = (next: "translate" | "reply" | "compare" | "check") => {
    if (next === appMode) return;
    comparisonRef.current?.clear();
    setAppMode(next);
    // Start each mode with an empty box so old text doesn't mix with new input.
    setInputText("");
    setOriginalText("");
    setReplies([]);
    setCompareResults([]);
    setCheckResult(null);
    setTranslatedText("");
    setResultContext(null);
    setDictionaryPills([]);
    setNativeTransliteration(null);
    setError(null);
  };

  const copyReply = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notifyCopiedToast();
    } catch {
      /* ignore */
    }
  };

  const handleShare = async () => {
    if (sharing || !translatedText.trim() || !resultContext) return;
    setSharing(true);
    try {
      const result = await shareOrDownloadCard({
        original: (originalText || inputDisplayValue).trim(),
        translated: translatedText.trim(),
        city: resultTheme.city,
        flag: resultTheme.flag,
        accent: resultTheme.primary,
        glow: resultTheme.tertiary,
      });
      if (result === "downloaded") setToast("Image saved — ready to post");
    } catch {
      setToast("Couldn't make the image");
    } finally {
      setSharing(false);
    }
  };

  const handleCopy = async () => {
    const text = translatedText.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      notifyCopiedToast();
    } catch {
      /* ignore */
    }
  };

  const handleClear = () => {
    comparisonRef.current?.clear();
    setInputText("");
    setOriginalText("");
    setTranslatedText("");
    setResultContext(null);
    setDictionaryPills([]);
    setNativeTransliteration(null);
    setError(null);
    audioRef.current?.pause();
    audioRef.current = null;
    setTtsPlaying(false);
    setTtsError(null);
  };

  const stopPlayback = () => {
    ttsRequestIdRef.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
    setTtsPlaying(false);
    setTtsLoading(false);
  };

  const handlePlayTranslation = async (useBasicVoice = false) => {
    const text = translatedText.trim();
    if (!text || !resultContext || ttsLoading || audioPreparing) return;
    const { dialect, vibe } = resultContext;
    if (ttsPlaying) {
      stopPlayback();
      return;
    }
    const requestId = ++ttsRequestIdRef.current;
    const selectedEngine = useBasicVoice ? "native" : ttsEngine;
    ttsPlayAttemptForCurrentTranslationRef.current += 1;
    if (ttsPlayAttemptForCurrentTranslationRef.current > 1) {
      trackAnalyticsEvent({
        name: ANALYTICS_EVENT_NAMES.TTS_REPLAYED,
        mode: ANALYTICS_MODE.TEXT,
        dialect,
        requestedEngine: selectedEngine,
      });
    }
    setTtsError(null);
    setOfferBasicVoice(false);
    // Cache only generated audio; choosing a basic voice never makes a paid call.
    const cacheKey = `${selectedEngine}|${dialect}|${ttsGender}|${vibe}|${text}`;
    let url = useBasicVoice ? null : ttsAudioCacheRef.current.get(cacheKey) ?? null;
    try {
      if (!url) {
        setTtsLoading(selectedEngine !== "native");
        setTtsPlaying(selectedEngine === "native");
        const implicitExtras = getImplicitSoftExtrasForRequests(getLearnsYouEnabled(), false, undefined);
        url = await fetchTtsAudioUrl(text, dialect, selectedEngine, vibe, implicitExtras, {
          explicitBasicVoice: useBasicVoice,
        });
        if (requestId !== ttsRequestIdRef.current) return;
        if (url === null) {
          setTtsPlaying(false);
          return;
        }
        ttsAudioCacheRef.current.set(cacheKey, url);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        if (requestId === ttsRequestIdRef.current) setTtsPlaying(false);
      };
      audio.onerror = () => {
        if (requestId !== ttsRequestIdRef.current) return;
        ttsAudioCacheRef.current.delete(cacheKey);
        setTtsPlaying(false);
        setTtsError("Couldn't play the audio. Try again or choose the basic browser voice.");
        setOfferBasicVoice(true);
      };
      setTtsPlaying(true);
      await audio.play();
    } catch (e) {
      if (requestId !== ttsRequestIdRef.current) return;
      if (url) ttsAudioCacheRef.current.delete(cacheKey);
      setTtsError(useBasicVoice ? "The basic browser voice couldn't play. Try the selected voice again." : ttsFailureMessage(e));
      setOfferBasicVoice(!useBasicVoice && canOfferBasicVoice(e));
      setTtsPlaying(false);
    } finally {
      if (requestId === ttsRequestIdRef.current) setTtsLoading(false);
    }
  };

  const handleWordClick = async (word: string, e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (!resultContext) return;
    const { dialect } = resultContext;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = rect.left;
    // The popup is position:fixed, so viewport coordinates — adding scrollY
    // would push it off the word once the page has scrolled.
    const y = rect.bottom + 6;
    const clean = word.replace(/[^a-zA-ZÀ-ÿА-яёÀ-ÿ\u3040-\u30FF\uAC00-\uD7AF]/g, "").trim();
    if (!clean) return;
    const local = lookupSlang(clean, dialect);
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
          text: `In the context of ${dialect} slang, the sentence is: "${translatedText}". What does the word "${clean}" mean in THIS specific context? Reply in this exact format: MEANING: <one line meaning in context> | EXAMPLE: <one example sentence>`,
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
  /** Outline roles: selection controls = primary, inputs = secondary, chrome = visible tertiary. */
  const outlineAccent = visibleTertiary(theme);
  const micBall = cityTheme.micBall ?? null;
  const isActive = inputText.trim().length > 0 || originalText.trim().length > 0;
  const isIdle = !isActive;
  const hebrewContext = shouldOfferHebrewTransliteration(selectedInputLang, uiLocale);
  const hasAnyResult = Boolean(
    translatedText || replies.length || compareResults.length || checkResult || loading || error
  );
  // One-line recap of the collapsed settings, so "More options" never hides state.
  const optionsSummary = [
    INPUT_LANGUAGES.find((l) => l.value === inputLanguage)?.label.split(" / ").pop() ?? inputLanguage,
    `${ttsGender === "female" ? "Female" : "Male"} voice`,
    showPremiumIntensityControls ? SLANG_INTENSITY_SEGMENTS.find((s) => s.level === slangLevel)?.text : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="relative w-full">
      <AmbientAccentGlows accent={theme.tertiary} />
      <div className="relative z-10 w-full">
      <Toast message={toast} accent={theme.tertiary} />
      <HistoryVaultSheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        accent={theme.primary}
        glow={outlineAccent}
        entries={historyEntries}
        onClear={handleClearHistoryVault}
        onCopySlang={copySlangFromHistory}
        onRestore={restoreFromHistory}
      />
      {popupWord && (
        <div
          className="fixed z-50 max-w-[260px] rounded-xl border border-white/10 bg-black/90 p-3 shadow-2xl backdrop-blur-md"
          style={{ left: Math.min(popupWord.x, window.innerWidth - 280), top: popupWord.y }}
        >
          <button
            type="button"
            onClick={() => setPopupWord(null)}
            className="absolute right-2 top-2 text-white/55 hover:text-white"
          >
            ✕
          </button>
          <p className="mb-1 pr-6 text-[13px] font-bold text-white">{popupWord.word}</p>
          {popupLoading ? (
            <PopupWordSkeleton />
          ) : (
            <p className="text-[13px] text-white/85">{popupWord.meaning}</p>
          )}
          {popupWord.example ? (
            <p className="mt-1 text-[12px] italic text-white/60">&quot;{popupWord.example}&quot;</p>
          ) : null}
        </div>
      )}

      <div
        className="mx-auto flex min-w-0 w-full max-w-[min(100%,440px)] flex-col px-2.5 pb-4 pt-3 lg:max-w-[1040px] lg:px-6"
        onClick={() => setPopupWord(null)}
      >
        <header className="relative mb-4 flex shrink-0 items-center justify-center rounded-2xl bg-white/[0.03] px-[5.5rem] py-2 backdrop-blur-xl">
          <button
            type="button"
            onClick={openHistory}
            aria-label="My phrases"
            title="My phrases"
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            style={flagOutline(outlineAccent)}
          >
            <MaterialSymbol name="history" className="text-[20px]" />
          </button>
          <GraffitiLogo accent={theme.primary} compact={isIdle} className="w-full max-w-[min(100%,340px)]" />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <AuthControl accent={outlineAccent} />
          </div>
        </header>

        <div
          className="mx-auto mb-4 grid w-full max-w-[min(100%,320px)] grid-cols-4 gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-xl"
          role="group"
          aria-label="Mode"
        >
          {(["translate", "reply", "compare", "check"] as const).map((m) => {
            const on = appMode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => switchAppMode(m)}
                className={`min-w-0 rounded-full px-1 py-2 text-center text-[12px] font-semibold transition-all duration-300 ${
                  on ? "" : "text-white/55 hover:text-white/80"
                }`}
                style={
                  on
                    ? {
                        ...flagOutline(theme.primary, true),
                        color: theme.primary,
                        backgroundColor: `${theme.primary}24`,
                        boxShadow: `inset 0 1px 0 ${theme.primary}44`,
                      }
                    : flagOutline(theme.primary)
                }
              >
                {m === "translate"
                  ? "Say it"
                  : m === "reply"
                    ? "Reply"
                    : m === "compare"
                      ? "Compare"
                      : "Check"}
              </button>
            );
          })}
        </div>

        <UsageMeter
          usage={usage}
          palette={theme}
          upgradeAvailable={upgradeAvailable}
          annualAvailable={annualAvailable}
        />

        <div className="lg:grid lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start lg:gap-10">
        {/* Compose column: city, message, recipient, one clear action. */}
        <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="output-lang" className={TOP_HELPER_LABEL_CLASS}>
            Translate to
          </label>
          {isIdle ? (
            <div
              className="mx-auto w-full rounded-xl border border-white/[0.05] bg-black/18 px-3 py-0.5 backdrop-blur-sm"
              style={flagOutline(theme.secondary)}
            >
            <select
              id="output-lang"
              value={outputLang}
              onChange={(e) => {
                const v = e.target.value;
                setOutputLang(v);
                saveLastCity(v);
                trackAnalyticsEvent({
                  name: ANALYTICS_EVENT_NAMES.TARGET_DIALECT_SELECTED,
                  targetDialect: v,
                  mode: ANALYTICS_MODE.TEXT,
                });
                if (getLearnsYouEnabled()) {
                  recordInteractionSignal({ type: "dialect_select", dialectId: v, timestampMs: Date.now() });
                }
              }}
              className="w-full cursor-pointer border-0 bg-transparent py-2 text-center text-[13px] text-white/85 outline-none ring-0"
            >
              <optgroup label="City slang" className="bg-zinc-900 text-white">
                {OUTPUT_PREMIUM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-zinc-900 text-white">
                    {o.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Standard languages" className="bg-zinc-900 text-white">
                {OUTPUT_STANDARD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-zinc-900 text-white">
                    {o.label}
                  </option>
                ))}
              </optgroup>
            </select>
            </div>
          ) : (
            <div style={{ "--accent": theme.primary } as CSSProperties}>
              <select
                id="output-lang"
                value={outputLang}
                onChange={(e) => {
                  const v = e.target.value;
                  setOutputLang(v);
                  saveLastCity(v);
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
                style={flagOutline(theme.secondary)}
              >
                <optgroup label="City slang" className="bg-zinc-900 text-white">
                  {OUTPUT_PREMIUM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-zinc-900 text-white">
                      {o.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Standard languages" className="bg-zinc-900 text-white">
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

        <div className="relative w-full" style={{ "--accent": theme.primary } as CSSProperties}>
          <textarea
            ref={inputRef}
            rows={1}
            value={inputDisplayValue}
            readOnly={isListening}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!loading && inputDisplayValue.trim()) handleFlipIt();
              }
            }}
            placeholder={
              appMode === "reply"
                ? "Paste what they sent you…"
                : appMode === "compare"
                  ? "Type it once — hear it 3 ways…"
                  : appMode === "check"
                    ? "Paste what you wrote — I'll check it sounds local…"
                    : "Type or say it plain…"
            }
            dir="auto"
            className={`${GLASS_INPUT} resize-none bg-white/3 !px-9 text-start leading-relaxed`}
            style={flagOutline(theme.secondary)}
          />
          {inputDisplayValue.trim() ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear"
              title="Clear"
              className={`absolute top-2 flex h-6 w-6 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white ${
                textDirection(inputDisplayValue) === "rtl" ? "left-2" : "right-2"
              }`}
            >
              <MaterialSymbol name="close" className="text-[16px]" />
            </button>
          ) : null}
          {appMode === "translate" && isIdle && !inputText.trim() && !isListening ? (
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {exampleInputs.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => {
                    setInputText(phrase);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] text-white/60 transition-colors hover:border-white/20 hover:text-white/85"
                  style={flagOutline(outlineAccent)}
                >
                  {phrase}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Big centered mic — the main element (restored from before the compose layout). */}
        <div className="flex flex-col items-center py-1">
          <button
            type="button"
            onClick={toggleMic}
            aria-label={isListening ? "Stop listening" : "Tap to speak"}
            title={isListening ? "Stop listening" : "Tap to speak"}
            className={`relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full transition-all duration-200 ease-out active:scale-95 ${
              isListening ? "mic-pulse border-transparent" : isIdle ? "animate-pulse-slow" : ""
            }`}
            style={
              isListening
                ? {
                    boxShadow: `0 0 0 2px ${theme.secondary}, 0 12px 56px ${theme.tertiary}77, 0 0 100px ${theme.tertiary}66, 0 8px 28px rgba(0,0,0,0.45)`,
                  }
                : {
                    boxShadow: `0 0 0 1px ${theme.secondary}55, 0 0 120px -8px ${theme.tertiary}99, 0 24px 64px ${theme.tertiary}44, 0 12px 40px rgba(0,0,0,0.55)`,
                  }
            }
          >
            {micBall ? (
              // Source art is ~630 KB; next/image serves a resized copy for a 96px button.
              <Image src={micBall} alt="" fill sizes="96px" className="rounded-full object-cover" draggable={false} />
            ) : (
              <MaterialSymbol name="mic" className="text-[40px]" />
            )}
          </button>
          {isListening ? (
            <p className="mt-2 text-center text-[13px]" style={{ color: theme.primary }}>
              listening… tap the mic to stop
            </p>
          ) : isActive ? (
            <p className="mt-2 text-center text-[13px] text-white/55">tap to speak again</p>
          ) : (
            <>
              <p
                className="mt-3 text-center text-[13px] uppercase"
                style={{ color: theme.secondaryText, letterSpacing: "0.15em" }}
              >
                or tap to speak
              </p>
              <p className="mt-1 text-center text-[11px] tracking-wider text-white/50">speak or type in any language</p>
            </>
          )}
          {micError ? <p className="mt-1 text-center text-[12px] text-red-400">{micError}</p> : null}
        </div>

          <div className="flex flex-col gap-2">
            <p className="font-label mb-0 flex items-center justify-center gap-1.5 text-center text-[12px] font-medium uppercase tracking-widest text-white/60">
              <MaterialSymbol name="person" className="text-[13px]" />
              Who&apos;s it for?
            </p>
            <div
              className="mx-auto grid w-full grid-cols-2 gap-1.5 rounded-2xl border border-white/5 bg-white/5 p-1.5 shadow-none backdrop-blur-xl transition-opacity"
              role="group"
              aria-label="Who is the message for"
            >
              {VIBE_SEGMENTS.map(({ value, text, icon }) => {
                const on = context === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setContext(value);
                      saveLastAudience(value);
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
                    className={`flex h-11 w-full min-w-0 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-all duration-300 ${
                      on ? "" : "bg-transparent text-white/60 hover:text-white/80"
                    }`}
                    style={
                      on
                        ? {
                            ...flagOutline(outlineAccent, true),
                            color: theme.primary,
                            backgroundColor: `${theme.primary}24`,
                            boxShadow: `0 0 24px -8px ${theme.tertiary}aa, inset 0 1px 0 ${theme.primary}44`,
                          }
                        : flagOutline(outlineAccent)
                    }
                  >
                    <MaterialSymbol name={icon} className="text-[15px]" />
                    {text}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex w-full items-center">
            <button
              type="button"
              onClick={handleFlipIt}
              disabled={loading || !inputDisplayValue.trim()}
              className="relative w-full overflow-hidden rounded-2xl border border-white/5 bg-white/5 py-3.5 font-bold text-white shadow-none backdrop-blur-2xl transition-all duration-300 hover:bg-white/[0.07] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white/5"
              style={{
                fontFamily: "'Permanent Marker', cursive",
                fontSize: "1.05rem",
                borderColor: `${theme.primary}30`,
                boxShadow: `0 0 0 1px ${theme.primary}20, inset 0 1px 0 ${theme.primary}18`,
              }}
            >
              {cityTheme.bg?.wide ? (
                <Image
                  src={cityTheme.bg.wide}
                  alt=""
                  fill
                  // The art is a glass ball in the middle half of a dark 16:9 frame: zoom ~2.1x
                  // around the center so the ball spans the full button (no dark side areas).
                  sizes="(max-width: 768px) 210vw, 1000px"
                  className="scale-[2.1] object-cover object-center opacity-75"
                  draggable={false}
                />
              ) : null}
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(135deg, ${theme.primary}28 0%, rgba(0,0,0,0.55) 100%)` }}
              />
              <span className="relative z-10 flex w-full justify-center drop-shadow-lg">
                {loading ? (
                  <FlipButtonSkeleton />
                ) : appMode === "reply" ? (
                  "Get replies 💬"
                ) : appMode === "compare" ? (
                  "Hear it 3 ways 🎭"
                ) : appMode === "check" ? (
                  "Check it 🕵️"
                ) : (
                  "Flip it 🔥"
                )}
              </span>
            </button>
          </div>
          {appMode === "compare" ? (
            <p className="text-center text-xs text-white/60">
              Comparing 3 cities uses 3 translations when daily limits apply.
              Each city retry uses 1 more; failed generation attempts may still count.
            </p>
          ) : null}

          <details className="group rounded-2xl bg-white/[0.03] px-3 py-2 backdrop-blur-xl" style={flagOutline(outlineAccent)}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-1 text-[12px] font-medium text-white/60 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-1.5 uppercase tracking-widest">
                <MaterialSymbol name="tune" className="text-[14px]" />
                More options
              </span>
              <span className="truncate text-[11px] normal-case tracking-normal text-white/45">
                {optionsSummary}
              </span>
            </summary>
            <div className="mt-3 flex flex-col gap-4 pb-1">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="input-lang" className={TOP_HELPER_LABEL_CLASS}>
            I speak
          </label>
          {isIdle ? (
            <div
              className="mx-auto w-full rounded-xl border border-white/[0.05] bg-black/18 px-3 py-0.5 backdrop-blur-sm"
              style={flagOutline(theme.secondary)}
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
              className="w-full cursor-pointer border-0 bg-transparent py-2 text-center text-[13px] text-white/85 outline-none ring-0"
            >
              {INPUT_LANGUAGES.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
            </div>
          ) : (
            <div style={{ "--accent": theme.primary } as CSSProperties}>
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
                style={flagOutline(theme.secondary)}
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
        <div className="flex w-full justify-center">
          <VoiceGenderSegment
            accent={theme.primary}
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
          {showPremiumIntensityControls ? (
            <div className="flex flex-col gap-2">
              <p className="font-label mb-0 flex items-center justify-center gap-1.5 text-center text-[12px] font-medium uppercase tracking-widest text-white/60">
                <MaterialSymbol name="bolt" className="text-[13px]" />
                Intensity
              </p>
              <div
                className="mx-auto flex w-full max-w-full flex-wrap items-center justify-center gap-1 rounded-full border border-white/5 bg-white/5 p-1.5 shadow-none backdrop-blur-xl"
                role="group"
                aria-label="Slang intensity"
              >
                {SLANG_INTENSITY_SEGMENTS.map(({ level, text, icon }) => {
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
                      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold transition-all duration-300 ${
                        on ? "" : "bg-transparent text-white/60 hover:text-white/80"
                      }`}
                      style={
                        on
                          ? {
                              ...flagOutline(outlineAccent, true),
                              color: theme.primary,
                              backgroundColor: `${theme.primary}24`,
                              boxShadow: `0 0 24px -8px ${theme.tertiary}aa, inset 0 1px 0 ${theme.primary}44`,
                            }
                          : flagOutline(outlineAccent)
                      }
                    >
                      <MaterialSymbol name={icon} className="text-[15px]" />
                      {text}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        <div className="mx-auto mt-2 flex w-full max-w-[min(100%,280px)] flex-col items-stretch gap-2 px-3 pb-1 sm:px-4">
          <LearnsYouControls accent={outlineAccent} idle={isIdle} belowHero onHistoryClick={openHistory} />
        </div>
            </div>
          </details>
        </div>

        {/* Result column — beside the composer on desktop, below it on phones. */}
        <div className="mt-6 min-w-0 lg:sticky lg:top-6 lg:mt-0">
          {!hasAnyResult ? (
            <div className="hidden min-h-[240px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 p-8 text-center lg:flex">
              <MaterialSymbol name="chat_bubble" className="text-[28px] text-white/25" />
              <p className="text-[14px] text-white/50">Your local version lands here.</p>
              <p className="text-[12px] text-white/35">Type a message on the left, pick who it&apos;s for, and hit {appMode === "translate" ? "Flip it" : "the button"}.</p>
            </div>
          ) : null}
          <section
            className={`min-w-0 w-full shrink-0 overflow-visible transition-all duration-500 ${
              translatedText || replies.length || compareResults.length || checkResult || loading || error
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            }`}
          >
            <div className="flex w-full min-w-0 flex-col gap-4 overflow-visible">
              {appMode === "compare" ? (
                <div className="flex w-full min-w-0 flex-col gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-2xl">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/55">
                    You said
                  </p>
                  <p
                    className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-white/85"
                    dir="auto"
                  >
                    {originalText.trim() || "—"}
                  </p>
                  <div className="mt-1 flex flex-col gap-2 border-t border-white/5 pt-3">
                    {compareResults.map((r) => (
                      <div
                        key={r.dialect}
                        className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
                        style={flagOutline(visibleTertiary(resolveTheme(r.dialect)))}
                        aria-busy={r.status === "pending"}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: resolveTheme(r.dialect).primary }}>
                          {resolveTheme(r.dialect).flag} {resolveTheme(r.dialect).city}
                        </p>
                        {r.status === "pending" ? (
                          <p role="status" className="text-sm text-white/50">Translating…</p>
                        ) : r.status === "error" ? (
                          <>
                            <p role="alert" className="text-sm text-red-400">{r.error}</p>
                            <button
                              type="button"
                              onClick={() => void comparisonRef.current?.retry(r.dialect)}
                              aria-label={`Retry ${resolveTheme(r.dialect).city}`}
                              className="self-start rounded-full border border-white/20 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                            >
                              Retry this city · 1 translation
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void copyReply(r.text)}
                            aria-label={`Copy ${resolveTheme(r.dialect).city} translation`}
                            className="whitespace-pre-wrap break-words text-start text-[16px] leading-snug text-white/90 hover:text-white"
                            dir="auto"
                          >
                            {r.text}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : appMode === "reply" ? (
                <div className="flex w-full min-w-0 flex-col gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-2xl">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/55">
                    They said
                  </p>
                  <p
                    className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-white/85"
                    dir="auto"
                  >
                    {originalText.trim() || "—"}
                  </p>
                  <div className="mt-1 border-t border-white/5 pt-3">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/55">
                      Send back
                    </p>
                    {loading ? (
                      <p className="text-[14px] text-white/50">cooking replies…</p>
                    ) : error ? (
                      <p className="text-[14px] text-red-400/95">{error}</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {replies.map((r, i) => (
                          <button
                            key={`${i}-${r.slice(0, 12)}`}
                            type="button"
                            onClick={() => void copyReply(r)}
                            className="group flex items-start gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5 text-start transition-colors hover:bg-white/[0.07]"
                            style={flagOutline(outlineAccent)}
                          >
                            <span
                              className="flex-1 whitespace-pre-wrap break-words text-[15px] leading-snug"
                              style={{ color: theme.primary }}
                              dir="auto"
                            >
                              {r}
                            </span>
                            <svg
                              className="mt-0.5 h-4 w-4 shrink-0 text-white/30 transition-colors group-hover:text-white/70"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          </button>
                        ))}
                        {replies.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              const src = (originalText || inputDisplayValue).trim();
                              if (src && !loading) void getReplies(src, outputLang);
                            }}
                            disabled={loading}
                            className="mt-1 self-center rounded-full px-3 py-2 text-[12px] font-medium text-white/55 transition-colors hover:text-white/90 disabled:opacity-40"
                          >
                            ↻ more options
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              ) : appMode === "check" ? (
                <div className="flex w-full min-w-0 flex-col gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-2xl">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/55">
                    You wrote
                  </p>
                  <p
                    className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-white/85"
                    dir="auto"
                  >
                    {originalText.trim() || "—"}
                  </p>
                  <div className="mt-1 flex flex-col gap-3 border-t border-white/5 pt-3">
                    {loading ? (
                      <p className="text-[14px] text-white/50">reading it like a local…</p>
                    ) : error ? (
                      <p className="text-[14px] text-red-400/95">{error}</p>
                    ) : checkResult ? (
                      <>
                        {(() => {
                          // A precise number ("87") implies an authority the model doesn't
                          // have. Show a coarse, honest band plus the model's own verdict.
                          const band =
                            checkResult.score >= 80
                              ? { label: "Sounds local", c: "#4ade80" }
                              : checkResult.score >= 55
                                ? { label: "Almost there", c: "#fbbf24" }
                                : { label: "Sounds like a visitor", c: "#f87171" };
                          return (
                            <div className="flex flex-col gap-1.5">
                              <span
                                className="w-fit rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-wide"
                                style={{
                                  color: band.c,
                                  border: `1px solid ${band.c}55`,
                                  backgroundColor: `${band.c}18`,
                                }}
                              >
                                {band.label}
                              </span>
                              {checkResult.verdict ? (
                                <span className="text-[14px] font-semibold text-white/85" dir="auto">
                                  {checkResult.verdict}
                                </span>
                              ) : null}
                            </div>
                          );
                        })()}
                        <div>
                          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/55">
                            Send this instead
                          </p>
                          <button
                            type="button"
                            onClick={() => void copyReply(checkResult.fixed)}
                            className="group flex w-full items-start gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5 text-start transition-colors hover:bg-white/[0.07]"
                            style={flagOutline(outlineAccent)}
                          >
                            <span
                              className="flex-1 whitespace-pre-wrap break-words text-[15px] leading-snug"
                              style={{ color: theme.primary }}
                              dir="auto"
                            >
                              {checkResult.fixed}
                            </span>
                            <svg
                              className="mt-0.5 h-4 w-4 shrink-0 text-white/30 transition-colors group-hover:text-white/70"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          </button>
                        </div>
                        {checkResult.tells.length > 0 ? (
                          <div>
                            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/55">
                              What gave you away
                            </p>
                            <ul className="flex flex-col gap-1">
                              {checkResult.tells.map((t, i) => (
                                <li
                                  key={`${i}-${t.slice(0, 12)}`}
                                  className="flex items-start gap-2 text-[13px] leading-snug text-white/70"
                                  dir="auto"
                                >
                                  <span style={{ color: theme.primary }}>•</span>
                                  <span className="flex-1">{t}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-[13px] text-white/55">Nothing obvious gave you away — this one lands.</p>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              ) : (
              <>
              <TranslationResultCard
                accent={resultTheme.primary}
                glow={visibleTertiary(resultTheme)}
                originalText={originalText}
                translatedText={translatedText}
                dictionaryPills={dictionaryPills}
                loading={loading}
                error={error}
                hebrewContext={hebrewContext}
                onWordClick={(token, e) => void handleWordClick(token, e)}
                afterTranslation={
                  translatedText.trim() ? (
                    <div className="mt-3 flex flex-col gap-1">
                      <p className="text-xs text-white/60" dir="auto">
                        {resultTheme.flag} {resultTheme.city}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handlePlayTranslation()}
                          disabled={ttsLoading || audioPreparing}
                          aria-label={ttsPlaying ? "Stop" : ttsError ? "Retry voice" : "Read aloud"}
                          className="relative flex-1 overflow-hidden rounded-2xl py-3 text-sm font-bold backdrop-blur-xl transition-all duration-300 hover:brightness-125 active:scale-[0.99] disabled:opacity-45"
                          style={{ ...subtleButtonStyle(theme), fontFamily: "'Permanent Marker', cursive" }}
                        >
                          {ttsLoading ? (
                            <TtsPlaySkeleton />
                          ) : ttsPlaying ? (
                            "■ Stop"
                          ) : (
                            ttsError ? "↻ Retry voice" : "▶ Read aloud"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCopy()}
                          aria-label="Copy"
                          title="Copy"
                          className="flex w-14 shrink-0 items-center justify-center rounded-2xl backdrop-blur-xl transition-all duration-300 hover:brightness-125 active:scale-[0.97]"
                          style={subtleButtonStyle(theme)}
                        >
                          <MaterialSymbol name="content_copy" className="text-[20px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleShare()}
                          disabled={sharing}
                          aria-label="Share as image"
                          className="flex w-14 shrink-0 items-center justify-center rounded-2xl backdrop-blur-xl transition-all duration-300 hover:brightness-125 active:scale-[0.97] disabled:opacity-45"
                          style={subtleButtonStyle(theme)}
                        >
                          {sharing ? (
                            <span className="text-[13px]">…</span>
                          ) : (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {resultContext ? <AudioShareButton
                        key={JSON.stringify([translatedText, resultContext, ttsGender, ttsEngine])}
                        city={resultTheme.city}
                        buttonStyle={subtleButtonStyle(theme)}
                        disabled={ttsLoading || sharing}
                        onPreparing={setAudioPreparing}
                        prepare={async () => {
                          const { dialect, vibe } = resultContext;
                          const text = translatedText.trim();
                          const cacheKey = `${ttsEngine}|${dialect}|${ttsGender}|${vibe}|${text}`;
                          const cached = ttsAudioCacheRef.current.get(cacheKey);
                          if (cached) return cached;
                          const extras = getImplicitSoftExtrasForRequests(getLearnsYouEnabled(), false, undefined);
                          const url = await fetchTtsAudioUrl(text, dialect, ttsEngine, vibe, extras);
                          if (url) ttsAudioCacheRef.current.set(cacheKey, url);
                          return url;
                        }}
                      /> : null}
                      {ttsError ? (
                        <div role="alert" className="flex flex-col items-center gap-2">
                          <p className="text-center text-[12px] text-red-400">{ttsError}</p>
                          {offerBasicVoice ? (
                            <button
                              type="button"
                              onClick={() => void handlePlayTranslation(true)}
                              disabled={ttsLoading || ttsPlaying || audioPreparing}
                              className="rounded-full border border-white/20 px-3 py-2 text-xs text-white/80 disabled:opacity-45"
                            >
                              Play basic browser voice (accent may differ)
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          const src = (originalText || inputDisplayValue).trim();
                          if (src && !loading) void translateText(src, outputLang);
                        }}
                        disabled={loading}
                        className="mt-1 self-center rounded-full px-3 py-1 text-[12px] font-medium text-white/55 transition-colors hover:text-white/90 disabled:opacity-40"
                      >
                        ↻ Try another take
                      </button>
                    </div>
                  ) : null
                }
              />
              {nativeTransliteration?.trim() ? (
                <NativeTransliterationCard text={nativeTransliteration} sourceLanguage={selectedInputLang} />
              ) : null}
              </>
              )}
            </div>
          </section>
        </div>
        </div>
      </div>
      </div>
    </div>
  );
}
