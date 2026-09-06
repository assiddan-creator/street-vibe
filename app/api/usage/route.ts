import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest } from "@/lib/apiRequestGuard";
import { corsHeaders as buildCorsHeaders } from "@/lib/corsHeaders";
import { peekUsage } from "@/lib/usage";
import { isStripeConfigured, proPriceId } from "@/lib/stripe";

/** Current daily quota state for the caller — read-only, does not consume. */
export async function GET(req: NextRequest) {
  const blocked = guardApiRequest(req, "usage", { limit: 60, maxBodyBytes: 2_000, dailyLimit: 2_000 });
  if (blocked) return blocked;
  const corsHeaders = buildCorsHeaders(req);

  const upgradeAvailable = isStripeConfigured() && !!proPriceId();
  const usage = await peekUsage(req);
  // `metered: false` tells the client to hide the meter entirely.
  if (!usage) {
    return NextResponse.json(
      { metered: false, upgradeAvailable },
      { status: 200, headers: corsHeaders }
    );
  }
  return NextResponse.json(
    { metered: true, upgradeAvailable, ...usage },
    { status: 200, headers: corsHeaders }
  );
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(req) });
}
