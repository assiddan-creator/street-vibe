import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest } from "@/lib/apiRequestGuard";
import { corsHeaders as buildCorsHeaders } from "@/lib/corsHeaders";
import { customerPortalUrl, isLemonConfigured } from "@/lib/lemonSqueezy";
import { getRequestUserId } from "@/lib/usage";

export const maxDuration = 30;

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(req) });
}

/** Hand back Lemon Squeezy's hosted customer portal (`/billing`, email magic link). */
export async function POST(req: NextRequest) {
  const blocked = await guardApiRequest(req, "billing-portal", { limit: 10, maxBodyBytes: 2_000 });
  if (blocked) return blocked;
  const corsHeaders = buildCorsHeaders(req);

  if (!isLemonConfigured()) {
    return NextResponse.json(
      { error: "Billing isn't set up yet." },
      { status: 503, headers: corsHeaders }
    );
  }

  const userId = await getRequestUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401, headers: corsHeaders });
  }

  const url = customerPortalUrl();
  if (!url) {
    return NextResponse.json(
      { error: "Couldn't open the billing portal." },
      { status: 502, headers: corsHeaders }
    );
  }
  return NextResponse.json({ url }, { status: 200, headers: corsHeaders });
}
