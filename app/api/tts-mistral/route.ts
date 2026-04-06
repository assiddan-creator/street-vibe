import { Mistral } from "@mistralai/mistralai";
import { NextRequest, NextResponse } from "next/server";
import {
  applyPersonaPresetToProfile,
  parseOptionalPersonaPresetId,
} from "@/lib/personaPresets";
import { getPreferredVibeFallback, parseOptionalPersonalProfileFromBody } from "@/lib/personalSlangProfile";
import { shapeTextForMinimaxTts } from "@/lib/minimaxInterjectionWriter";
import {
  ARABIC_EGYPTIAN_DIALECT_ID,
  normalizeArabicPremiumForSpeech,
} from "@/lib/arabicPremiumSpeechNormalize";
import {
  SPANISH_MADRID_DIALECT_ID,
  normalizeSpanishMadridForSpeech,
} from "@/lib/spanishMadridSpeechNormalize";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const VOXTRAL_MODEL = "voxtral-mini-tts-2603";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing MISTRAL_API_KEY" },
      { status: 500, headers: corsHeaders }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders });
  }

  const { text, dialect } = body || {};
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing text" }, { status: 400, headers: corsHeaders });
  }

  const voiceIdRaw =
    typeof body.voice_id === "string"
      ? body.voice_id
      : typeof body.voiceId === "string"
        ? body.voiceId
        : null;
  const voiceId = voiceIdRaw && voiceIdRaw.trim() !== "" ? voiceIdRaw.trim() : null;
  if (!voiceId) {
    return NextResponse.json(
      { error: "Missing voice_id (Mistral Voice Profile)" },
      { status: 400, headers: corsHeaders }
    );
  }

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

  const dialectKeyMm = typeof dialect === "string" ? dialect : "";

  const minimaxText = devRawTts
    ? text.trim()
    : shapeTextForMinimaxTts(text, {
        vibe: vibeContext,
        dialectId: dialectKeyMm || undefined,
      });

  let ttsInput = minimaxText;
  ttsInput = ttsInput.replace(/\bdeadass\b/gi, "deadass,");
  if (!devRawTts && dialectKeyMm === ARABIC_EGYPTIAN_DIALECT_ID) {
    ttsInput = normalizeArabicPremiumForSpeech(ttsInput, dialectKeyMm);
  } else if (!devRawTts && dialectKeyMm === SPANISH_MADRID_DIALECT_ID) {
    ttsInput = normalizeSpanishMadridForSpeech(ttsInput, dialectKeyMm);
  }

  const client = new Mistral({ apiKey });

  /** Non-streaming: full MP3 as base64 in JSON (`audioData`). */
  try {
    const response = await client.audio.speech.complete({
      model: VOXTRAL_MODEL,
      input: ttsInput,
      voiceId,
      responseFormat: "mp3",
    });

    const audioData =
      "audioData" in response && typeof response.audioData === "string" ? response.audioData : null;
    if (!audioData) {
      return NextResponse.json(
        { error: "Mistral TTS returned no audio" },
        { status: 502, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { audioBase64: audioData, engine: "mistral-voxtral" },
      { status: 200, headers: corsHeaders }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[tts-mistral]", msg);
    return NextResponse.json(
      { error: "Mistral Voxtral TTS failed", details: msg },
      { status: 502, headers: corsHeaders }
    );
  }
}
