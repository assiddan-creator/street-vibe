import Stripe from "stripe";

let cached: Stripe | null | undefined;

/**
 * Server-only Stripe client. Returns `null` when `STRIPE_SECRET_KEY` isn't set,
 * so the billing routes can no-op and the app keeps running without payments.
 */
export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  cached = key ? new Stripe(key) : null;
  return cached;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/** Recurring price id for the Pro plan (create it in the Stripe dashboard). */
export function proPriceId(): string | null {
  return process.env.STRIPE_PRICE_PRO || null;
}
