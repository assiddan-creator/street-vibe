"use client";

/**
 * Standalone read-aloud transliteration — intentionally NOT inside TranslationResultCard
 * so overflow/flex on the main card cannot clip RTL Hebrew lines.
 */
export function HebrewTransliterationCard({ text: hebrewTransliteration }: { text: string }) {
  const trimmed = hebrewTransliteration.trim();
  if (!trimmed) return null;

  return (
    <div className="box-border h-auto w-full min-w-0 max-w-full overflow-visible rounded-2xl border border-white/5 bg-white/5 p-4 shadow-none backdrop-blur-2xl">
      <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.2em] text-white/40">איך לקרוא</p>
      <p
        className="block h-auto w-full overflow-visible whitespace-normal break-words text-right"
        style={{
          direction: "rtl",
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
