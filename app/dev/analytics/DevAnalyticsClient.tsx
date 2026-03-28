"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ANALYTICS_DURATION_BUCKET,
  ANALYTICS_FAILURE_CATEGORY_ORDER,
  buildAnalyticsSnapshotExport,
  clearStoredAnalyticsEvents,
  readDevAnalyticsRollup,
  type AnalyticsFailureCategory,
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

function fmtAvgMs(ms: number | null): string {
  if (ms === null || Number.isNaN(ms)) return "—";
  return `${ms.toFixed(0)} ms`;
}

/** Stable bucket key order for display. */
const DURATION_BUCKET_ORDER = [
  ANALYTICS_DURATION_BUCKET.UNDER_1S,
  ANALYTICS_DURATION_BUCKET.ONE_TO_3S,
  ANALYTICS_DURATION_BUCKET.THREE_TO_7S,
  ANALYTICS_DURATION_BUCKET.SEVEN_PLUS,
] as const;

function formatDurationBuckets(b: DevAnalyticsRollup["translateSuccessByBucket"]): string {
  return DURATION_BUCKET_ORDER.map((k) => `${k}:${b[k]}`).join(" · ");
}

function formatFailureCategories(m: Record<AnalyticsFailureCategory, number>): string {
  const parts = ANALYTICS_FAILURE_CATEGORY_ORDER.filter((k) => m[k] > 0).map((k) => `${k}:${m[k]}`);
  return parts.length ? parts.join(" · ") : "—";
}

/** Dashboard poll interval — visible rollup only; export stays click-fresh. */
const DASHBOARD_POLL_MS = 4000;

export function DevAnalyticsClient() {
  const [tick, setTick] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(() => new Date());
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const rollup: DevAnalyticsRollup = useMemo(() => {
    void tick;
    return readDevAnalyticsRollup();
  }, [tick]);

  useEffect(() => {
    setLastRefreshedAt(new Date());
  }, [tick]);

  useEffect(() => {
    const onFocus = () => setTick((t) => t + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), DASHBOARD_POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const reset = useCallback(() => {
    clearStoredAnalyticsEvents();
    setTick((t) => t + 1);
  }, []);

  const copySnapshot = useCallback(async () => {
    const json = JSON.stringify(buildAnalyticsSnapshotExport(), null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2500);
    }
  }, []);

  const downloadSnapshot = useCallback(() => {
    const json = JSON.stringify(buildAnalyticsSnapshotExport(), null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `streetvibe-analytics-snapshot-${stamp}.json`;
    a.rel = "noopener";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

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
        <p className="text-[11px] leading-relaxed text-white/38">
          On-screen totals update on manual Refresh, window focus, or every {DASHBOARD_POLL_MS / 1000}s; until then
          they can lag behind other tabs. <span className="text-white/55">Copy JSON</span> and{" "}
          <span className="text-white/55">Download JSON</span> always read the latest local data at click time.
        </p>
        <p className="text-[11px] text-white/50">
          <span className="text-white/35">Last refreshed:</span>{" "}
          <span className="font-mono text-emerald-200/85">{lastRefreshedAt.toLocaleString()}</span>
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
            Aggregates only (no raw events). Each copy/download re-reads localStorage and sets{" "}
            <span className="font-mono text-white/50">generatedAt</span> at action time.
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
          <Row label="Failures by category (normalized)" value={formatFailureCategories(r.translateFailureByCategory)} />
          <Row label="With Learns You on / off (requests)" value={`${r.translateWithLearnsYouOn} / ${r.translateWithLearnsYouOff}`} />
          <p className="mt-2 text-[10px] text-white/30">Denominator for rate: {txTotal} completed outcomes.</p>
        </Section>

        <Section title="TTS">
          <Row label="Succeeded / failed" value={`${r.ttsSuccessCount} / ${r.ttsFailureCount}`} />
          <Row label="Failure rate" value={pct(r.ttsFailureRate)} />
          <Row label="Failures by category (normalized)" value={formatFailureCategories(r.ttsFailureByCategory)} />
          <Row label="Replay events / replay ÷ TTS requests" value={`${r.ttsReplayCount} / ${pct(r.ttsReplayRate)}`} />
          <p className="mt-2 text-[10px] text-white/30">Replay rate uses tts_replayed ÷ tts_requested.</p>
        </Section>

        <Section title="Performance (request → outcome)">
          <p className="mb-2 text-[10px] leading-relaxed text-white/35">
            Averages include only events with <span className="font-mono text-white/45">durationMs</span> (newer
            sessions). Buckets: &lt;1s · 1–3s · 3–7s · 7s+.
          </p>
          <Row label="Translate success avg / failure avg" value={`${fmtAvgMs(r.translateSuccessAvgMs)} / ${fmtAvgMs(r.translateFailureAvgMs)}`} />
          <Row label="TTS success avg / failure avg" value={`${fmtAvgMs(r.ttsSuccessAvgMs)} / ${fmtAvgMs(r.ttsFailureAvgMs)}`} />
          <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-white/30">Translate buckets</p>
          <p className="font-mono text-[10px] leading-relaxed text-white/65">
            ok: {formatDurationBuckets(r.translateSuccessByBucket)}
          </p>
          <p className="mt-1 font-mono text-[10px] leading-relaxed text-white/65">
            fail: {formatDurationBuckets(r.translateFailureByBucket)}
          </p>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-white/30">TTS buckets</p>
          <p className="font-mono text-[10px] leading-relaxed text-white/65">
            ok: {formatDurationBuckets(r.ttsSuccessByBucket)}
          </p>
          <p className="mt-1 font-mono text-[10px] leading-relaxed text-white/65">
            fail: {formatDurationBuckets(r.ttsFailureByBucket)}
          </p>
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
