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
  /** Placed below poster/mic: minimal emphasis, optional helper. */
  belowHero?: boolean;
};

/**
 * Optional local-learning toggle. Use `belowHero` when placed under the main mic CTA.
 */
export function LearnsYouControls({ accent, idle = false, belowHero = false }: Props) {
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
    ? "text-[7px] uppercase tracking-wider text-white/20"
    : idle
      ? "text-[8px] uppercase tracking-wider text-white/28"
      : "text-[8px] uppercase tracking-wider text-white/36";

  const wrapClass = belowHero
    ? "flex flex-col items-center gap-0.5 opacity-80"
    : "flex flex-col items-center gap-0.5";

  return (
    <div className={wrapClass}>
      <div
        className={`flex items-center justify-between gap-2 ${belowHero ? "max-w-[7rem]" : "w-full max-w-[8.25rem]"}`}
      >
        <span className={labelClass}>Learns You</span>
        <button
          type="button"
          role="switch"
          aria-label="Learns You mode"
          aria-checked={on}
          onClick={toggle}
          className={`relative shrink-0 rounded-full border transition-colors ${belowHero ? "h-3 w-6" : "h-4 w-8"}`}
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
            className={`absolute top-px rounded-full bg-white/75 transition-transform ${
              belowHero ? "h-2 w-2" : "h-3 w-3"
            } ${on ? (belowHero ? "translate-x-[13px]" : "translate-x-[17px]") : "translate-x-0.5"}`}
          />
        </button>
      </div>
      <button
        type="button"
        onClick={reset}
        title="Reset learned preferences"
        className={`text-center hover:text-white/35 ${belowHero ? "text-[7px] text-white/18" : "max-w-[8.25rem] text-[8px] text-white/25 hover:text-white/40"}`}
      >
        Reset
      </button>
    </div>
  );
}
