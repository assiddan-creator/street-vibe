"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearLearnedPreferenceStorage,
  getLearnsYouEnabled,
  setLearnsYouEnabled,
} from "@/lib/implicitPreferenceEngine";

type Props = {
  /** Dialect theme accent — subtle tint when on. */
  accent: string;
  /** Softer label when the screen is in idle / hero state. */
  idle?: boolean;
};

/**
 * Secondary utility — below language + voice in hierarchy; smaller than primary flow.
 */
export function LearnsYouControls({ accent, idle = false }: Props) {
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
    ? "text-[8px] uppercase tracking-wider text-white/28"
    : "text-[8px] uppercase tracking-wider text-white/36";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex w-full max-w-[8.25rem] items-center justify-between gap-2">
        <span className={labelClass}>Learns You</span>
        <button
          type="button"
          role="switch"
          aria-label="Learns You mode"
          aria-checked={on}
          onClick={toggle}
          className="relative h-4 w-8 shrink-0 rounded-full border transition-colors"
          style={
            on
              ? {
                  borderColor: `${accent}40`,
                  backgroundColor: `${accent}10`,
                }
              : { borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(0,0,0,0.22)" }
          }
        >
          <span
            className={`absolute top-px h-3 w-3 rounded-full bg-white/80 shadow-sm transition-transform ${
              on ? "translate-x-[17px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      <button
        type="button"
        onClick={reset}
        title="Reset learned preferences"
        className="max-w-[8.25rem] text-center text-[8px] text-white/25 hover:text-white/40"
      >
        Reset
      </button>
    </div>
  );
}
