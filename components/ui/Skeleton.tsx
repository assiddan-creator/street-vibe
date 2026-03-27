"use client";

import type { CSSProperties } from "react";

const base = "animate-pulse rounded-md bg-white/[0.08]";

export function SkeletonLine({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`${base} ${className}`} style={style} aria-hidden />;
}

/** Translation card loading state */
export function TranslationBlockSkeleton({ accent }: { accent: string }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading translation">
      <div className="space-y-2">
        <SkeletonLine className="h-2.5 w-16 opacity-60" />
        <SkeletonLine className="h-3 w-full" style={{ opacity: 0.85 }} />
        <SkeletonLine className="h-3 w-[92%]" style={{ opacity: 0.7 }} />
      </div>
      <div className="space-y-2 pt-1">
        <SkeletonLine className="h-2.5 w-14 opacity-60" style={{ background: `linear-gradient(90deg, ${accent}22, ${accent}44, ${accent}22)` }} />
        <SkeletonLine className="h-4 w-full" style={{ opacity: 0.8, background: `linear-gradient(90deg, ${accent}18, ${accent}35, ${accent}18)` }} />
        <SkeletonLine className="h-4 w-[88%]" style={{ opacity: 0.65, background: `linear-gradient(90deg, ${accent}14, ${accent}28, ${accent}14)` }} />
        <SkeletonLine className="h-4 w-[72%]" style={{ opacity: 0.55, background: `linear-gradient(90deg, ${accent}12, ${accent}22, ${accent}12)` }} />
      </div>
    </div>
  );
}

export function FlipButtonSkeleton() {
  return (
    <div className="flex flex-1 items-center justify-center gap-2 py-3" aria-hidden>
      <SkeletonLine className="h-5 w-24 rounded-lg" />
    </div>
  );
}

export function TtsPlaySkeleton() {
  return (
    <div className="flex w-full items-center justify-center gap-2 py-2.5" aria-hidden>
      <SkeletonLine className="h-5 w-40 rounded-xl" />
    </div>
  );
}

export function PopupWordSkeleton() {
  return (
    <div className="space-y-2 py-0.5">
      <SkeletonLine className="h-3 w-full" />
      <SkeletonLine className="h-3 w-[90%]" />
    </div>
  );
}

/** Full-width placeholder for initial layout paint */
export function AppShellSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] px-4 pt-10">
      <div className="mx-auto flex max-w-[390px] flex-col gap-6">
        <SkeletonLine className="mx-auto h-8 w-40 rounded-lg" />
        <SkeletonLine className="h-10 w-full rounded-lg" />
        <SkeletonLine className="h-10 w-full rounded-lg" />
        <SkeletonLine className="mx-auto mt-8 h-48 w-48 rounded-full" />
      </div>
    </div>
  );
}
