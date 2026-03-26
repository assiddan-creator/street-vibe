"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const linkBase =
  "rounded-full border px-3 py-1.5 text-[10px] font-semibold backdrop-blur-md transition-colors duration-300";

export function StreetVibeNav() {
  const pathname = usePathname();
  const isText = pathname === "/" || pathname === "";
  const isSpeak = pathname === "/speak";

  return (
    <nav
      className="mx-auto mb-1.5 flex w-full max-w-[min(100%,390px)] items-center justify-center gap-2 px-2.5"
      aria-label="Main"
    >
      <Link
        href="/"
        className={`${linkBase} border-themeButtonBorder bg-themeButton/20 text-white shadow-glow-theme hover:bg-themeButton/30 ${
          isText ? "bg-themeButton/40 ring-1 ring-themeButtonBorder" : ""
        }`}
      >
        Text Mode
      </Link>
      <Link
        href="/speak"
        className={`${linkBase} border-themeButtonBorder bg-themeButton/20 text-white shadow-glow-theme hover:bg-themeButton/30 ${
          isSpeak ? "bg-themeButton/40 ring-1 ring-themeButtonBorder" : ""
        }`}
      >
        Speak Mode
      </Link>
    </nav>
  );
}
