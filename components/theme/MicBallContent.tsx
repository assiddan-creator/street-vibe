"use client";

type MicBallContentProps = {
  micBall: string | null;
  isListening: boolean;
  /** e.g. h-8 w-8 (Text mode) or h-10 w-10 (Speak mode) */
  iconClassName: string;
};

/**
 * Mic button interior: soft country ball art or fallback mic icon.
 * Image path is toned down (brightness / saturation) so it stays readable on dark UI.
 */
export function MicBallContent({ micBall, isListening, iconClassName }: MicBallContentProps) {
  if (micBall) {
    return (
      <span className="relative block h-full w-full overflow-hidden rounded-full">
        <img
          src={micBall}
          alt=""
          className="h-full w-full scale-[1.02] rounded-full object-cover brightness-[0.92] contrast-[0.96] saturate-[0.82]"
          draggable={false}
        />
        <span
          className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/25 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]"
          aria-hidden
        />
      </span>
    );
  }

  return (
    <svg
      className={`${iconClassName} ${isListening ? "text-black/90" : "text-white"}`}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14C5.52 16.16 8.53 19 12 19s6.48-2.84 6.93-6.86c.09-.6-.39-1.14-1-1.14z" />
    </svg>
  );
}
