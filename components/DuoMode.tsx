"use client";

type DuoTurn = "my" | "their" | null;

type DuoModeProps = {
  activeTurn: DuoTurn;
  myLabel?: string;
  theirLabel?: string;
  onToggleMy: () => void;
  onToggleTheir: () => void;
  className?: string;
};

export function DuoMode({
  activeTurn,
  myLabel = "My turn",
  theirLabel = "Their turn",
  onToggleMy,
  onToggleTheir,
  className = "",
}: DuoModeProps) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Duo mode</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onToggleMy}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTurn === "my"
              ? "bg-emerald-600 text-white"
              : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
          }`}
        >
          {myLabel}
        </button>
        <button
          type="button"
          onClick={onToggleTheir}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTurn === "their"
              ? "bg-sky-600 text-white"
              : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
          }`}
        >
          {theirLabel}
        </button>
      </div>
      {activeTurn && (
        <p className="text-xs text-zinc-400">
          Listening for <strong className="text-zinc-200">{activeTurn === "my" ? myLabel : theirLabel}</strong>
          . Tap again to stop.
        </p>
      )}
    </div>
  );
}
