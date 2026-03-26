import { NextRequest, NextResponse } from "next/server";
import { resolveVoiceForDialect } from "@/lib/voices";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const REPLICATE_MINIMAX_VERSION =
  "29657f664032844b8f800486164cf26acb2507288e348133e78ae871a43211d0";

const GOOGLE_VOICE_MAP: Record<
  string,
  { languageCode: string; name: string; pitch: number; speakingRate: number }
> = {
  "London Roadman": {
    languageCode: "en-GB",
    name: "en-GB-Neural2-D",
    pitch: -1.5,
    speakingRate: 1.05,
  },
  "Jamaican Patois": {
    languageCode: "en-GB",
    name: "en-GB-Neural2-B",
    pitch: -1.5,
    speakingRate: 1.0,
  },
  "New York Brooklyn": {
    languageCode: "en-US",
    name: "en-US-Journey-D",
    pitch: 0,
    speakingRate: 1.05,
  },
  "Tokyo Gyaru": {
    languageCode: "ja-JP",
    name: "ja-JP-Neural2-B",
    pitch: 0.5,
    speakingRate: 1.1,
  },
  "Paris Banlieue": {
    languageCode: "fr-FR",
    name: "fr-FR-Neural2-D",
    pitch: -1.5,
    speakingRate: 1.05,
  },
  "Russian Street": {
    languageCode: "ru-RU",
    name: "ru-RU-Standard-D",
    pitch: -1.5,
    speakingRate: 1.0,
  },
  "Lisbon Street": {
    languageCode: "pt-PT",
    name: "pt-PT-Neural2-B",
    pitch: -1.5,
    speakingRate: 1.05,
  },
  "Mexico City Barrio": {
    languageCode: "es-US",
    name: "es-US-Neural2-B",
    pitch: -1.5,
    speakingRate: 1.05,
  },
  "Rio Favela": {
    languageCode: "pt-BR",
    name: "pt-BR-Neural2-B",
    pitch: -1.5,
    speakingRate: 1.05,
  },
  "Israeli Street": {
    languageCode: "he-IL",
    name: "he-IL-Neural2-B",
    pitch: 0,
    speakingRate: 1.05,
  },
};

const GOOGLE_VOICE_DEFAULT = {
  languageCode: "en-US",
  name: "en-US-Journey-F",
  pitch: 0,
  speakingRate: 1.0,
};

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
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing text" }, { status: 400, headers: corsHeaders });
  }

  if (engine === "google") {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500, headers: corsHeaders }
      );
    }

    const dialectKey = typeof dialect === "string" ? dialect : "";
    const voice = GOOGLE_VOICE_MAP[dialectKey] ?? GOOGLE_VOICE_DEFAULT;

    try {
      const ttsRes = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(geminiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text },
            voice: { languageCode: voice.languageCode, name: voice.name },
            audioConfig: {
              audioEncoding: "MP3",
              speakingRate: voice.speakingRate,
              pitch: voice.pitch,
            },
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

  const voiceConfig = resolveVoiceForDialect(dialect as string | undefined);
  const tuning =
    body.tuning && typeof body.tuning === "object"
      ? (body.tuning as Record<string, unknown>)
      : null;

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
          voice_id: voiceConfig.voice_id,
          speed: (tuning?.speed as number | undefined) ?? voiceConfig.speed,
          pitch: (tuning?.pitch as number | undefined) ?? voiceConfig.pitch,
          emotion: (tuning?.emotion as string | undefined) ?? voiceConfig.emotion,
          volume: (tuning?.volume as number | undefined) ?? 1.0,
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
