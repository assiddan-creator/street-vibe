"use client";

import type { TtsVoiceGender } from "@/lib/ttsVoiceGender";

type Props = {
  /** Dialect theme accent (e.g. `resolveTheme(outputLang).accent`). */
  accent: string;
  value: TtsVoiceGender;
  onChange: (next: TtsVoiceGender) => void;
  /** Softer label when the screen is in idle / hero state. */
  idle?: boolean;
  className?: string;
};

/**
 * Compact secondary control — smaller than language rows, quieter than the mic/poster.
 * Kept legible (≥10px touch targets) so it stays visible on real devices and deploy previews.
 */
export function VoiceGenderSegment({ accent, value, onChange, idle, className }: Props) {
  const labelClass = idle
    ? "mb-0.5 text-center text-[7px] uppercase tracking-wider text-white/30"
    : "mb-0.5 text-center text-[8px] uppercase tracking-wider text-white/38";

  return (
    <div className={className ?? ""}>
      <p className={labelClass}>Voice</p>
      <div
        className="mx-auto inline-flex max-w-[8.25rem] rounded-md border border-white/[0.08] bg-black/22 p-px"
        style={{ boxShadow: `inset 0 0 0 1px ${accent}10` }}
      >
        {(["male", "female"] as const).map((v) => {
          const selected = value === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-label={v === "male" ? "Male voice" : "Female voice"}
              aria-checked={selected}
              onClick={() => onChange(v)}
              className={`min-h-[26px] min-w-0 flex-1 rounded-[5px] px-2 py-0.5 text-[10px] font-medium leading-none transition-colors ${
                selected ? "" : "text-white/38 hover:text-white/55"
              }`}
              style={
                selected
                  ? {
                      backgroundColor: `${accent}16`,
                      color: accent,
                    }
                  : undefined
              }
            >
              {v === "male" ? "Male" : "Female"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
