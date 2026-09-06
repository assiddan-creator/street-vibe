import { NextRequest, NextResponse } from "next/server";
import type { Plan } from "@/lib/usage";
import { verifyWebhookSignature } from "@/lib/lemonSqueezy";
import { setPlanByLemonCustomer, upsertUser } from "@/lib/userStore";

export const maxDuration = 30;

/** Lemon Squeezy subscription statuses that entitle a user to Pro. */
const PRO_STATUSES = new Set(["active", "on_trial", "past_due"]);

function planForStatus(status: unknown): Plan {
  return typeof status === "string" && PRO_STATUSES.has(status) ? "pro" : "free";
}

/**
 * Lemon Squeezy webhook. The `X-Signature` HMAC is the authentication, so there
 * is no CORS / origin guard. Keeps `users.plan` in sync with the subscription.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > 1_000_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  if (!verifyWebhookSignature(raw, req.headers.get("x-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: {
    meta?: { event_name?: string; custom_data?: { user_id?: string } };
    data?: { attributes?: { status?: string; customer_id?: number | string; user_email?: string } };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const event = payload.meta?.event_name;
  const attrs = payload.data?.attributes ?? {};
  const userId = payload.meta?.custom_data?.user_id ?? null;
  const customerId = attrs.customer_id != null ? String(attrs.customer_id) : null;

  try {
    switch (event) {
      case "subscription_created":
      case "subscription_updated":
      case "subscription_resumed":
      case "subscription_unpaused": {
        const plan = planForStatus(attrs.status);
        if (userId && customerId) {
          await upsertUser({
            id: userId,
            email: attrs.user_email ?? undefined,
            ls_customer_id: customerId,
            plan,
          });
        } else if (customerId) {
          await setPlanByLemonCustomer(customerId, plan);
        }
        break;
      }
      // `subscription_cancelled` keeps status "cancelled" but access runs to the
      // period end — only `_expired` truly ends it.
      case "subscription_expired": {
        if (customerId) await setPlanByLemonCustomer(customerId, "free");
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[billing][webhook] handler error", {
      event,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
