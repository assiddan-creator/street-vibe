"use client";

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { TranslationBlockSkeleton } from "@/components/ui/Skeleton";
import { GLASS_OUTPUT_CARD } from "@/lib/themeUiClasses";

export type ResultLabels = {
  source: string;
  translation: string;
};

type TranslationResultCardProps = {
  accent: string;
  originalText: string;
  translatedText: string;
  dictionaryPills: string[];
  loading: boolean;
  error: string | null;
  /** Hebrew UI or Hebrew input — controls מקור / תרגום labels and source direction */
  hebrewContext: boolean;
  onWordClick?: (token: string, e: MouseEvent<HTMLElement>) => void;
  /** Extra content after translation block (e.g. TTS on speak page) */
  afterTranslation?: ReactNode;
  /** Fired after a successful translate finishes and the result was auto-copied to the clipboard */
  onAutoCopied?: () => void;
};

export function TranslationResultCard({
  accent,
  originalText,
  translatedText,
  dictionaryPills,
  loading,
  error,
  hebrewContext,
  onWordClick,
  afterTranslation,
  onAutoCopied,
}: TranslationResultCardProps) {
  const sawLoadingRef = useRef(false);

  useEffect(() => {
    if (loading) {
      sawLoadingRef.current = true;
      return;
    }
    if (!sawLoadingRef.current) return;
    sawLoadingRef.current = false;
    const text = translatedText.trim();
    if (!text || error) return;
    void navigator.clipboard.writeText(text).then(() => {
      onAutoCopied?.();
    });
  }, [loading, translatedText, error, onAutoCopied]);

  const labels: ResultLabels = hebrewContext
    ? { source: "מקור", translation: "תרגום" }
    : { source: "Original", translation: "Street" };

  return (
    <div
      className={`${GLASS_OUTPUT_CARD} box-border h-auto min-h-[min(60vh,420px)] max-w-full min-w-0 !max-h-none !overflow-visible !p-5 sm:!p-7`}
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
        <div className="w-full min-w-0 space-y-5">
          <section className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.04] p-4 backdrop-blur-xl">
            <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.2em] text-white/40">{labels.source}</p>
            <p
              className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-white/75 ${hebrewContext ? "text-right" : ""}`}
              dir={hebrewContext ? "rtl" : "auto"}
            >
              {originalText.trim() || "—"}
            </p>
          </section>

          <section
            className="min-w-0 rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-none backdrop-blur-xl"
            style={{ boxShadow: `inset 0 1px 0 0 ${accent}18` }}
          >
            <p className="mb-3 text-[9px] font-medium uppercase tracking-[0.2em] text-white/45">{labels.translation}</p>
            <div className="min-h-[3rem] min-w-0">
              {loading ? (
                <TranslationBlockSkeleton accent={accent} />
              ) : error ? (
                <p className="text-sm font-normal text-red-400/95">{error}</p>
              ) : translatedText.trim() ? (
                <p
                  className="min-w-0 whitespace-pre-wrap break-words text-2xl font-bold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-3xl"
                  style={{ color: accent }}
                >
                  {onWordClick
                    ? translatedText.split(/(\s+)/).map((token, i) =>
                        token.trim() ? (
                          <span
                            key={i}
                            onClick={(e) => onWordClick(token, e)}
                            className="cursor-pointer rounded-md px-0.5 transition-colors duration-200 hover:bg-white/10 active:bg-white/[0.12]"
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

      <div className="mt-4 flex min-w-0 flex-wrap items-center justify-center gap-2">
        {dictionaryPills.map((pill, i) => (
          <span
            key={`${pill}-${i}`}
            className="whitespace-pre-wrap break-words rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium leading-tight shadow-none backdrop-blur-md transition-all duration-300"
            style={{
              borderColor: `${accent}35`,
              color: accent,
            }}
          >
            {pill}
          </span>
        ))}
      </div>
    </div>
  );
}
