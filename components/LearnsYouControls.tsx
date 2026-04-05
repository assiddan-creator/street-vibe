"use client";

import { useCallback, useEffect, useState } from "react";
import { ANALYTICS_EVENT_NAMES, trackAnalyticsEvent } from "@/lib/analyticsEvents";
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
  /** Placed below poster/mic: utility row with glass pill. */
  belowHero?: boolean;
  /** Opens translation history (bottom sheet). */
  onHistoryClick?: () => void;
};

/**
 * Optional local-learning toggle + optional History trigger in a calm utility row.
 */
export function LearnsYouControls({ accent, idle = false, belowHero = false, onHistoryClick }: Props) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(getLearnsYouEnabled());
  }, []);

  const toggle = useCallback(() => {
    const next = !getLearnsYouEnabled();
    setLearnsYouEnabled(next);
    setOn(next);
    trackAnalyticsEvent({ name: ANALYTICS_EVENT_NAMES.LEARNS_YOU_TOGGLED, enabled: next });
  }, []);

  const reset = useCallback(() => {
    clearLearnedPreferenceStorage();
    trackAnalyticsEvent({ name: ANALYTICS_EVENT_NAMES.LEARNED_PREFERENCES_RESET });
  }, []);

  const labelClass = belowHero
    ? `text-xs font-medium ${idle ? "text-white/40" : "text-white/50"}`
    : idle
      ? "text-[8px] uppercase tracking-wider text-white/28"
      : "text-[8px] uppercase tracking-wider text-white/36";

  const wrapClass = belowHero
    ? "w-full"
    : "flex flex-col items-center gap-0.5";

  if (belowHero) {
    return (
      <div
        className={`${wrapClass} rounded-2xl border border-white/[0.07] bg-white/[0.05] px-4 py-2 shadow-none backdrop-blur-xl transition-opacity duration-300 sm:px-5 ${
          idle ? "opacity-[0.92]" : ""
        }`}
      >
        <div className="flex w-full items-center justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-2.5">
              <span className={`${labelClass} shrink-0`}>Learns You</span>
              <button
                type="button"
                role="switch"
                aria-label="Learns You mode"
                aria-checked={on}
                onClick={toggle}
                className="relative h-4 w-8 shrink-0 cursor-pointer rounded-full bg-white/10 transition-colors"
              >
                <span
                  aria-hidden
                  className={`pointer-events-none absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                    on ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <button
              type="button"
              onClick={reset}
              title="Reset learned preferences"
              className="mt-1 text-left text-[10px] text-white/35 transition-colors hover:text-white/50"
            >
              Reset
            </button>
          </div>
          {onHistoryClick ? (
            <button
              type="button"
              onClick={onHistoryClick}
              className="flex h-7 min-h-0 shrink-0 items-center justify-center rounded-full border border-white/10 bg-transparent px-2.5 py-1 text-on-surface-variant transition-colors hover:bg-white/5"
              aria-label="History"
              title="History"
            >
              <svg
                className="h-3.5 w-3.5 text-current opacity-80"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.25 2.52.75-1.23-3.5-2.08V8H12z" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={wrapClass}>
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
                  borderColor: `${accent}32`,
                  backgroundColor: `${accent}08`,
                }
              : { borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(0,0,0,0.18)" }
          }
        >
          <span
            className={`absolute top-px h-3 w-3 rounded-full bg-white/75 transition-transform ${
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
