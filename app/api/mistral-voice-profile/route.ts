import { Mistral } from "@mistralai/mistralai";
import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** Cross-lingual coverage for Voxtral (per Mistral docs). */
const DEFAULT_VOICE_LANGUAGES = ["en", "fr", "es", "pt", "it", "nl", "de", "hi", "ar"] as const;

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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart FormData" }, { status: 400, headers: corsHeaders });
  }

  const file =
    formData.get("file") ??
    formData.get("audio") ??
    formData.get("sample");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: "Missing audio file (field \"file\" or \"audio\")" },
      { status: 400, headers: corsHeaders }
    );
  }

  const nameRaw = formData.get("name");
  const displayName =
    typeof nameRaw === "string" && nameRaw.trim() !== ""
      ? nameRaw.trim()
      : `streetvibe-voice-${Date.now()}`;

  const filename =
    file instanceof File && file.name
      ? file.name
      : `profile.${guessExtensionFromMime(file.type)}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const sampleAudio = buf.toString("base64");

  if (sampleAudio.length < 500) {
    return NextResponse.json({ error: "Audio sample too small" }, { status: 400, headers: corsHeaders });
  }

  const client = new Mistral({ apiKey });

  try {
    const voice = await client.audio.voices.create({
      name: displayName,
      sampleAudio,
      sampleFilename: filename,
      languages: [...DEFAULT_VOICE_LANGUAGES],
    });

    return NextResponse.json(
      { voice_id: voice.id, name: voice.name },
      { status: 200, headers: corsHeaders }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[mistral-voice-profile]", msg);
    return NextResponse.json(
      { error: "Mistral voice profile creation failed", details: msg.slice(0, 500) },
      { status: 502, headers: corsHeaders }
    );
  }
}

function guessExtensionFromMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  return "webm";
}
