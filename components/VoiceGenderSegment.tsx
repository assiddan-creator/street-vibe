"use client";

import type { TtsVoiceGender } from "@/lib/ttsVoiceGender";
import { TOP_HELPER_LABEL_CLASS } from "@/lib/topSectionUi";
import { themeAccentAlpha } from "@/lib/themeAccent";

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
 * Compact secondary control — accent from dialect theme only (fills/borders via themeAccentAlpha).
 */
export function VoiceGenderSegment({ accent, value, onChange, idle: _unusedIdle, className }: Props) {
  void _unusedIdle;
  return (
    <div className={`${className ?? ""} flex flex-col items-center`}>
      <p className={TOP_HELPER_LABEL_CLASS}>Voice</p>
      <div
        className="mx-auto inline-flex max-w-[8.25rem] rounded-md border border-white/[0.06] bg-black/18 p-px"
        style={{ boxShadow: `inset 0 0 0 1px ${themeAccentAlpha(accent, "10")}` }}
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
                selected ? "" : "text-white/36 hover:text-white/50"
              }`}
              style={
                selected
                  ? {
                      backgroundColor: themeAccentAlpha(accent, "18"),
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
