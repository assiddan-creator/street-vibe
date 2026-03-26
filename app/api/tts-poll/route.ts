import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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
