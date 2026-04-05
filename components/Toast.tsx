"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

type ToastProps = {
  message: string | null;
  accent: string;
};

/** Fixed bottom-center glass pill; fades in/out when message toggles. */
export function Toast({ message, accent }: ToastProps) {
  const [latched, setLatched] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (message) {
      setLatched(message);
      requestAnimationFrame(() => setOpen(true));
      return;
    }
    if (latched) setOpen(false);
  }, [message, latched]);

  useEffect(() => {
    if (message || !latched || open) return;
    const t = window.setTimeout(() => setLatched(null), 320);
    return () => window.clearTimeout(t);
  }, [message, latched, open]);

  if (!latched) return null;

  return (
    <div
      className={`pointer-events-none fixed bottom-6 left-1/2 z-[100] max-w-[min(90vw,340px)] -translate-x-1/2 rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-3 text-center text-xs font-medium text-white shadow-lg backdrop-blur-xl transition-all duration-300 ease-out ${
        open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
      style={
        {
          borderColor: `${accent}55`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.45), 0 0 40px -8px ${accent}44, inset 0 1px 0 ${accent}22`,
        } as CSSProperties
      }
      role="status"
      aria-live="polite"
    >
      {latched}
    </div>
  );
}
