"use client";

import { isRtlReaderLanguage } from "@/lib/transliterationPolicy";

/**
 * Phonetic read-aloud in the user’s usual script — outside TranslationResultCard
 * so overflow/flex on the main card cannot clip long lines.
 */
export function NativeTransliterationCard({
  text,
  sourceLanguage,
}: {
  text: string;
  /** BCP-47; used for RTL vs LTR layout only */
  sourceLanguage?: string;
}) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const rtl = sourceLanguage ? isRtlReaderLanguage(sourceLanguage) : false;

  return (
    <div className="box-border h-auto w-full min-w-0 max-w-full overflow-visible rounded-2xl border border-white/5 bg-white/5 p-4 shadow-none backdrop-blur-2xl">
      <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.2em] text-white/40">Read aloud</p>
      <p
        className={`block h-auto w-full overflow-visible whitespace-normal break-words ${rtl ? "text-right" : "text-left"}`}
        style={{
          direction: rtl ? "rtl" : "ltr",
          unicodeBidi: "plaintext",
          color: "rgba(255,255,255,0.8)",
          fontSize: "13px",
          lineHeight: 1.625,
        }}
      >
        {trimmed}
      </p>
    </div>
  );
}
