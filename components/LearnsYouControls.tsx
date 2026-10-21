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
};

/**
 * Optional local-learning toggle (history lives in the header).
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
    ? `text-[11px] font-medium leading-none ${idle ? "text-white/55" : "text-white/65"}`
    : idle
      ? "text-[10px] uppercase tracking-wider text-white/45"
      : "text-[10px] uppercase tracking-wider text-white/55";

  const wrapClass = belowHero
    ? "w-full"
    : "flex flex-col items-center gap-0.5";

  if (belowHero) {
    // Lives in "More options": a full-size switch plus one plain sentence on what it does.
    return (
      <div className="flex w-full flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium text-white/80">Learn my style</span>
          <button
            type="button"
            role="switch"
            aria-label="Learn my style"
            aria-checked={on}
            onClick={toggle}
            className="relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors"
            style={{ backgroundColor: on ? `${accent}aa` : "rgba(255,255,255,0.15)" }}
          >
            <span
              aria-hidden
              className={`pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                on ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <p className="text-[11px] leading-snug text-white/50">
          Remembers the cities, recipients and tone you pick — on this device only — and leans future results that way.
        </p>
        {on ? (
          <button
            type="button"
            onClick={reset}
            className="self-start text-[11px] text-white/50 underline-offset-2 transition-colors hover:text-white/75 hover:underline"
          >
            Forget what it learned
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={wrapClass}>
      <div className="flex w-full max-w-[4.125rem] items-center justify-between gap-1">
        <span className={labelClass}>Learns You</span>
        <button
          type="button"
          role="switch"
          aria-label="Learns You mode"
          aria-checked={on}
          onClick={toggle}
          className="relative h-2 w-4 shrink-0 rounded-full border transition-colors"
          style={
            on
              ? {
                  borderColor: `${accent}cc`,
                  backgroundColor: `${accent}08`,
                }
              : { borderColor: `${accent}59`, backgroundColor: "rgba(0,0,0,0.18)" }
          }
        >
          <span
            className={`absolute top-px h-1.5 w-1.5 rounded-full bg-white/75 transition-transform ${
              on ? "translate-x-1.5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      <button
        type="button"
        onClick={reset}
        title="Reset learned preferences"
        className="max-w-[4.125rem] text-center text-[10px] text-white/45 hover:text-white/65"
      >
        Reset
      </button>
    </div>
  );
}
