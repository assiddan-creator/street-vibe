import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest } from "@/lib/apiRequestGuard";
import { corsHeaders as buildCorsHeaders } from "@/lib/corsHeaders";
import { buildProCheckoutUrl, isLemonConfigured } from "@/lib/lemonSqueezy";
import { getRequestUserId } from "@/lib/usage";
import { getUserById } from "@/lib/userStore";

export const maxDuration = 30;

function siteUrl(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  try {
    return new URL(req.url).origin;
  } catch {
    return "https://street-vibe.vercel.app";
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(req) });
}

/** Hand back a Lemon Squeezy buy-link checkout for the signed-in user's Pro plan. */
export async function POST(req: NextRequest) {
  const blocked = guardApiRequest(req, "billing-checkout", { limit: 10, maxBodyBytes: 2_000 });
  if (blocked) return blocked;
  const corsHeaders = buildCorsHeaders(req);

  if (!isLemonConfigured()) {
    return NextResponse.json(
      { error: "Billing isn't set up yet." },
      { status: 503, headers: corsHeaders }
    );
  }

  const userId = await getRequestUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to upgrade." }, { status: 401, headers: corsHeaders });
  }

  let email: string | null = null;
  try {
    const { currentUser } = await import("@clerk/nextjs/server");
    const u = await currentUser();
    email = u?.primaryEmailAddress?.emailAddress ?? u?.emailAddresses?.[0]?.emailAddress ?? null;
  } catch {
    /* email is optional — LS collects it at checkout */
  }

  const existing = await getUserById(userId);
  if (existing?.plan === "pro") {
    return NextResponse.json(
      { error: "You're already on Pro." },
      { status: 409, headers: corsHeaders }
    );
  }

  const url = buildProCheckoutUrl({
    userId,
    email,
    redirectUrl: `${siteUrl(req)}/?upgraded=1`,
  });
  if (!url) {
    return NextResponse.json(
      { error: "Couldn't start checkout." },
      { status: 502, headers: corsHeaders }
    );
  }
  return NextResponse.json({ url }, { status: 200, headers: corsHeaders });
}
