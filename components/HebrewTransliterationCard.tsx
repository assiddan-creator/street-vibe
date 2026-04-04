"use client";

/**
 * Standalone read-aloud transliteration — intentionally NOT inside TranslationResultCard
 * so overflow/flex on the main card cannot clip RTL Hebrew lines.
 */
export function HebrewTransliterationCard({ text }: { text: string }) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  return (
    <div
      dir="rtl"
      className="box-border h-auto w-full min-w-0 max-w-full overflow-visible rounded-xl border border-white/10 bg-black/30 p-4 shadow-lg backdrop-blur-md"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">איך לקרוא</p>
      <p className="h-auto w-full min-w-0 max-w-full whitespace-pre-wrap break-words text-right text-[13px] leading-relaxed text-white/80 [overflow-wrap:anywhere]">
        {trimmed}
      </p>
    </div>
  );
}
