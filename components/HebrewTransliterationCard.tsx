"use client";

/**
 * Standalone read-aloud transliteration — intentionally NOT inside TranslationResultCard
 * so overflow/flex on the main card cannot clip RTL Hebrew lines.
 */
export function HebrewTransliterationCard({ text: hebrewTransliteration }: { text: string }) {
  console.log("Transliteration string:", hebrewTransliteration);

  const trimmed = hebrewTransliteration.trim();
  if (!trimmed) return null;

  return (
    <div className="box-border h-auto w-full min-w-0 max-w-full overflow-visible rounded-xl border border-white/10 bg-black/30 p-4 shadow-lg backdrop-blur-md">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">איך לקרוא</p>
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
