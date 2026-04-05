"use client";

import { useEffect } from "react";
import type { HistoryVaultEntry } from "@/lib/historyVault";
import { MaterialSymbol } from "@/components/ui/MaterialSymbol";

type HistoryVaultSheetProps = {
  open: boolean;
  onClose: () => void;
  accent: string;
  entries: HistoryVaultEntry[];
  onClear: () => void;
  onCopySlang: (slang: string) => void | Promise<void>;
  onRestore: (entry: HistoryVaultEntry) => void;
};

function formatTime(ms: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return "";
  }
}

export function HistoryVaultSheet({
  open,
  onClose,
  accent,
  entries,
  onClear,
  onCopySlang,
  onRestore,
}: HistoryVaultSheetProps) {
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[85] flex flex-col justify-end"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-label="Close history"
      />
      <div
        className="pointer-events-auto relative z-10 mx-auto flex w-full max-w-[min(100%,390px)] flex-col rounded-t-[1.75rem] border border-white/10 border-b-0 bg-[#07070c]/80 backdrop-blur-2xl max-h-[min(88vh,640px)] shadow-[0_-20px_60px_rgba(0,0,0,0.55)]"
        style={{
          boxShadow: `0 -24px 64px rgba(0,0,0,0.5), inset 0 1px 0 ${accent}18`,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-vault-title"
      >
        <div className="mx-auto mt-2.5 h-1 w-11 shrink-0 rounded-full bg-white/15" aria-hidden />

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4 pb-3 pt-3">
          <h2 id="history-vault-title" className="font-heading text-sm font-semibold tracking-tight text-white/90">
            History
          </h2>
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-1 text-[9px] font-medium uppercase tracking-widest text-white/40 transition-colors hover:border-white/10 hover:bg-white/[0.07] hover:text-white/55"
          >
            Clear history
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6 pt-2">
          {entries.length === 0 ? (
            <p className="py-10 text-center text-xs text-white/35">No saved translations yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {entries.map((e) => (
                <li key={e.id}>
                  <article
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-3.5 shadow-none backdrop-blur-xl transition-[border-color,box-shadow] duration-300"
                    style={{
                      boxShadow: `inset 0 1px 0 ${accent}12`,
                    }}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] uppercase tracking-wider text-white/35">
                      <span className="truncate font-medium text-white/50">{e.dialect}</span>
                      <span className="text-white/20">·</span>
                      <span>{e.vibe}</span>
                      <span className="text-white/20">·</span>
                      <span>L{e.slangLevel}</span>
                      <span className="ml-auto shrink-0 text-white/25">{formatTime(e.createdAtMs)}</span>
                    </div>
                    <p className="mb-1.5 line-clamp-2 text-[11px] leading-snug text-white/45">{e.sourceText}</p>
                    <p className="mb-2 text-sm font-semibold leading-snug text-white/90" style={{ color: accent }}>
                      {e.translatedSlang}
                    </p>
                    {e.nativeTransliteration?.trim() ? (
                      <p className="mb-3 line-clamp-2 text-[11px] leading-relaxed text-white/50">{e.nativeTransliteration}</p>
                    ) : null}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void onCopySlang(e.translatedSlang)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.05] py-2 text-[11px] font-semibold text-white/80 transition-all hover:bg-white/[0.09] active:scale-[0.98]"
                        style={{ borderColor: `${accent}30` }}
                      >
                        <MaterialSymbol name="content_copy" className="text-[15px] opacity-80" />
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => onRestore(e)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.05] py-2 text-[11px] font-semibold text-white/80 transition-all hover:bg-white/[0.09] active:scale-[0.98]"
                        style={{ borderColor: `${accent}40`, color: accent }}
                      >
                        <MaterialSymbol name="undo" className="text-[15px] opacity-90" />
                        Restore
                      </button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
