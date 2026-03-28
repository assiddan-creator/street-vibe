"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { MINIMAX_REPLICATE_DEV_VOICE_PRESETS } from "@/lib/minimaxReplicateVoices";
import { MINIMAX_SLANG_PRONUNCIATION_TONE_V1 } from "@/lib/minimaxSlangPronunciation";
import { speakNativeTts } from "@/lib/ttsClient";
import { getStoredTtsGender } from "@/lib/ttsVoiceGender";

const DIALECT = "New York Brooklyn";
const CONTEXT = "flirt";
const MINIMAX_TUNING = { speed: 1.0, emotion: "auto" } as const;

/** Fixed raw lines — no client-side rewriting; `/api/tts` uses `devRawTts` to skip server shaping (dev only). */
const RAW_SLANG_LINES: { id: string; text: string }[] = [
  { id: "l1", text: "yo wassup damn it's been a minute" },
  { id: "l2", text: "yo deadass good to see you out here" },
  { id: "l3", text: "bet no cap that's fire" },
];

type EngineKey = "minimax" | "google" | "native";

type CellState = {
  loading: boolean;
  error: string | null;
  audioUrl: string | null;
  /** native: last play finished without error */
  nativePlayedOk?: boolean;
};

const EMPTY_CELL: CellState = { loading: false, error: null, audioUrl: null };

function cellKey(lineId: string, engine: EngineKey): string {
  return `${lineId}:${engine}`;
}

async function pollPrediction(predictionId: string): Promise<string> {
  const maxAttempts = 80;
  for (let i = 0; i < maxAttempts; i++) {
    const pollRes = await fetch("/api/tts-poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictionId }),
    });
    const data = (await pollRes.json()) as {
      status?: string;
      output?: string | string[] | null;
      error?: string | null;
    };
    if (data.status === "succeeded") {
      const out = data.output;
      if (typeof out === "string" && out.startsWith("http")) return out;
      if (Array.isArray(out) && out[0] && typeof out[0] === "string") return out[0];
      throw new Error("TTS returned no audio URL");
    }
    if (data.status === "failed" || data.error) {
      throw new Error(typeof data.error === "string" ? data.error : "TTS failed");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("TTS timed out");
}

export function SlangEngineCompareClient() {
  const [cells, setCells] = useState<Record<string, CellState>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [minimaxVoiceId, setMinimaxVoiceId] = useState<string>(() =>
    getStoredTtsGender() === "female" ? "Lively_Girl" : "Casual_Guy"
  );
  const [minimaxSlangPronunciation, setMinimaxSlangPronunciation] = useState(false);
  const [minimaxEnglishNormalization, setMinimaxEnglishNormalization] = useState(true);
  const [minimaxDevDeadassPause, setMinimaxDevDeadassPause] = useState(false);

  const setCell = useCallback((key: string, partial: Partial<CellState>) => {
    setCells((prev) => {
      const merged: CellState = { ...EMPTY_CELL, ...prev[key], ...partial };
      return { ...prev, [key]: merged };
    });
  }, []);

  const runApiEngine = useCallback(
    async (lineId: string, text: string, engine: "minimax" | "google") => {
      const key = cellKey(lineId, engine);
      setBusyKey(key);
      setCell(key, { loading: true, error: null, audioUrl: null });
      try {
        const minimaxTuning =
          engine === "minimax"
            ? {
                ...MINIMAX_TUNING,
                voice_id: minimaxVoiceId,
                slangPronunciation: minimaxSlangPronunciation,
                english_normalization: minimaxEnglishNormalization,
                ...(minimaxDevDeadassPause ? { devSlangPauseAfterDeadass: true } : {}),
              }
            : undefined;
        const startRes = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            dialect: DIALECT,
            engine,
            tuning: engine === "minimax" ? minimaxTuning : { speed: 1.0 },
            ttsGender: getStoredTtsGender(),
            context: CONTEXT,
            devRawTts: true,
          }),
        });
        const startData = (await startRes.json()) as {
          audioBase64?: string;
          engine?: string;
          predictionId?: string;
          error?: string;
        };
        if (!startRes.ok) throw new Error(startData.error || "TTS request failed");

        if (startData.audioBase64) {
          setCell(key, {
            loading: false,
            audioUrl: `data:audio/mp3;base64,${startData.audioBase64}`,
            error: null,
          });
          return;
        }

        const predictionId = startData.predictionId;
        if (!predictionId) throw new Error("No prediction ID from TTS");
        const url = await pollPrediction(predictionId);
        setCell(key, { loading: false, audioUrl: url, error: null });
      } catch (e) {
        setCell(key, {
          loading: false,
          error: e instanceof Error ? e.message : String(e),
          audioUrl: null,
        });
      } finally {
        setBusyKey(null);
      }
    },
    [setCell, minimaxVoiceId, minimaxSlangPronunciation, minimaxEnglishNormalization, minimaxDevDeadassPause]
  );

  const runNative = useCallback(
    async (lineId: string, text: string) => {
      const key = cellKey(lineId, "native");
      setBusyKey(key);
      setCell(key, { loading: true, error: null, audioUrl: null, nativePlayedOk: false });
      try {
        await speakNativeTts(text, DIALECT);
        setCell(key, { loading: false, error: null, audioUrl: null, nativePlayedOk: true });
      } catch (e) {
        setCell(key, {
          loading: false,
          error: e instanceof Error ? e.message : String(e),
          nativePlayedOk: false,
        });
      } finally {
        setBusyKey(null);
      }
    },
    [setCell]
  );

  return (
    <div className="mx-auto min-h-[100dvh] max-w-6xl px-4 py-10 text-white">
      <div className="mb-8 border-b border-white/10 pb-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-emerald-400/80">Dev only</p>
        <h1 className="text-lg font-semibold tracking-tight text-white/95">Tasks 29–30 — Slang engines + MiniMax caps</h1>
        <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-white/45">
          Same lines, same dialect ({DIALECT}), same vibe ({CONTEXT}). Requests use{" "}
          <span className="font-mono text-white/60">devRawTts: true</span> so the server does not run Google/MiniMax speech
          shaping — text is trimmed only. MiniMax defaults: speed 1.0, emotion auto. Use the controls below to test preset
          voices, optional <span className="font-mono">pronunciation_dict</span> for recurring slang, and{" "}
          <span className="font-mono">english_normalization</span>. Google path unchanged. Native = browser reference only.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/55 hover:text-white/80"
          >
            ← Home
          </Link>
          <Link
            href="/dev/replicate-phrasing-bakeoff"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/55 hover:text-white/80"
          >
            Phrasing bakeoffs
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-black/35 p-4 text-[11px] text-white/60">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">MiniMax / Replicate (dev)</p>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-white/45">voice_id</span>
            <select
              value={minimaxVoiceId}
              onChange={(e) => setMinimaxVoiceId(e.target.value)}
              className="min-w-[200px] rounded-lg border border-white/15 bg-black/50 px-2 py-1.5 font-mono text-[10px] text-white/85"
            >
              {MINIMAX_REPLICATE_DEV_VOICE_PRESETS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} — {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={minimaxSlangPronunciation}
              onChange={(e) => setMinimaxSlangPronunciation(e.target.checked)}
              className="rounded border-white/30"
            />
            <span>
              Slang pronunciation map ({MINIMAX_SLANG_PRONUNCIATION_TONE_V1.length} tone entries)
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={minimaxEnglishNormalization}
              onChange={(e) => setMinimaxEnglishNormalization(e.target.checked)}
              className="rounded border-white/30"
            />
            <span>english_normalization</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={minimaxDevDeadassPause}
              onChange={(e) => setMinimaxDevDeadassPause(e.target.checked)}
              className="rounded border-white/30"
            />
            <span>Pause hint after &quot;deadass&quot; (TTS only)</span>
          </label>
        </div>
        <p className="text-[10px] text-white/35">
          Tone entries:{" "}
          <span className="font-mono text-white/50">{MINIMAX_SLANG_PRONUNCIATION_TONE_V1.join(" · ")}</span>
        </p>
      </div>

      <div className="mb-6 overflow-x-auto rounded-xl border border-white/[0.08] bg-black/35">
        <table className="w-full min-w-[900px] border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-white/10 text-white/45">
              <th className="px-3 py-2 font-medium">Raw line</th>
              <th className="px-3 py-2 font-medium">MiniMax / Replicate</th>
              <th className="px-3 py-2 font-medium">Google</th>
              <th className="px-3 py-2 font-medium">Native (browser)</th>
            </tr>
          </thead>
          <tbody>
            {RAW_SLANG_LINES.map((line) => (
              <tr key={line.id} className="border-b border-white/[0.06] align-top">
                <td className="px-3 py-3 font-mono text-[10px] text-white/85">{line.text}</td>
                {(["minimax", "google", "native"] as const).map((eng) => {
                  const k = cellKey(line.id, eng);
                  const c = cells[k];
                  const loading = busyKey === k || c?.loading;
                  return (
                    <td key={eng} className="px-3 py-3">
                      {eng === "native" ? (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={loading || busyKey !== null}
                            onClick={() => void runNative(line.id, line.text)}
                            className="w-fit rounded border border-white/15 px-2 py-1 text-[10px] hover:bg-white/5 disabled:opacity-30"
                          >
                            {loading ? "…" : "Play native"}
                          </button>
                          {c?.nativePlayedOk ? (
                            <span className="text-[10px] text-emerald-400/80">played</span>
                          ) : null}
                          {c?.error ? <span className="text-[10px] text-rose-300/90">{c.error}</span> : null}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={loading || busyKey !== null}
                            onClick={() => void runApiEngine(line.id, line.text, eng)}
                            className="w-fit rounded border border-white/15 px-2 py-1 text-[10px] hover:bg-white/5 disabled:opacity-30"
                          >
                            {loading ? "…" : eng === "minimax" ? "Run MiniMax" : "Run Google"}
                          </button>
                          {c?.audioUrl ? (
                            <audio controls className="h-8 max-w-[220px]" src={c.audioUrl} preload="none" />
                          ) : null}
                          {c?.error ? <span className="text-[10px] text-rose-300/90">{c.error}</span> : null}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-black/20 p-4 text-[11px] leading-relaxed text-white/45">
        <p className="font-medium text-white/65">Listening checklist (fill in while testing)</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-white/50">
          <li>Full line vs drops/chops</li>
          <li>Slang pronunciation (wassup, deadass, cap, fr, etc.)</li>
          <li>Natural vs awkward cadence</li>
          <li>Accent / dialect fit for NYC street</li>
          <li>Viability for slang-first product (no text cleanup)</li>
        </ul>
        <p className="mt-3 text-white/40">
          Task 30 validation: A/B <span className="text-white/55">pronunciation</span> and{" "}
          <span className="text-white/55">english_normalization</span> with the same voice; then try each preset voice on
          one line. Subjective report (best voice, normalization on vs off) must be filled by listening — not automated
          here.
        </p>
      </div>
    </div>
  );
}
