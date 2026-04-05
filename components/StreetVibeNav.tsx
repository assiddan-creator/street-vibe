"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ANALYTICS_EVENT_NAMES, ANALYTICS_MODE, trackAnalyticsEvent } from "@/lib/analyticsEvents";

const linkBase =
  "rounded-full border border-white/5 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/75 backdrop-blur-xl transition-colors duration-300 hover:bg-white/10 hover:text-white/95";

export function StreetVibeNav() {
  const pathname = usePathname();
  const isText = pathname === "/" || pathname === "";
  const isSpeak = pathname === "/speak";

  const trackModeNav = (target: typeof ANALYTICS_MODE.TEXT | typeof ANALYTICS_MODE.SPEAK) => {
    const from = pathname === "/speak" ? ANALYTICS_MODE.SPEAK : ANALYTICS_MODE.TEXT;
    if (from === target) return;
    trackAnalyticsEvent({ name: ANALYTICS_EVENT_NAMES.MODE_SWITCHED, from, to: target });
  };

  return (
    <nav
      className="mx-auto mb-1.5 flex w-full max-w-[min(100%,390px)] items-center justify-center gap-2 px-2.5"
      aria-label="Main"
    >
      <Link
        href="/"
        onClick={() => trackModeNav(ANALYTICS_MODE.TEXT)}
        className={`${linkBase} ${
          isText ? "border-white/15 bg-white/15 text-white shadow-none" : ""
        }`}
      >
        Text Mode
      </Link>
      <Link
        href="/speak"
        onClick={() => trackModeNav(ANALYTICS_MODE.SPEAK)}
        className={`${linkBase} ${
          isSpeak ? "border-white/15 bg-white/15 text-white shadow-none" : ""
        }`}
      >
        Speak Mode
      </Link>
    </nav>
  );
}
