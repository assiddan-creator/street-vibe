"use client";

/**
 * Decorative accent-tinted orbs behind page content. pointer-events-none so controls stay clickable.
 */
export function AmbientAccentGlows({ accent }: { accent: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -left-[18%] top-[14%] h-[min(100vw,28rem)] w-[min(100vw,28rem)] max-w-[520px] rounded-full opacity-30 blur-[120px]"
        style={{ backgroundColor: accent }}
      />
      <div
        className="absolute -right-[16%] bottom-[10%] h-[min(92vw,24rem)] w-[min(92vw,24rem)] max-w-[480px] rounded-full opacity-[0.24] blur-[120px]"
        style={{ backgroundColor: accent }}
      />
    </div>
  );
}
