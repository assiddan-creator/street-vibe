"use client";

import { useState } from "react";
import { SignInButton } from "@clerk/nextjs";

export type PublicUsage = {
  plan: "anon" | "free" | "pro";
  kind?: "translate" | "tts";
  used?: number;
  limit: number | null;
  remaining: number | null;
  unlimited: boolean;
  metered: boolean;
};

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const priceLabel = process.env.NEXT_PUBLIC_PRO_PRICE_LABEL || "";

async function startCheckout(): Promise<string | null> {
  try {
    const res = await fetch("/api/billing/checkout", { method: "POST" });
    const data = (await res.json()) as { url?: string; error?: string };
    if (res.ok && data.url) {
      window.location.href = data.url;
      return null;
    }
    return data.error || "Couldn't start checkout.";
  } catch {
    return "Couldn't start checkout.";
  }
}

async function openPortal(): Promise<string | null> {
  try {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = (await res.json()) as { url?: string; error?: string };
    if (res.ok && data.url) {
      window.location.href = data.url;
      return null;
    }
    return data.error || "Couldn't open billing.";
  } catch {
    return "Couldn't open billing.";
  }
}

/**
 * "N left today" line under the mode toggle, plus the upgrade path.
 * - pro: a small "Pro · Manage billing" line
 * - free/anon with room: subtle count (+ "Go Pro" when upgrades are available)
 * - free/anon at zero: a CTA box — checkout for signed-in, sign-in for anon
 * Renders nothing when the request wasn't metered.
 */
export function UsageMeter({
  usage,
  accent,
  upgradeAvailable = false,
}: {
  usage: PublicUsage | null;
  accent: string;
  upgradeAvailable?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!usage || !usage.metered) return null;

  const run = (fn: () => Promise<string | null>) => async () => {
    setBusy(true);
    setErr(null);
    const e = await fn();
    if (e) {
      setErr(e);
      setBusy(false);
    }
    // on success the browser navigates away
  };

  if (usage.plan === "pro") {
    return (
      <p className="mb-3 text-center text-[11px] font-medium text-white/45">
        Pro · unlimited
        {upgradeAvailable ? (
          <>
            {" · "}
            <button
              type="button"
              onClick={run(openPortal)}
              disabled={busy}
              className="underline underline-offset-2 transition-colors hover:text-white/75 disabled:opacity-50"
            >
              Manage billing
            </button>
          </>
        ) : null}
      </p>
    );
  }

  if (usage.unlimited || usage.remaining === null) return null;

  const remaining = Math.max(0, usage.remaining);
  const out = remaining <= 0;
  const canCheckout = upgradeAvailable && usage.plan === "free";

  if (!out) {
    return (
      <p className="mb-3 text-center text-[11px] font-medium text-white/45">
        {remaining} free {remaining === 1 ? "translation" : "translations"} left today
        {canCheckout ? (
          <>
            {" · "}
            <button
              type="button"
              onClick={run(startCheckout)}
              disabled={busy}
              className="font-semibold underline underline-offset-2 transition-colors hover:text-white/80 disabled:opacity-50"
              style={{ color: accent }}
            >
              Go Pro
            </button>
          </>
        ) : null}
      </p>
    );
  }

  return (
    <div
      className="mb-3 flex flex-col items-center gap-1.5 rounded-xl border px-3 py-2.5 text-center"
      style={{ borderColor: `${accent}33`, backgroundColor: `${accent}12` }}
    >
      <span className="text-[12px] font-semibold text-white/80">
        You&apos;ve used today&apos;s free translations.
      </span>

      {canCheckout ? (
        <button
          type="button"
          onClick={run(startCheckout)}
          disabled={busy}
          className="rounded-full px-3 py-1 text-[12px] font-bold disabled:opacity-60"
          style={{ backgroundColor: accent, color: "#0b0b0c" }}
        >
          {busy ? "One sec…" : `Upgrade to Pro${priceLabel ? ` — ${priceLabel}` : ""}`}
        </button>
      ) : usage.plan === "anon" && clerkEnabled ? (
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-full px-3 py-1 text-[12px] font-bold"
            style={{ backgroundColor: accent, color: "#0b0b0c" }}
          >
            Sign in for more
          </button>
        </SignInButton>
      ) : (
        <span className="text-[11px] text-white/55">Come back tomorrow for more.</span>
      )}

      {err ? <span className="text-[11px] text-red-300/80">{err}</span> : null}
    </div>
  );
}
