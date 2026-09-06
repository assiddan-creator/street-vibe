import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest } from "@/lib/apiRequestGuard";
import { corsHeaders as buildCorsHeaders } from "@/lib/corsHeaders";
import { peekUsage } from "@/lib/usage";
import { isLemonConfigured } from "@/lib/lemonSqueezy";

/** Current daily quota state for the caller — read-only, does not consume. */
export async function GET(req: NextRequest) {
  const blocked = await guardApiRequest(req, "usage", { limit: 60, maxBodyBytes: 2_000, dailyLimit: 2_000 });
  if (blocked) return blocked;
  const corsHeaders = buildCorsHeaders(req);

  const upgradeAvailable = isLemonConfigured();
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
