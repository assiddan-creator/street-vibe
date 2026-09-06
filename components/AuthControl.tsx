"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

const enabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/** Sign-in affordance — renders nothing until Clerk is configured. */
export function AuthControl({ accent }: { accent: string }) {
  if (!enabled) return null;
  return (
    <div className="flex items-center">
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-semibold text-white/75 backdrop-blur-md transition-colors hover:text-white"
            style={{ borderColor: `${accent}40` }}
          >
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
      </SignedIn>
    </div>
  );
}
