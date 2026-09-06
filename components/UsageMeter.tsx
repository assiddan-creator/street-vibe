"use client";

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

/**
 * "N left today" pill under the mode toggle. Renders nothing unless the request
 * came back metered with a finite limit. At zero it turns into a short CTA —
 * "Sign in" for anonymous visitors, "Upgrade" once signed in.
 */
export function UsageMeter({ usage, accent }: { usage: PublicUsage | null; accent: string }) {
  if (!usage || !usage.metered || usage.unlimited || usage.remaining === null) return null;

  const remaining = Math.max(0, usage.remaining);
  const out = remaining <= 0;

  if (!out) {
    return (
      <p className="mb-3 text-center text-[11px] font-medium text-white/45">
        {remaining} free {remaining === 1 ? "translation" : "translations"} left today
      </p>
    );
  }

  return (
    <div
      className="mb-3 flex flex-col items-center gap-1 rounded-xl border px-3 py-2 text-center"
      style={{ borderColor: `${accent}33`, backgroundColor: `${accent}12` }}
    >
      <span className="text-[12px] font-semibold text-white/80">
        You&apos;ve used today&apos;s free translations.
      </span>
      {usage.plan === "anon" && clerkEnabled ? (
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
        <span className="text-[11px] text-white/55">
          Pro unlocks unlimited — coming soon.
        </span>
      )}
    </div>
  );
}
