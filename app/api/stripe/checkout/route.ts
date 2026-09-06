import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest } from "@/lib/apiRequestGuard";
import { corsHeaders as buildCorsHeaders } from "@/lib/corsHeaders";
import { getStripe, isStripeConfigured, proPriceId } from "@/lib/stripe";
import { getRequestUserId } from "@/lib/usage";
import { getUserById, upsertUser } from "@/lib/userStore";

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

/** Start a Stripe Checkout session for the signed-in user's Pro subscription. */
export async function POST(req: NextRequest) {
  const blocked = guardApiRequest(req, "stripe-checkout", { limit: 10, maxBodyBytes: 2_000 });
  if (blocked) return blocked;
  const corsHeaders = buildCorsHeaders(req);

  const stripe = getStripe();
  const priceId = proPriceId();
  if (!isStripeConfigured() || !stripe || !priceId) {
    return NextResponse.json(
      { error: "Billing isn't set up yet." },
      { status: 503, headers: corsHeaders }
    );
  }

  const userId = await getRequestUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to upgrade." },
      { status: 401, headers: corsHeaders }
    );
  }

  // Pull the user's email from Clerk for the Stripe customer record.
  let email: string | null = null;
  try {
    const { currentUser } = await import("@clerk/nextjs/server");
    const u = await currentUser();
    email = u?.primaryEmailAddress?.emailAddress ?? u?.emailAddresses?.[0]?.emailAddress ?? null;
  } catch {
    /* email is optional */
  }

  try {
    const existing = await getUserById(userId);
    let customerId = existing?.stripe_customer_id ?? null;

    if (existing?.plan === "pro") {
      return NextResponse.json(
        { error: "You're already on Pro." },
        { status: 409, headers: corsHeaders }
      );
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await upsertUser({ id: userId, email, stripe_customer_id: customerId });
    }

    const base = siteUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      subscription_data: { metadata: { userId } },
      allow_promotion_codes: true,
      success_url: `${base}/?upgraded=1`,
      cancel_url: `${base}/?upgrade=cancelled`,
    });

    return NextResponse.json({ url: session.url }, { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("[stripe][checkout] failed", {
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "Couldn't start checkout. Try again." },
      { status: 502, headers: corsHeaders }
    );
  }
}
