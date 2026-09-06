import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared chrome for the public pages (landing + legal). Opaque dark background
 * so it reads correctly over the app's themed provider. Server component — no
 * client state; the only interactive bits are plain links.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#0b0d0f] text-white/90">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" className="font-heading text-[17px] font-extrabold tracking-tight text-white">
          Street&nbsp;Vibe
        </Link>
        <Link
          href="/app"
          className="rounded-full bg-white/10 px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-white/20"
        >
          Open the app
        </Link>
      </header>
      {children}
      <footer className="mx-auto max-w-5xl px-5 py-10 text-[13px] text-white/45">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-6">
          <span>© {new Date().getFullYear()} Street Vibe</span>
          <Link href="/terms" className="hover:text-white/80">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-white/80">
            Privacy
          </Link>
          <Link href="/content-policy" className="hover:text-white/80">
            Content Policy
          </Link>
          <Link href="/app" className="hover:text-white/80">
            Open the app
          </Link>
        </div>
      </footer>
    </div>
  );
}

/** Simple prose wrapper for the legal pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <PublicShell>
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-white">{title}</h1>
        <p className="mt-2 text-[13px] text-white/40">Last updated {updated}</p>
        <div className="mt-8 flex flex-col gap-5 text-[15px] leading-relaxed text-white/70 [&_a]:text-white/90 [&_a]:underline [&_h2]:mt-4 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white/90 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
          {children}
        </div>
      </main>
    </PublicShell>
  );
}
