"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";

const enabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/**
 * Sign-in affordance for the header. Renders nothing until Clerk is configured
 * (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`), so the app is byte-identical anonymous
 * without keys. Clerk Core 3 removed the <SignedIn>/<SignedOut> control
 * components, so this reads auth state via the `useAuth()` hook instead.
 */
export function AuthControl({ accent }: { accent: string }) {
  if (!enabled) return null;
  return <AuthControlInner accent={accent} />;
}

function AuthControlInner({ accent }: { accent: string }) {
  const { isLoaded, isSignedIn } = useAuth();

  // Reserve the slot while Clerk boots so the header doesn't jump.
  if (!isLoaded) return <span aria-hidden className="block h-7 w-7" />;

  return (
    <div className="flex items-center">
      {isSignedIn ? (
        <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
      ) : (
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-semibold text-white/75 backdrop-blur-md transition-colors hover:text-white"
            style={{ borderColor: `${accent}40` }}
          >
            Sign in
          </button>
        </SignInButton>
      )}
    </div>
  );
}
