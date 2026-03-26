import { NextRequest, NextResponse } from "next/server";
import { resolveVoiceForDialect } from "@/lib/voices";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const REPLICATE_MINIMAX_VERSION =
  "29657f664032844b8f800486164cf26acb2507288e348133e78ae871a43211d0";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing REPLICATE_API_TOKEN" },
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
  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400, headers: corsHeaders });
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
