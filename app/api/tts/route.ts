import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_VOICE_DEFAULT,
  GOOGLE_VOICE_MAP,
  isGoogleChirpVoiceName,
  resolveGoogleChirp3HdVoiceName,
} from "@/lib/googleTtsVoiceConfig";
import { resolveMinimaxLanguageBoost } from "@/lib/minimaxLanguageBoost";
import { resolveMinimaxTtsTuning } from "@/lib/vibeSpeechConfig";
import { buildMinimaxPronunciationDictForReplicate } from "@/lib/minimaxSlangPronunciation";
import { resolveMinimaxVoiceIdForTts } from "@/lib/minimaxReplicateVoiceResolve";
import {
  getInterjectionPolicy,
  minimaxInterjectionWasApplied,
  shapeTextForMinimaxTts,
} from "@/lib/minimaxInterjectionWriter";
import {
  applyPersonaPresetToProfile,
  parseOptionalPersonaPresetId,
} from "@/lib/personaPresets";
import { getPreferredVibeFallback, parseOptionalPersonalProfileFromBody } from "@/lib/personalSlangProfile";
import { shapeTextForGoogleTts } from "@/lib/googleSpeechWriter";
import { isKnownPremiumDialect } from "@/lib/dialectRegistry";
import { getDialectPack, getDialectPackTtsHints } from "@/lib/dialectPacks";
import { isPremiumSlang } from "@/lib/streetVibeTheme";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** Replicate MiniMax model — speech-2.8-turbo */
const REPLICATE_MINIMAX_VERSION = "minimax/speech-2.8-turbo";

/** Legacy baseline if `resolveMinimaxTtsTuning` were unavailable (not expected). */
const MINIMAX_FALLBACK = { speed: 0.85, pitch: 0, volume: 1.0, emotion: "auto" };

function parseTtsGender(v: unknown): "male" | "female" {
  return v === "female" ? "female" : "male";
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders });
  }

  const engine = typeof body.engine === "string" && body.engine ? body.engine : "minimax";

  const { text, dialect } = body || {};
  const resolvedEngine =
    engine === "minimax" && !isPremiumSlang(typeof dialect === "string" ? dialect : "") ? "google" : engine;

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing text" }, { status: 400, headers: corsHeaders });
  }

  const tuning =
    body.tuning && typeof body.tuning === "object"
      ? (body.tuning as Record<string, unknown>)
      : null;

  /** Dev-only: send `text` to engines without Google/MiniMax speech shaping (slang engine QA). Ignored outside development. */
  const devRawTts = process.env.NODE_ENV === "development" && body.devRawTts === true;

  const profileFromBody = parseOptionalPersonalProfileFromBody(body);
  const personaPresetId = parseOptionalPersonaPresetId(body);
  const effectiveProfile = applyPersonaPresetToProfile(profileFromBody, personaPresetId);
  let vibeContext =
    typeof body.context === "string" && body.context.trim() !== "" ? body.context.trim() : undefined;
  if (vibeContext === undefined && effectiveProfile) {
    const fb = getPreferredVibeFallback(effectiveProfile);
    if (fb) vibeContext = fb;
  }

  if (resolvedEngine === "google") {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500, headers: corsHeaders }
      );
    }

    const dialectKey = typeof dialect === "string" ? dialect : "";
    const voice = GOOGLE_VOICE_MAP[dialectKey] ?? GOOGLE_VOICE_DEFAULT;
    const genderKey = parseTtsGender(body.ttsGender);
    const voiceName = resolveGoogleChirp3HdVoiceName(voice.languageCode, genderKey);
    const speakingRate =
      typeof tuning?.speed === "number" ? tuning.speed : voice.speakingRate;

    const shapedText = devRawTts
      ? text.trim()
      : shapeTextForGoogleTts(text, {
          vibe: vibeContext,
          dialectId: dialectKey || undefined,
        });
    const originalLen = text.length;
    const shapedLen = shapedText.length;
    const shapingChanged = !devRawTts && shapedText !== text;
    const dialectPack = isKnownPremiumDialect(dialectKey) ? getDialectPack(dialectKey) : undefined;
    const dialectPackTtsHints = isKnownPremiumDialect(dialectKey) ? getDialectPackTtsHints(dialectKey) : [];
    console.info("[tts][google] speech shaping", {
      devRawTts,
      originalLen,
      shapedLen,
      shapingChanged,
      personaPresetId: personaPresetId ?? null,
      dialectPackLabel: dialectPack?.displayLabel,
      dialectPackTtsHints,
    });

    const audioConfig: {
      audioEncoding: "MP3";
      speakingRate: number;
      pitch?: number;
    } = {
      audioEncoding: "MP3",
      speakingRate,
      ...(isGoogleChirpVoiceName(voiceName) ? {} : { pitch: voice.pitch }),
    };

    try {
      const ttsRes = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(geminiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text: shapedText },
            voice: { languageCode: voice.languageCode, name: voiceName },
            audioConfig,
          }),
        }
      );

      const data = (await ttsRes.json()) as { audioContent?: string; error?: { message?: string } };

      if (!ttsRes.ok || !data.audioContent) {
        const errMsg =
          data.error?.message || (typeof data === "object" ? JSON.stringify(data.error || data) : "Google TTS failed");
        console.error("Google TTS error:", errMsg);
        return NextResponse.json(
          { error: typeof errMsg === "string" ? errMsg : "Google TTS failed" },
          { status: ttsRes.ok ? 502 : ttsRes.status, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        { audioBase64: data.audioContent, engine: "google" },
        { status: 200, headers: corsHeaders }
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        { error: "Google TTS request failed", details: msg },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing REPLICATE_API_TOKEN" },
      { status: 500, headers: corsHeaders }
    );
  }

  const dialectKeyMm = typeof dialect === "string" ? dialect : "";
  const mmTuning = resolveMinimaxTtsTuning(vibeContext, dialectKeyMm || undefined);

  const speed =
    typeof tuning?.speed === "number"
      ? tuning.speed
      : (mmTuning.minimaxSpeed ?? MINIMAX_FALLBACK.speed);
  const pitch =
    typeof tuning?.pitch === "number"
      ? tuning.pitch
      : (mmTuning.minimaxPitch ?? MINIMAX_FALLBACK.pitch);
  const volume =
    typeof tuning?.volume === "number"
      ? tuning.volume
      : (mmTuning.minimaxVolume ?? MINIMAX_FALLBACK.volume);
  const genderKey = parseTtsGender(body.ttsGender);
  const voiceId = resolveMinimaxVoiceIdForTts(tuning, genderKey);
  const emotion =
    typeof tuning?.emotion === "string" && tuning.emotion.trim() !== ""
      ? tuning.emotion.trim()
      : (mmTuning.minimaxEmotion || MINIMAX_FALLBACK.emotion);

  const minimaxText = devRawTts
    ? text.trim()
    : shapeTextForMinimaxTts(text, {
        vibe: vibeContext,
        dialectId: dialectKeyMm || undefined,
      });

  let ttsInput = minimaxText;
  if (
    process.env.NODE_ENV === "development" &&
    tuning?.devSlangPauseAfterDeadass === true
  ) {
    ttsInput = minimaxText.replace(/\bdeadass\b/gi, "deadass,");
  }

  const interjectionPolicy = getInterjectionPolicy(vibeContext, dialectKeyMm || undefined);
  const dialectPackMm = isKnownPremiumDialect(dialectKeyMm) ? getDialectPack(dialectKeyMm) : undefined;
  const dialectPackTtsHintsMm = isKnownPremiumDialect(dialectKeyMm) ? getDialectPackTtsHints(dialectKeyMm) : [];
  console.info("[tts][minimax] interjection shaping", {
    devRawTts,
    originalLen: text.length,
    shapedLen: minimaxText.length,
    injected: devRawTts ? false : minimaxInterjectionWasApplied(text, minimaxText),
    personaPresetId: personaPresetId ?? null,
    policy: {
      allowed: interjectionPolicy.allowed,
      maxPerUtterance: interjectionPolicy.maxPerUtterance,
      preferredTags: interjectionPolicy.preferredTags,
      placement: interjectionPolicy.placement,
    },
    dialectPackLabel: dialectPackMm?.displayLabel,
    dialectPackTtsHints: dialectPackTtsHintsMm,
  });

  const slangPronunciationEnabled = tuning?.slangPronunciation === true;
  const pronunciationDict = buildMinimaxPronunciationDictForReplicate(slangPronunciationEnabled);
  const englishNormalization =
    typeof tuning?.english_normalization === "boolean" ? tuning.english_normalization : true;

  const minimaxInput: Record<string, unknown> = {
    text: ttsInput,
    voice_id: voiceId,
    speed,
    pitch,
    emotion,
    volume,
    language_boost: resolveMinimaxLanguageBoost(typeof dialect === "string" ? dialect : ""),
    english_normalization: englishNormalization,
  };
  if (pronunciationDict) {
    minimaxInput.pronunciation_dict = pronunciationDict;
  }

  console.info("[tts][minimax] replicate input extras", {
    voiceId,
    slangPronunciationEnabled,
    englishNormalization,
    pronunciationToneCount: pronunciationDict?.tone.length ?? 0,
    devSlangPauseAfterDeadass: tuning?.devSlangPauseAfterDeadass === true,
    ttsInputDiffers: ttsInput !== minimaxText,
  });

  try {
    const minimaxRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: REPLICATE_MINIMAX_VERSION,
        input: minimaxInput,
      }),
    });

    const prediction = await minimaxRes.json();

    if (!minimaxRes.ok || prediction.error) {
      console.error("Replicate error response:", JSON.stringify(prediction));
      return NextResponse.json(
        { error: prediction.error || "Replicate request failed" },
        { status: 502, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        predictionId: prediction.id,
        status: prediction.status,
        output: prediction.output || null,
        engine: "minimax",
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "TTS request failed", details: msg },
      { status: 500, headers: corsHeaders }
    );
  }
}
