import {
  ANALYTICS_ENGINE,
  ANALYTICS_EVENT_NAMES,
  ANALYTICS_TTS_EVENT_MODE,
  analyticsDurationFieldsFromStart,
  categorizeTtsAnalyticsFailure,
  trackAnalyticsEvent,
} from "@/lib/analyticsEvents";
import type { ImplicitTranslateExtras } from "@/lib/implicitPreferenceEngine";
import { getImplicitSoftExtrasForRequests, getLearnsYouEnabled } from "@/lib/implicitPreferenceEngine";
import {
  isGoogleChirpVoiceName,
  resolveGoogleChirp3HdVoiceName,
  resolveGoogleVoiceForDialect,
} from "@/lib/googleTtsVoiceConfig";
import { resolveMinimaxEmotionFromVibe } from "@/lib/minimaxTtsEmotion";
import { resolveMinimaxLanguageBoost } from "@/lib/minimaxLanguageBoost";
import { isPremiumSlang } from "@/lib/streetVibeTheme";
import { getStoredTtsGender, MINIMAX_VOICE_ID_BY_GENDER } from "@/lib/ttsVoiceGender";

/** BCP-47 locale for Web Speech API synthesis per output dialect. */
export function getDialectLocaleForTts(outputLang: string): string {
  const map: Record<string, string> = {
    "London Roadman": "en-GB",
    "Jamaican Patois": "en-JM",
    "New York Brooklyn": "en-US",
    "Tokyo Gyaru": "ja-JP",
    "Paris Banlieue": "fr-FR",
    "Russian Street": "ru-RU",
    "Israeli Street": "he-IL",
    "Mexico City Barrio": "es-MX",
    "Rio Favela": "pt-BR",
    "English (Standard)": "en-US",
    Spanish: "es-ES",
    French: "fr-FR",
    German: "de-DE",
    Italian: "it-IT",
    Russian: "ru-RU",
    Portuguese: "pt-PT",
    Japanese: "ja-JP",
    Arabic: "ar-SA",
    "Hebrew (Standard)": "he-IL",
  };
  return map[outputLang] ?? "en-US";
}

/** Speak with the browser's built-in TTS (no network). */
export function speakNativeTts(text: string, dialect: string): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.reject(new Error("Speech synthesis not available"));
  }
  return new Promise((resolve, reject) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = getDialectLocaleForTts(dialect);
    u.onend = () => resolve();
    u.onerror = () => reject(new Error("Speech synthesis failed"));
    window.speechSynthesis.speak(u);
  });
}

/** Speed by Vibe; MiniMax `emotion` is set server-side from `context` via `minimaxTtsEmotion`. */
const CONTEXT_TUNING: Record<string, { speed: number }> = {
  dm: { speed: 0.85 },
  flirt: { speed: 0.8 },
  angry: { speed: 1.0 },
  stoned: { speed: 0.8 },
  default: { speed: 0.85 },
};

/** Mirrors server `resolvedEngine` in `app/api/tts/route.ts` for logging. */
function getEffectiveTtsEngine(
  engine: "minimax" | "google" | "native",
  dialect: string
): "minimax" | "google" | "native" {
  if (engine === "native") return "native";
  if (engine === "minimax" && !isPremiumSlang(dialect)) return "google";
  return engine;
}

/** Only for dev + `NEXT_PUBLIC_DEBUG_TTS=true`; never log text in production or by default. */
function isTtsDebugTextPreviewsEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEBUG_TTS === "true"
  );
}

function textPreview(text: string, max = 200): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/** Poll Replicate until TTS prediction completes; returns playable URL (https or data:). `null` when engine is native (playback via Web Speech API). */
export async function fetchTtsAudioUrl(
  text: string,
  dialect: string,
  engine: "minimax" | "google" | "native" = "minimax",
  context?: string,
  implicitExtras?: ImplicitTranslateExtras
): Promise<string | null> {
  const learnsYou = getLearnsYouEnabled();
  const implicitExtrasForLog = implicitExtras ?? getImplicitSoftExtrasForRequests(learnsYou, false, undefined);
  const implicitGuidancePresent = Boolean(
    implicitExtrasForLog?.personalSlangProfile || implicitExtrasForLog?.personaPresetId
  );
  const ttsGender = getStoredTtsGender();
  const vibeKeyForLog = context ?? "default";

  if (engine === "native") {
    const ttsPerfStart = performance.now();
    trackAnalyticsEvent({
      name: ANALYTICS_EVENT_NAMES.TTS_REQUESTED,
      ...ANALYTICS_TTS_EVENT_MODE,
      requestedEngine: ANALYTICS_ENGINE.NATIVE,
      effectiveEngine: ANALYTICS_ENGINE.NATIVE,
      dialect,
      ttsGender,
      vibe: vibeKeyForLog,
      textLengthChars: text.length,
      learnsYouEnabled: learnsYou,
      implicitGuidancePresent,
    });
    if (isTtsDebugTextPreviewsEnabled()) {
      console.info("[TTS]", "Starting TTS request", {
        engineLabel: "Native (browser Web Speech API)",
        engine: "native" as const,
        dialect,
        textLength: text.length,
        textPreview: textPreview(text),
      });
    } else {
      console.info("[TTS]", "Starting TTS request", {
        engineLabel: "Native (browser Web Speech API)",
        engine: "native" as const,
        dialect,
        textLength: text.length,
      });
    }
    try {
      await speakNativeTts(text, dialect);
      trackAnalyticsEvent({
        name: ANALYTICS_EVENT_NAMES.TTS_SUCCEEDED,
        ...ANALYTICS_TTS_EVENT_MODE,
        effectiveEngine: ANALYTICS_ENGINE.NATIVE,
        dialect,
        usedFallbackNative: false,
        ...analyticsDurationFieldsFromStart(ttsPerfStart),
      });
    } catch (e) {
      trackAnalyticsEvent({
        name: ANALYTICS_EVENT_NAMES.TTS_FAILED,
        ...ANALYTICS_TTS_EVENT_MODE,
        effectiveEngine: ANALYTICS_ENGINE.NATIVE,
        dialect,
        errorCode: e instanceof Error ? e.message.slice(0, 120) : "native_tts_error",
        failureCategory: categorizeTtsAnalyticsFailure(e),
        ...analyticsDurationFieldsFromStart(ttsPerfStart),
      });
      throw e;
    }
    return null;
  }

  const tuning = CONTEXT_TUNING[context ?? "default"] ?? CONTEXT_TUNING.default;
  const effectiveEngine = getEffectiveTtsEngine(engine, dialect);

  const vibeKey = context ?? "default";

  const ttsPerfStart = performance.now();
  trackAnalyticsEvent({
    name: ANALYTICS_EVENT_NAMES.TTS_REQUESTED,
    ...ANALYTICS_TTS_EVENT_MODE,
    requestedEngine: engine,
    effectiveEngine,
    dialect,
    ttsGender,
    vibe: vibeKey,
    textLengthChars: text.length,
    learnsYouEnabled: learnsYou,
    implicitGuidancePresent,
  });
  const requestBody = {
    text,
    dialect,
    engine,
    tuning,
    ttsGender,
    context: vibeKey,
    ...(implicitExtras?.personalSlangProfile
      ? { personalSlangProfile: implicitExtras.personalSlangProfile }
      : {}),
    ...(implicitExtras?.personaPresetId ? { personaPresetId: implicitExtras.personaPresetId } : {}),
  };

  const engineLabel =
    effectiveEngine === "google"
      ? "Google Cloud Text-to-Speech (via POST /api/tts)"
      : "MiniMax / Replicate speech-2.8-turbo (via POST /api/tts)";

  if (effectiveEngine === "google") {
    const voice = resolveGoogleVoiceForDialect(dialect);
    const googleVoiceName = resolveGoogleChirp3HdVoiceName(voice.languageCode, ttsGender);
    const speakingRate =
      typeof tuning.speed === "number" ? tuning.speed : voice.speakingRate;
    const audioConfig = {
      audioEncoding: "MP3" as const,
      speakingRate,
      ...(isGoogleChirpVoiceName(googleVoiceName) ? {} : { pitch: voice.pitch }),
    };
    console.info("[TTS]", "Starting TTS request", {
      engineLabel,
      requestedEngine: engine,
      effectiveEngine,
      dialect,
      ttsGender,
      tuning,
      clientPayloadToApiRoute: {
        textLength: text.length,
        dialect,
        engine,
        tuning,
        ttsGender,
      },
      googleRoute: {
        voice: { languageCode: voice.languageCode, name: googleVoiceName },
        audioConfig,
      },
      ...(isTtsDebugTextPreviewsEnabled()
        ? {
            textPreviewDebug: {
              clientPayloadSnippet: textPreview(text),
              googleSynthesizeInputSnippet: textPreview(text, 500),
            },
          }
        : {}),
    });
  } else {
    const voiceId = MINIMAX_VOICE_ID_BY_GENDER[ttsGender];
    console.info("[TTS]", "Starting TTS request", {
      engineLabel,
      requestedEngine: engine,
      effectiveEngine,
      dialect,
      ttsGender,
      tuning,
      clientPayloadToApiRoute: {
        textLength: text.length,
        dialect,
        engine,
        tuning,
        ttsGender,
        context: vibeKey,
      },
      minimaxReplicateInputPreview: {
        voice_id: voiceId,
        speed: tuning.speed,
        pitch: 0,
        emotion: resolveMinimaxEmotionFromVibe(context),
        language_boost: resolveMinimaxLanguageBoost(dialect),
        english_normalization: true,
      },
      ...(isTtsDebugTextPreviewsEnabled()
        ? { textPreviewDebug: { clientPayloadSnippet: textPreview(text) } }
        : {}),
    });
  }

  try {
    const startRes = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const startData = (await startRes.json()) as {
      audioBase64?: string;
      engine?: string;
      predictionId?: string;
      error?: string;
    };
    if (!startRes.ok) {
      const err = new Error(startData.error || "TTS request failed") as Error & { httpStatus?: number };
      err.httpStatus = startRes.status;
      throw err;
    }
    if (startData.audioBase64) {
      console.info("[TTS]", "TTS request completed (inline audio)", {
        reportedEngine: startData.engine ?? "(unknown)",
      });
      trackAnalyticsEvent({
        name: ANALYTICS_EVENT_NAMES.TTS_SUCCEEDED,
        ...ANALYTICS_TTS_EVENT_MODE,
        effectiveEngine,
        dialect,
        usedFallbackNative: false,
        ...analyticsDurationFieldsFromStart(ttsPerfStart),
      });
      return `data:audio/mp3;base64,${startData.audioBase64}`;
    }
    const predictionId = startData.predictionId;
    if (!predictionId) throw new Error("No prediction ID from TTS");

    const maxAttempts = 80;
    for (let i = 0; i < maxAttempts; i++) {
      const pollRes = await fetch("/api/tts-poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictionId }),
      });
      const data = (await pollRes.json()) as {
        status?: string;
        output?: string | string[] | null;
        error?: string | null;
      };

      if (data.status === "succeeded") {
        const out = data.output;
        if (typeof out === "string" && out.startsWith("http")) {
          console.info("[TTS]", "TTS request completed (poll URL)", {
            predictionId,
            urlPreview: `${out.slice(0, 80)}…`,
          });
          trackAnalyticsEvent({
            name: ANALYTICS_EVENT_NAMES.TTS_SUCCEEDED,
            ...ANALYTICS_TTS_EVENT_MODE,
            effectiveEngine,
            dialect,
            usedFallbackNative: false,
            ...analyticsDurationFieldsFromStart(ttsPerfStart),
          });
          return out;
        }
        if (Array.isArray(out) && out[0] && typeof out[0] === "string") {
          console.info("[TTS]", "TTS request completed (poll URL array)", {
            predictionId,
            urlPreview: `${out[0].slice(0, 80)}…`,
          });
          trackAnalyticsEvent({
            name: ANALYTICS_EVENT_NAMES.TTS_SUCCEEDED,
            ...ANALYTICS_TTS_EVENT_MODE,
            effectiveEngine,
            dialect,
            usedFallbackNative: false,
            ...analyticsDurationFieldsFromStart(ttsPerfStart),
          });
          return out[0];
        }
        throw new Error("TTS returned no audio URL");
      }
      if (data.status === "failed" || data.error) {
        throw new Error(typeof data.error === "string" ? data.error : "TTS failed");
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error("TTS timed out");
  } catch (e) {
    console.warn("[TTS]", "API engine failed; falling back to Native browser TTS", {
      requestedEngine: engine,
      effectiveEngine,
      error: e instanceof Error ? e.message : String(e),
    });
    try {
      await speakNativeTts(text, dialect);
      trackAnalyticsEvent({
        name: ANALYTICS_EVENT_NAMES.TTS_SUCCEEDED,
        ...ANALYTICS_TTS_EVENT_MODE,
        effectiveEngine: ANALYTICS_ENGINE.NATIVE,
        dialect,
        usedFallbackNative: true,
        ...analyticsDurationFieldsFromStart(ttsPerfStart),
      });
      return null;
    } catch (e2) {
      trackAnalyticsEvent({
        name: ANALYTICS_EVENT_NAMES.TTS_FAILED,
        ...ANALYTICS_TTS_EVENT_MODE,
        effectiveEngine,
        dialect,
        errorCode: `${e instanceof Error ? e.message.slice(0, 60) : "api"}|${e2 instanceof Error ? e2.message.slice(0, 60) : "native"}`,
        failureCategory: categorizeTtsAnalyticsFailure(e, e2),
        ...analyticsDurationFieldsFromStart(ttsPerfStart),
      });
      throw e2;
    }
  }
}
