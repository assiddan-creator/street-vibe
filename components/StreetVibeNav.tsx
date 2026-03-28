"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/analyticsEvents";

const linkBase =
  "rounded-full border px-3 py-1 text-[11px] font-semibold opacity-60 backdrop-blur-md transition-colors duration-300";

export function StreetVibeNav() {
  const pathname = usePathname();
  const isText = pathname === "/" || pathname === "";
  const isSpeak = pathname === "/speak";

  const trackModeNav = (target: "text" | "speak") => {
    const from = pathname === "/speak" ? "speak" : "text";
    if (from === target) return;
    trackAnalyticsEvent({ name: "mode_switched", from, to: target });
  };

  return (
    <nav
      className="mx-auto mb-1.5 flex w-full max-w-[min(100%,390px)] items-center justify-center gap-2 px-2.5"
      aria-label="Main"
    >
      <Link
        href="/"
        onClick={() => trackModeNav("text")}
        className={`${linkBase} border-themeButtonBorder bg-themeButton/20 text-white shadow-glow-theme hover:bg-themeButton/30 ${
          isText ? "bg-themeButton/40 ring-1 ring-themeButtonBorder" : ""
        }`}
      >
        Text Mode
      </Link>
      <Link
        href="/speak"
        onClick={() => trackModeNav("speak")}
        className={`${linkBase} border-themeButtonBorder bg-themeButton/20 text-white shadow-glow-theme hover:bg-themeButton/30 ${
          isSpeak ? "bg-themeButton/40 ring-1 ring-themeButtonBorder" : ""
        }`}
      >
        Speak Mode
      </Link>
    </nav>
  );
}
