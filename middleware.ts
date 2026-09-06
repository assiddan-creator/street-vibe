import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Auth is opt-in: with no Clerk key configured the middleware is a pass-through,
 * so the app keeps working anonymously. Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY +
 * CLERK_SECRET_KEY to turn sign-in on.
 */
export default process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? clerkMiddleware()
  : () => NextResponse.next();

export const config = {
  matcher: [
    // All app routes except Next internals and static files…
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // …and always run on API routes.
    "/(api|trpc)(.*)",
  ],
};
