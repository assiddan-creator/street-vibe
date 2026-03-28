"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  buildAnalyticsSnapshotExport,
  clearStoredAnalyticsEvents,
  readDevAnalyticsRollup,
  type DevAnalyticsRollup,
} from "@/lib/analyticsEvents";

function pct(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/[0.06] py-1.5 text-[12px] last:border-0">
      <span className="text-white/45">{label}</span>
      <span className="shrink-0 font-mono text-white/85">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/[0.08] bg-black/35 p-4 backdrop-blur-sm">
      <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">{title}</h2>
      {children}
    </section>
  );
}

function formatTop(rows: { label: string; count: number }[]) {
  if (rows.length === 0) return "—";
  return rows.map((r) => `${r.label} (${r.count})`).join(" · ");
}

export function DevAnalyticsClient() {
  const [tick, setTick] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const rollup: DevAnalyticsRollup = useMemo(() => {
    void tick;
    return readDevAnalyticsRollup();
  }, [tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const reset = useCallback(() => {
    clearStoredAnalyticsEvents();
    setTick((t) => t + 1);
  }, []);

  const snapshotJson = useMemo(() => JSON.stringify(buildAnalyticsSnapshotExport(), null, 2), [tick]);

  const copySnapshot = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(snapshotJson);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2500);
    }
  }, [snapshotJson]);

  const downloadSnapshot = useCallback(() => {
    const blob = new Blob([snapshotJson], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `streetvibe-analytics-snapshot-${stamp}.json`;
    a.rel = "noopener";
    a.click();
    URL.revokeObjectURL(url);
  }, [snapshotJson]);

  const r = rollup;
  const txTotal = r.translateSuccessCount + r.translateFailureCount;
  const ttsTotal = r.ttsSuccessCount + r.ttsFailureCount;

  const dialectRows = r.topTargetDialects.map((x) => ({ label: x.dialect, count: x.count }));
  const vibeRows = r.topVibes.map((x) => ({ label: x.vibe, count: x.count }));
  const voiceRows = r.topVoices.map((x) => ({ label: x.voice, count: x.count }));

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-4 py-10 text-white">
      <div className="mb-8 flex flex-col gap-2 border-b border-white/10 pb-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-emerald-400/80">Dev only</p>
        <h1 className="text-lg font-semibold tracking-tight text-white/95">Local analytics</h1>
        <p className="text-[12px] leading-relaxed text-white/45">
          Aggregated counts from <span className="font-mono text-white/55">localStorage</span> only. No message
          content.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/80 transition hover:bg-white/[0.08]"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-red-500/30 bg-red-500/[0.08] px-3 py-1.5 text-[11px] font-medium text-red-300/90 transition hover:bg-red-500/[0.12]"
          >
            Clear local events
          </button>
          <Link
            href="/"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/55 transition hover:text-white/80"
          >
            ← Home
          </Link>
        </div>

        <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/25 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Export snapshot</p>
          <p className="mb-2 text-[11px] leading-relaxed text-white/40">
            Aggregates only (no raw events). JSON matches the current rollup.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void copySnapshot()}
              className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.08] px-3 py-1.5 text-[11px] font-medium text-emerald-200/95 transition hover:bg-emerald-500/[0.12]"
            >
              {copyState === "copied" ? "Copied" : copyState === "error" ? "Copy failed" : "Copy JSON"}
            </button>
            <button
              type="button"
              onClick={downloadSnapshot}
              className="rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/75 transition hover:bg-white/[0.08]"
            >
              Download JSON
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Section title="Overview">
          <Row label="Total events (buffer)" value={String(r.totalEvents)} />
          <Row label="Translate requests (text / speak)" value={`${r.translateFlowSplit.text} / ${r.translateFlowSplit.speak}`} />
          <Row label="App opened (text / speak)" value={`${r.appOpenFlowSplit.text} / ${r.appOpenFlowSplit.speak}`} />
        </Section>

        <Section title="Top dialects (aggregated)">
          <p className="font-mono text-[11px] leading-relaxed text-white/70">{formatTop(dialectRows)}</p>
        </Section>

        <Section title="Top vibes">
          <p className="font-mono text-[11px] leading-relaxed text-white/70">{formatTop(vibeRows)}</p>
        </Section>

        <Section title="Voices (gender, from selection + TTS)">
          <p className="font-mono text-[11px] leading-relaxed text-white/70">{formatTop(voiceRows)}</p>
        </Section>

        <Section title="TTS engines (per tts_requested)">
          <Row label="Effective: minimax / google / native" value={`${r.engineEffectiveCounts.minimax ?? 0} / ${r.engineEffectiveCounts.google ?? 0} / ${r.engineEffectiveCounts.native ?? 0}`} />
          <Row label="Requested: minimax / google / native" value={`${r.engineRequestedCounts.minimax ?? 0} / ${r.engineRequestedCounts.google ?? 0} / ${r.engineRequestedCounts.native ?? 0}`} />
        </Section>

        <Section title="Translate">
          <Row label="Succeeded / failed" value={`${r.translateSuccessCount} / ${r.translateFailureCount}`} />
          <Row label="Failure rate" value={pct(r.translateFailureRate)} />
          <Row label="With Learns You on / off (requests)" value={`${r.translateWithLearnsYouOn} / ${r.translateWithLearnsYouOff}`} />
          <p className="mt-2 text-[10px] text-white/30">Denominator for rate: {txTotal} completed outcomes.</p>
        </Section>

        <Section title="TTS">
          <Row label="Succeeded / failed" value={`${r.ttsSuccessCount} / ${r.ttsFailureCount}`} />
          <Row label="Failure rate" value={pct(r.ttsFailureRate)} />
          <Row label="Replay events / replay ÷ TTS requests" value={`${r.ttsReplayCount} / ${pct(r.ttsReplayRate)}`} />
          <p className="mt-2 text-[10px] text-white/30">Replay rate uses tts_replayed ÷ tts_requested.</p>
        </Section>

        <Section title="Learns You toggles">
          <Row label="Toggle → on / off" value={`${r.learnsYouToggleOn} / ${r.learnsYouToggleOff}`} />
        </Section>

        <Section title="Raw event name counts">
          <pre className="max-h-48 overflow-auto rounded-lg border border-white/[0.06] bg-black/50 p-3 font-mono text-[10px] leading-relaxed text-white/55">
            {JSON.stringify(r.countsByName, null, 2)}
          </pre>
        </Section>
      </div>
    </div>
  );
}
