"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  EVAL_PRIORITY_DIALECTS,
  EVAL_PRIORITY_VIBES,
  STREETVIBE_EVAL_CASES,
  type StreetVibeEvalCase,
} from "@/lib/evaluation/streetVibeEvalDataset";
import { splitTranslationAndDictionary } from "@/lib/streetVibeTheme";
import { fetchTtsAudioUrl, getEffectiveTtsEngine } from "@/lib/ttsClient";

type EvalMode = "text" | "speak";

type RowState = {
  translation: string;
  error: string | null;
  loading: boolean;
  reviewNote: string;
  ttsLoading: "minimax" | "google" | "native" | null;
};

const emptyRowState = (): RowState => ({
  translation: "",
  error: null,
  loading: false,
  reviewNote: "",
  ttsLoading: null,
});

export function EvalRunnerClient() {
  const [evalMode, setEvalMode] = useState<EvalMode>("text");
  const [dialect, setDialect] = useState<string>(EVAL_PRIORITY_DIALECTS[0]);
  const [vibe, setVibe] = useState<string>("dm");
  const [slangLevel, setSlangLevel] = useState<1 | 2 | 3>(2);
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(STREETVIBE_EVAL_CASES.map((c) => [c.id, emptyRowState()]))
  );

  const effectiveForMinimax = useMemo(
    () => getEffectiveTtsEngine("minimax", dialect),
    [dialect]
  );
  const effectiveForGoogle = useMemo(
    () => getEffectiveTtsEngine("google", dialect),
    [dialect]
  );

  const runTranslate = useCallback(
    async (c: StreetVibeEvalCase) => {
      setRows((prev) => ({
        ...prev,
        [c.id]: { ...prev[c.id], loading: true, error: null },
      }));
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: c.sourceText.trim(),
            currentLang: dialect,
            translationMode: "slang",
            slangLevel,
            isPremiumSelected: true,
            context: vibe,
            previousMessage: null,
          }),
        });
        const data = (await res.json()) as { fullText?: string; error?: string };
        if (!res.ok) throw new Error(data.error || "Translation failed");
        const full = String(data.fullText ?? "").trim();
        const { translated } = splitTranslationAndDictionary(full);
        setRows((prev) => ({
          ...prev,
          [c.id]: {
            ...prev[c.id],
            translation: translated,
            loading: false,
            error: null,
          },
        }));
      } catch (e) {
        setRows((prev) => ({
          ...prev,
          [c.id]: {
            ...prev[c.id],
            loading: false,
            error: e instanceof Error ? e.message : "Error",
          },
        }));
      }
    },
    [dialect, slangLevel, vibe]
  );

  const runAll = useCallback(async () => {
    for (const c of STREETVIBE_EVAL_CASES) {
      await runTranslate(c);
    }
  }, [runTranslate]);

  const setReviewNote = useCallback((id: string, note: string) => {
    setRows((prev) => ({
      ...prev,
      [id]: { ...prev[id], reviewNote: note },
    }));
  }, []);

  const runTtsProbe = useCallback(
    async (rowId: string, text: string, engine: "minimax" | "google" | "native") => {
      setRows((prev) => ({
        ...prev,
        [rowId]: { ...prev[rowId], ttsLoading: engine },
      }));
      try {
        const url = await fetchTtsAudioUrl(text, dialect, engine, vibe);
        if (url) {
          const audio = new Audio(url);
          await audio.play();
        }
      } catch (e) {
        console.warn("[eval]", "TTS probe failed", engine, e);
      } finally {
        setRows((prev) => ({
          ...prev,
          [rowId]: { ...prev[rowId], ttsLoading: null },
        }));
      }
    },
    [dialect, vibe]
  );

  return (
    <div className="mx-auto min-h-[100dvh] max-w-6xl px-4 py-10 text-white">
      <div className="mb-8 border-b border-white/10 pb-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-emerald-400/80">Dev only</p>
        <h1 className="text-lg font-semibold tracking-tight text-white/95">Output quality evaluation</h1>
        <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-white/45">
          Fixed dataset in <span className="font-mono text-white/55">lib/evaluation/streetVibeEvalDataset.ts</span>.
          Translate rows manually or with &quot;Run all&quot; (one request per row, sequential). No
          automated scoring. TTS uses the same client path as Speak mode; previews may append to local
          analytics like the main app — clear buffer if you need a clean dev rollup.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/" className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/55 hover:text-white/80"
          >
            ← Home
          </Link>
          <Link
            href="/dev/analytics"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/55 hover:text-white/80"
          >
            Local analytics
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-black/35 p-4 backdrop-blur-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Review dimensions</p>
        <div className="flex flex-wrap gap-4 text-[12px]">
          <label className="flex flex-col gap-1 text-white/50">
            <span>Mode</span>
            <select
              value={evalMode}
              onChange={(e) => setEvalMode(e.target.value as EvalMode)}
              className="rounded-lg border border-white/15 bg-black/50 px-2 py-1.5 font-mono text-white/85"
            >
              <option value="text">Text (translation only)</option>
              <option value="speak">Speak (translation + TTS probes)</option>
            </select>
            <span className="text-[10px] text-white/35">{evalMode === "text" ? "Same /api/translate as home." : "TTS buttons use Replicate / Google / browser native."}</span>
          </label>
          <label className="flex flex-col gap-1 text-white/50">
            <span>Dialect</span>
            <select
              value={dialect}
              onChange={(e) => setDialect(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/50 px-2 py-1.5 font-mono text-white/85"
            >
              {EVAL_PRIORITY_DIALECTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-white/50">
            <span>Vibe (context)</span>
            <select
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/50 px-2 py-1.5 font-mono text-white/85"
            >
              {EVAL_PRIORITY_VIBES.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-white/50">
            <span>Slang level</span>
            <select
              value={slangLevel}
              onChange={(e) => setSlangLevel(Number(e.target.value) as 1 | 2 | 3)}
              className="rounded-lg border border-white/15 bg-black/50 px-2 py-1.5 font-mono text-white/85"
            >
              <option value={1}>1 — mild</option>
              <option value={2}>2 — natural</option>
              <option value={3}>3 — heavy</option>
            </select>
          </label>
        </div>
        <p className="text-[11px] leading-relaxed text-white/40">
          Speak engine routing: requested <span className="font-mono text-white/55">minimax</span> (Replicate) →
          effective <span className="font-mono text-emerald-200/80">{effectiveForMinimax}</span>
          {" · "}
          requested <span className="font-mono text-white/55">google</span> → effective{" "}
          <span className="font-mono text-emerald-200/80">{effectiveForGoogle}</span>
          {" · "}
          <span className="font-mono text-white/55">native</span> = browser Web Speech.
        </p>
        <button
          type="button"
          onClick={() => void runAll()}
          className="w-fit rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/80 hover:bg-white/[0.1]"
        >
          Run all translations (sequential, {STREETVIBE_EVAL_CASES.length} calls)
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full min-w-[960px] border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-white/10 bg-black/40 text-[10px] uppercase tracking-wider text-white/40">
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Intent</th>
              <th className="px-3 py-2 font-medium">Input</th>
              <th className="px-3 py-2 font-medium">Translation</th>
              <th className="px-3 py-2 font-medium">Notes</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {STREETVIBE_EVAL_CASES.map((c) => {
              const st = rows[c.id] ?? emptyRowState();
              return (
                <tr key={c.id} className="border-b border-white/[0.06] align-top">
                  <td className="px-3 py-2 font-mono text-white/55">{c.id}</td>
                  <td className="px-3 py-2 text-white/70">
                    <div>{c.categoryLabel}</div>
                    <div className="mt-0.5 text-[10px] text-white/35">{c.intent}</div>
                    {c.vibeNotes ? (
                      <div className="mt-1 text-[10px] italic text-white/30">{c.vibeNotes}</div>
                    ) : null}
                  </td>
                  <td className="max-w-[200px] px-3 py-2 text-white/80">{c.sourceText}</td>
                  <td className="min-w-[220px] px-3 py-2">
                    {st.error ? (
                      <span className="text-red-300/90">{st.error}</span>
                    ) : (
                      <span className="text-white/85">{st.translation || "—"}</span>
                    )}
                  </td>
                  <td className="min-w-[160px] px-3 py-2">
                    <textarea
                      value={st.reviewNote}
                      onChange={(e) => setReviewNote(c.id, e.target.value)}
                      placeholder="Review notes…"
                      rows={2}
                      className="w-full resize-y rounded border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white/80 placeholder:text-white/25"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        disabled={st.loading}
                        onClick={() => void runTranslate(c)}
                        className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-200/90 disabled:opacity-50"
                      >
                        {st.loading ? "…" : "Translate"}
                      </button>
                      {evalMode === "speak" && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          <button
                            type="button"
                            disabled={!st.translation.trim() || st.ttsLoading !== null}
                            onClick={() => void runTtsProbe(c.id, st.translation.trim(), "minimax")}
                            className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-white/60 hover:bg-white/5"
                          >
                            {st.ttsLoading === "minimax" ? "…" : "Replicate"}
                          </button>
                          <button
                            type="button"
                            disabled={!st.translation.trim() || st.ttsLoading !== null}
                            onClick={() => void runTtsProbe(c.id, st.translation.trim(), "google")}
                            className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-white/60 hover:bg-white/5"
                          >
                            {st.ttsLoading === "google" ? "…" : "Google"}
                          </button>
                          <button
                            type="button"
                            disabled={!st.translation.trim() || st.ttsLoading !== null}
                            onClick={() => void runTtsProbe(c.id, st.translation.trim(), "native")}
                            className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-white/60 hover:bg-white/5"
                          >
                            {st.ttsLoading === "native" ? "…" : "Browser"}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
