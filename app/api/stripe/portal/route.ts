import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest } from "@/lib/apiRequestGuard";
import { corsHeaders as buildCorsHeaders } from "@/lib/corsHeaders";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
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

/** Open the Stripe billing portal so a subscriber can manage or cancel. */
export async function POST(req: NextRequest) {
  const blocked = guardApiRequest(req, "stripe-portal", { limit: 10, maxBodyBytes: 2_000 });
  if (blocked) return blocked;
  const corsHeaders = buildCorsHeaders(req);

  const stripe = getStripe();
  if (!isStripeConfigured() || !stripe) {
    return NextResponse.json(
      { error: "Billing isn't set up yet." },
      { status: 503, headers: corsHeaders }
    );
  }

  const userId = await getRequestUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401, headers: corsHeaders });
  }

  try {
    const user = await getUserById(userId);
    if (!user?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No subscription to manage." },
        { status: 404, headers: corsHeaders }
      );
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${siteUrl(req)}/`,
    });
    return NextResponse.json({ url: session.url }, { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("[stripe][portal] failed", {
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "Couldn't open the billing portal." },
      { status: 502, headers: corsHeaders }
    );
  }
}
