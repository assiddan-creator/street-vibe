import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import type { Plan } from "@/lib/usage";
import { setPlanByStripeCustomer, upsertUser } from "@/lib/userStore";

export const maxDuration = 30;

/** Subscription statuses that entitle a user to Pro. */
function planForStatus(status: Stripe.Subscription.Status): Plan {
  return status === "active" || status === "trialing" ? "pro" : "free";
}

/**
 * Stripe webhook. Signature verification IS the authentication here, so there's
 * no CORS / origin guard. Keeps `users.plan` in sync with the subscription.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const payload = await req.text();
  if (payload.length > 1_000_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, sig, secret);
  } catch (e) {
    console.warn("[stripe][webhook] bad signature", {
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.client_reference_id || (s.metadata?.userId ?? null);
        const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id ?? null;
        if (userId && customerId) {
          await upsertUser({ id: userId, stripe_customer_id: customerId, plan: "pro" });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await setPlanByStripeCustomer(customerId, planForStatus(sub.status));
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await setPlanByStripeCustomer(customerId, "free");
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe][webhook] handler error", {
      type: event.type,
      message: e instanceof Error ? e.message : String(e),
    });
    // 500 tells Stripe to retry.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
