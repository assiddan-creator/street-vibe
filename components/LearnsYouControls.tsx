"use client";

import { useCallback, useEffect, useState } from "react";
import { MaterialSymbol } from "@/components/ui/MaterialSymbol";
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
        className={`${wrapClass} rounded-2xl border border-white/[0.07] bg-white/[0.05] px-3 py-2.5 shadow-none backdrop-blur-xl transition-opacity duration-300 ${
          idle ? "opacity-[0.92]" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex max-w-[11rem] items-center justify-between gap-2">
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
                        borderColor: `${accent}28`,
                        backgroundColor: `${accent}08`,
                      }
                    : { borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(0,0,0,0.2)" }
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
              className="mt-1 text-left text-[10px] text-white/35 transition-colors hover:text-white/50"
            >
              Reset
            </button>
          </div>
          {onHistoryClick ? (
            <button
              type="button"
              onClick={onHistoryClick}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-2 text-xs font-medium text-white/55 transition-colors hover:border-white/12 hover:bg-white/[0.07] hover:text-white/75 active:scale-[0.98]"
              aria-label="Open translation history"
            >
              <MaterialSymbol name="history" className="text-[17px] leading-none opacity-85" />
              History
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
