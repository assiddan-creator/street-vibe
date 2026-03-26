"use client";

type TranslationOutputProps = {
  text: string;
  placeholder?: string;
  label?: string;
  className?: string;
};

export function TranslationOutput({
  text,
  placeholder = "Your translation will appear here.",
  label = "Translation",
  className = "",
}: TranslationOutputProps) {
  return (
    <div className={className}>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <div
        className="min-h-[120px] rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm leading-relaxed text-zinc-100 whitespace-pre-wrap"
        role="region"
        aria-live="polite"
      >
        {text.trim() ? text : <span className="text-zinc-500">{placeholder}</span>}
      </div>
    </div>
  );
}
