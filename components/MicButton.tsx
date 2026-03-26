"use client";

type MicButtonProps = {
  listening: boolean;
  supported: boolean;
  disabled?: boolean;
  onPress: () => void;
  label?: string;
  className?: string;
};

export function MicButton({
  listening,
  supported,
  disabled,
  onPress,
  label = "Mic",
  className = "",
}: MicButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || !supported}
      onClick={onPress}
      title={supported ? (listening ? "Stop recording" : "Start recording") : "Speech recognition unavailable"}
      className={`inline-flex items-center justify-center rounded-full p-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:opacity-40 ${
        listening
          ? "bg-red-600 text-white hover:bg-red-500"
          : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
      } ${className}`}
    >
      <span className="sr-only">{label}</span>
      <svg
        className="h-8 w-8"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14C5.52 16.16 8.53 19 12 19s6.48-2.84 6.93-6.86c.09-.6-.39-1.14-1-1.14z" />
      </svg>
    </button>
  );
}
