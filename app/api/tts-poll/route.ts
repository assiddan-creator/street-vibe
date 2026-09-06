import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest } from "@/lib/apiRequestGuard";
import { corsHeaders as buildCorsHeaders } from "@/lib/corsHeaders";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const blocked = await guardApiRequest(req, "tts-poll", {
    limit: 240,
    maxBodyBytes: 4_000,
    dailyLimit: 4_000,
  });
  if (blocked) return blocked;
  const corsHeaders = buildCorsHeaders(req);

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

  const { predictionId } = body || {};
  if (!predictionId) {
    return NextResponse.json(
      { error: "Missing predictionId" },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const pollRes = await fetch(
      `https://api.replicate.com/v1/predictions/${encodeURIComponent(String(predictionId))}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    const data = await pollRes.json();
    return NextResponse.json(
      {
        status: data.status,
        output: data.output || null,
        error: data.error || null,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Poll failed", details: msg },
      { status: 500, headers: corsHeaders }
    );
  }
}
