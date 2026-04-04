"use client";

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { TranslationBlockSkeleton } from "@/components/ui/Skeleton";
import { GLASS_OUTPUT_CARD } from "@/lib/themeUiClasses";

export type ResultLabels = {
  source: string;
  translation: string;
  readAloud?: string;
};

type TranslationResultCardProps = {
  accent: string;
  originalText: string;
  translatedText: string;
  dictionaryPills: string[];
  loading: boolean;
  error: string | null;
  /** Shown when non-empty and `showTransliterationRow` is true */
  hebrewTransliteration: string | null;
  /** Hebrew UI or Hebrew input — controls layout + labels; third row only if transliteration present */
  hebrewContext: boolean;
  onWordClick?: (token: string, e: MouseEvent<HTMLElement>) => void;
  /** Extra content after translation block (e.g. TTS on speak page) */
  afterTranslation?: ReactNode;
};

export function TranslationResultCard({
  accent,
  originalText,
  translatedText,
  dictionaryPills,
  loading,
  error,
  hebrewTransliteration,
  hebrewContext,
  onWordClick,
  afterTranslation,
}: TranslationResultCardProps) {
  const labels: ResultLabels = hebrewContext
    ? { source: "מקור", translation: "תרגום", readAloud: "איך לקרוא" }
    : { source: "Original", translation: "Street" };

  const showTransliterationRow =
    hebrewContext && Boolean(hebrewTransliteration?.trim());

  return (
    <div
      className={`${GLASS_OUTPUT_CARD} box-border h-auto min-h-[min(60vh,420px)] max-w-full min-w-0 !max-h-none !overflow-visible !p-5 sm:!p-6`}
      style={
        {
          ["--scroll-thumb" as string]: `${accent}88`,
          ["--scroll-thumb-hover" as string]: `${accent}aa`,
          ["--scroll-track" as string]: "rgba(0,0,0,0.35)",
        } as CSSProperties
      }
    >
      {/*
        Scroll only source + translation here. When overflow-y is auto on the same node as transliteration,
        CSS forces overflow-x to compute to auto and clips RTL lines. Transliteration sits outside that scrollport.
      */}
      <div className="output-card-scroll max-h-[min(70vh,560px)] min-h-0 w-full min-w-0 overflow-y-auto overflow-x-visible">
        <div className="w-full min-w-0 space-y-4">
          <section className="min-w-0 rounded-lg border border-white/[0.07] bg-black/20 p-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">{labels.source}</p>
            <p
              className={`whitespace-pre-wrap break-words text-[12px] leading-relaxed text-white/85 ${hebrewContext ? "text-right" : ""}`}
              dir={hebrewContext ? "rtl" : "auto"}
            >
              {originalText.trim() || "—"}
            </p>
          </section>

          <section className="min-w-0 rounded-lg border border-white/[0.12] bg-gradient-to-b from-white/[0.06] to-transparent p-3.5 shadow-inner">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/50">{labels.translation}</p>
            <div className="min-h-[2.5rem] min-w-0 text-[15px] font-semibold leading-relaxed">
              {loading ? (
                <TranslationBlockSkeleton accent={accent} />
              ) : error ? (
                <p className="text-[12px] font-normal text-red-400">{error}</p>
              ) : translatedText.trim() ? (
                <p className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]" style={{ color: accent }}>
                  {onWordClick
                    ? translatedText.split(/(\s+)/).map((token, i) =>
                        token.trim() ? (
                          <span
                            key={i}
                            onClick={(e) => onWordClick(token, e)}
                            className="cursor-pointer rounded px-0.5 transition-all duration-150 hover:bg-white/10 active:bg-white/20"
                          >
                            {token}
                          </span>
                        ) : (
                          <span key={i}>{token}</span>
                        ),
                      )
                    : translatedText}
                </p>
              ) : null}
            </div>
            {afterTranslation}
          </section>
        </div>
      </div>

      {showTransliterationRow ? (
        <section
          className="mt-4 box-border min-w-0 max-w-full overflow-visible rounded-lg border border-white/[0.06] bg-white/[0.03] p-3"
          dir="rtl"
        >
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {labels.readAloud ?? "איך לקרוא"}
          </p>
          <div className="min-w-0 max-w-full" dir="rtl">
            <p
              dir="rtl"
              className="block h-auto min-h-0 w-full max-w-full min-w-0 whitespace-normal break-words text-right text-[13px] leading-[1.65] text-white/75 [overflow-wrap:anywhere]"
            >
              {hebrewTransliteration?.trim()}
            </p>
          </div>
        </section>
      ) : null}

      <div className="mt-3 flex min-w-0 flex-wrap items-center justify-center gap-1.5">
        {dictionaryPills.map((pill, i) => (
          <span
            key={`${pill}-${i}`}
            className="whitespace-pre-wrap break-words rounded-full border px-3 py-1 text-[11px] font-medium leading-tight transition-all duration-500"
            style={{
              borderColor: `${accent}55`,
              color: accent,
              backgroundColor: `${accent}15`,
            }}
          >
            {pill}
          </span>
        ))}
      </div>
    </div>
  );
}
