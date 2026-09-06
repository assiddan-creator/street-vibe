import { createHmac, timingSafeEqual } from "crypto";

/**
 * Lemon Squeezy via its no-code "buy link" — no API key needed for checkout.
 * Get the link from a product's Share button, e.g.
 *   https://yourstore.lemonsqueezy.com/buy/1a2b3c4d-...
 * Set it as LEMONSQUEEZY_CHECKOUT_URL. LEMONSQUEEZY_WEBHOOK_SECRET is the
 * signing secret you choose when adding the webhook.
 */
export function isLemonConfigured(): boolean {
  return !!(
    process.env.LEMONSQUEEZY_CHECKOUT_URL && process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  );
}

/** Whether a yearly buy link is configured (enables the monthly/yearly choice). */
export function hasAnnualPlan(): boolean {
  return !!process.env.LEMONSQUEEZY_CHECKOUT_URL_ANNUAL;
}

/** Buy-link checkout URL with the Clerk user id + email + redirect prefilled. */
export function buildProCheckoutUrl(opts: {
  userId: string;
  email?: string | null;
  redirectUrl: string;
  /** "year" uses LEMONSQUEEZY_CHECKOUT_URL_ANNUAL when set; otherwise monthly. */
  interval?: "month" | "year";
}): string | null {
  const annual = opts.interval === "year" ? process.env.LEMONSQUEEZY_CHECKOUT_URL_ANNUAL : undefined;
  const base = annual || process.env.LEMONSQUEEZY_CHECKOUT_URL;
  if (!base) return null;
  const url = new URL(base);
  url.searchParams.set("checkout[custom][user_id]", opts.userId);
  if (opts.email) url.searchParams.set("checkout[email]", opts.email);
  url.searchParams.set("checkout[success_url]", opts.redirectUrl);
  url.searchParams.set("embed", "0");
  return url.toString();
}

/**
 * Hosted customer portal for the store (`/billing`). Explicit override via
 * LEMONSQUEEZY_PORTAL_URL, else derived from the checkout link's origin.
 */
export function customerPortalUrl(): string | null {
  if (process.env.LEMONSQUEEZY_PORTAL_URL) return process.env.LEMONSQUEEZY_PORTAL_URL;
  const base = process.env.LEMONSQUEEZY_CHECKOUT_URL;
  if (!base) return null;
  try {
    return `${new URL(base).origin}/billing`;
  } catch {
    return null;
  }
}

/** Verify the `X-Signature` HMAC that Lemon Squeezy sends with every webhook. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}
