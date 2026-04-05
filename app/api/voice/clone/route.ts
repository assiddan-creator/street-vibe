import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ELEVENLABS_VOICES_ADD = "https://api.elevenlabs.io/v1/voices/add";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ELEVENLABS_API_KEY" },
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
    formData.get("files");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: "Missing audio file (use field name \"file\" or \"audio\")" },
      { status: 400, headers: corsHeaders }
    );
  }

  const nameRaw = formData.get("name");
  const tempName =
    typeof nameRaw === "string" && nameRaw.trim() !== ""
      ? nameRaw.trim()
      : `streetvibe-ivc-${Date.now()}`;

  const filename =
    file instanceof File && file.name
      ? file.name
      : `calibration.${guessExtensionFromMime(file.type)}`;

  const upstream = new FormData();
  upstream.append("name", tempName);
  upstream.append("files", file, filename);

  try {
    const res = await fetch(ELEVENLABS_VOICES_ADD, {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: upstream,
    });

    const data = (await res.json()) as { voice_id?: string; detail?: unknown };

    if (!res.ok || !data.voice_id) {
      const detail =
        typeof data.detail === "string"
          ? data.detail
          : data.detail != null
            ? JSON.stringify(data.detail)
            : await res.text().catch(() => res.statusText);
      console.error("[voice/clone] ElevenLabs voices/add failed", res.status, detail);
      return NextResponse.json(
        { error: "Voice clone failed", details: detail },
        { status: res.ok ? 502 : res.status, headers: corsHeaders }
      );
    }

    return NextResponse.json({ voice_id: data.voice_id, name: tempName }, { status: 200, headers: corsHeaders });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Voice clone request failed", details: msg },
      { status: 500, headers: corsHeaders }
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
