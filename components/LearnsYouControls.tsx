"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearLearnedPreferenceStorage,
  getLearnsYouEnabled,
  setLearnsYouEnabled,
} from "@/lib/implicitPreferenceEngine";

type Props = {
  /** Muted label styling when idle (e.g. home idle state). */
  idle?: boolean;
};

export function LearnsYouControls({ idle = false }: Props) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(getLearnsYouEnabled());
  }, []);

  const toggle = useCallback(() => {
    const next = !getLearnsYouEnabled();
    setLearnsYouEnabled(next);
    setOn(next);
  }, []);

  const reset = useCallback(() => {
    clearLearnedPreferenceStorage();
  }, []);

  const labelClass = idle
    ? "text-[8px] uppercase tracking-widest text-white/25"
    : "text-[9px] font-medium uppercase tracking-widest text-white/40";

  return (
    <div className="flex flex-col items-center gap-1.5 border-t border-white/5 pt-3">
      <div className="flex w-full items-center justify-between gap-2 px-0.5">
        <span className={labelClass}>Learns You</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={toggle}
          className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
            on ? "border-emerald-500/60 bg-emerald-500/20" : "border-white/15 bg-black/30"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white/90 shadow transition-transform ${
              on ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      <button
        type="button"
        onClick={reset}
        className="text-[9px] text-white/35 underline-offset-2 hover:text-white/55 hover:underline"
      >
        Reset learned preferences
      </button>
    </div>
  );
}
