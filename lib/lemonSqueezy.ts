import { createHmac, timingSafeEqual } from "crypto";

const API = "https://api.lemonsqueezy.com/v1";

/** True when the store, variant and API key are all set. */
export function isLemonConfigured(): boolean {
  return !!(
    process.env.LEMONSQUEEZY_API_KEY &&
    process.env.LEMONSQUEEZY_STORE_ID &&
    process.env.LEMONSQUEEZY_VARIANT_PRO
  );
}

async function lemonFetch(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Lemon Squeezy ${path} ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

/** Hosted checkout for the Pro subscription; `userId` rides along as custom data. */
export async function createProCheckoutUrl(opts: {
  userId: string;
  email?: string | null;
  redirectUrl: string;
}): Promise<string | null> {
  const storeId = String(process.env.LEMONSQUEEZY_STORE_ID);
  const variantId = String(process.env.LEMONSQUEEZY_VARIANT_PRO);
  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          ...(opts.email ? { email: opts.email } : {}),
          custom: { user_id: opts.userId },
        },
        product_options: {
          redirect_url: opts.redirectUrl,
          enabled_variants: [Number(variantId)],
        },
        checkout_options: { embed: false, dark: true },
      },
      relationships: {
        store: { data: { type: "stores", id: storeId } },
        variant: { data: { type: "variants", id: variantId } },
      },
    },
  };
  const json = await lemonFetch("/checkouts", { method: "POST", body: JSON.stringify(body) });
  return (json?.data?.attributes?.url as string | undefined) ?? null;
}

/** Fresh signed URL for Lemon Squeezy's hosted customer portal. */
export async function getCustomerPortalUrl(customerId: string): Promise<string | null> {
  const json = await lemonFetch(`/customers/${customerId}`, { method: "GET" });
  return (json?.data?.attributes?.urls?.customer_portal as string | undefined) ?? null;
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
