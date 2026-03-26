"use client";

import type { CSSProperties } from "react";

type ToastProps = {
  message: string | null;
  accent: string;
};

/** Fixed bottom-center pill; parent controls visibility and duration. */
export function Toast({ message, accent }: ToastProps) {
  if (!message) return null;
  return (
    <div
      className="pointer-events-none fixed bottom-6 left-1/2 z-[100] max-w-[min(90vw,320px)] -translate-x-1/2 rounded-full border px-4 py-2 text-center text-xs font-medium text-white shadow-lg"
      style={
        {
          backgroundColor: "rgba(0,0,0,0.88)",
          borderColor: `${accent}88`,
          boxShadow: `0 4px 20px ${accent}33`,
        } as CSSProperties
      }
      role="status"
    >
      {message}
    </div>
  );
}
