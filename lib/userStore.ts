import { getSupabaseAdmin } from "@/lib/supabase";
import type { Plan } from "@/lib/usage";

export type UserRow = {
  id: string;
  email: string | null;
  plan: Plan;
  stripe_customer_id: string | null;
};

/** Read a user row by Clerk id, or null when missing / DB unconfigured. */
export async function getUserById(userId: string): Promise<UserRow | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data } = await db
    .from("users")
    .select("id, email, plan, stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  return (data as UserRow | null) ?? null;
}

/** Create or update a user row (service-role, bypasses RLS). */
export async function upsertUser(row: {
  id: string;
  email?: string | null;
  plan?: Plan;
  stripe_customer_id?: string | null;
}): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;
  await db.from("users").upsert(
    {
      id: row.id,
      ...(row.email !== undefined ? { email: row.email } : {}),
      ...(row.plan !== undefined ? { plan: row.plan } : {}),
      ...(row.stripe_customer_id !== undefined
        ? { stripe_customer_id: row.stripe_customer_id }
        : {}),
      last_seen: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
}

/** Flip a plan for whichever user owns this Stripe customer. */
export async function setPlanByStripeCustomer(
  stripeCustomerId: string,
  plan: Plan
): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;
  await db.from("users").update({ plan }).eq("stripe_customer_id", stripeCustomerId);
}
