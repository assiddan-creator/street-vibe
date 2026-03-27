import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_VOICE_DEFAULT,
  GOOGLE_VOICE_MAP,
  isGoogleChirpVoiceName,
  resolveGoogleChirp3HdVoiceName,
} from "@/lib/googleTtsVoiceConfig";
import { resolveMinimaxEmotionFromVibe } from "@/lib/minimaxTtsEmotion";
import { resolveMinimaxLanguageBoost } from "@/lib/minimaxLanguageBoost";
import { MINIMAX_VOICE_ID_BY_GENDER } from "@/lib/ttsVoiceGender";
import { isPremiumSlang } from "@/lib/streetVibeTheme";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** Replicate MiniMax model — speech-2.8-turbo */
const REPLICATE_MINIMAX_VERSION = "minimax/speech-2.8-turbo";

/** Base MiniMax defaults; `voice_id` from `ttsGender`; `emotion` from Vibe via `resolveMinimaxEmotionFromVibe`. Client `tuning` overrides speed. */
const MINIMAX_DEFAULTS = {
  speed: 0.85,
  pitch: 0,
};

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
            input: { text },
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

  const speed =
    typeof tuning?.speed === "number" ? tuning.speed : MINIMAX_DEFAULTS.speed;
  const pitch =
    typeof tuning?.pitch === "number" ? tuning.pitch : MINIMAX_DEFAULTS.pitch;
  const genderKey = parseTtsGender(body.ttsGender);
  const voiceId = MINIMAX_VOICE_ID_BY_GENDER[genderKey];
  const vibeContext = typeof body.context === "string" ? body.context : undefined;
  const emotion = resolveMinimaxEmotionFromVibe(vibeContext);

  try {
    const minimaxRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: REPLICATE_MINIMAX_VERSION,
        input: {
          text,
          voice_id: voiceId,
          speed,
          pitch,
          emotion,
          volume: (tuning?.volume as number | undefined) ?? 1.0,
          language_boost: resolveMinimaxLanguageBoost(typeof dialect === "string" ? dialect : ""),
          english_normalization: true,
        },
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
