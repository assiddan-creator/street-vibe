import { getSupabaseAdmin } from "@/lib/supabase";
import type { Plan } from "@/lib/usage";

export type UserRow = {
  id: string;
  email: string | null;
  plan: Plan;
  ls_customer_id: string | null;
};

/** Read a user row by Clerk id, or null when missing / DB unconfigured. */
export async function getUserById(userId: string): Promise<UserRow | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data } = await db
    .from("users")
    .select("id, email, plan, ls_customer_id")
    .eq("id", userId)
    .maybeSingle();
  return (data as UserRow | null) ?? null;
}

/**
 * Create or update a user row (service-role, bypasses RLS). Throws on a DB
 * error so the billing webhook answers 500 and Lemon Squeezy retries it.
 */
export async function upsertUser(row: {
  id: string;
  email?: string | null;
  plan?: Plan;
  ls_customer_id?: string | null;
}): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;
  const { error } = await db.from("users").upsert(
    {
      id: row.id,
      ...(row.email !== undefined ? { email: row.email } : {}),
      ...(row.plan !== undefined ? { plan: row.plan } : {}),
      ...(row.ls_customer_id !== undefined ? { ls_customer_id: row.ls_customer_id } : {}),
      last_seen: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) throw new Error(`users upsert failed: ${error.message}`);
}

/** Flip a plan for whichever user owns this Lemon Squeezy customer. Throws on a DB error. */
export async function setPlanByLemonCustomer(
  lemonCustomerId: string,
  plan: Plan
): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;
  const { error } = await db.from("users").update({ plan }).eq("ls_customer_id", lemonCustomerId);
  if (error) throw new Error(`users plan update failed: ${error.message}`);
}
