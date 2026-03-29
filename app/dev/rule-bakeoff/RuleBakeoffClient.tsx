"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  DEV_RULE_PROFILE_IDS,
  type DevRuleProfileId,
} from "@/lib/evaluation/devRuleProfile";
import {
  RULE_BAKEOFF_DIALECT_COUNT,
  RULE_BAKEOFF_DIALECT_OPTIONS,
} from "@/lib/evaluation/ruleBakeoffDialects";
import {
  RULE_BAKEOFF_SETS,
  type RuleBakeoffCase,
} from "@/lib/evaluation/ruleBakeoffDataset";
import { EVAL_PRIORITY_VIBES } from "@/lib/evaluation/streetVibeEvalDataset";
import { splitTranslationAndDictionary } from "@/lib/streetVibeTheme";

const RULE_BAKEOFF_DIALECT_GROUPS = [
  "Priority (eval / routing)",
  "Street slang — premium",
  "All languages — standard",
] as const;

const PROFILE_LABELS: Record<DevRuleProfileId, string> = {
  current: "Current",
  safer: "Safer",
  "anti-overcooked": "Anti-overcooked",
  "dialect-tuned": "Dialect-tuned",
};

type OutCell = { text: string; error: string | null; loading: boolean };

type IssueId =
  | "too_generic"
  | "too_much_slang"
  | "scripted"
  | "ai_feel"
  | "wrong_tone"
  | "unnatural_local";

const ISSUE_OPTIONS: { id: IssueId; label: string }[] = [
  { id: "too_generic", label: "Too generic" },
  { id: "too_much_slang", label: "Too much slang" },
  { id: "scripted", label: "Scripted" },
  { id: "ai_feel", label: "AI-feel" },
  { id: "wrong_tone", label: "Wrong tone" },
  { id: "unnatural_local", label: "Unnatural local phrasing" },
];

function emptyOutputs(): Record<DevRuleProfileId, OutCell> {
  return Object.fromEntries(
    DEV_RULE_PROFILE_IDS.map((id) => [id, { text: "", error: null, loading: false }])
  ) as Record<DevRuleProfileId, OutCell>;
}

export function RuleBakeoffClient() {
  const [setKey, setSetKey] = useState<keyof typeof RULE_BAKEOFF_SETS>("chat_realism");
  const [dialect, setDialect] = useState<string>(
    RULE_BAKEOFF_DIALECT_OPTIONS[0]?.value ?? "Jamaican Patois"
  );
  const [vibe, setVibe] = useState<string>("dm");
  const [slangLevel, setSlangLevel] = useState<1 | 2 | 3>(2);

  const activeCases = RULE_BAKEOFF_SETS[setKey].cases;

  const [rows, setRows] = useState<Record<string, {
    outputs: Record<DevRuleProfileId, OutCell>;
    note: string;
    winner: DevRuleProfileId | "";
    issues: Partial<Record<IssueId, boolean>>;
  }>>(() =>
    Object.fromEntries(
      RULE_BAKEOFF_SETS.chat_realism.cases.map((c) => [
        c.id,
        { outputs: emptyOutputs(), note: "", winner: "", issues: {} },
      ])
    )
  );

  const runProfilesForCase = useCallback(
    async (c: RuleBakeoffCase) => {
      setRows((prev) => ({
        ...prev,
        [c.id]: {
          ...prev[c.id],
          outputs: Object.fromEntries(
            DEV_RULE_PROFILE_IDS.map((p) => [p, { text: "", error: null, loading: true }])
          ) as Record<DevRuleProfileId, OutCell>,
        },
      }));

      const results = await Promise.all(
        DEV_RULE_PROFILE_IDS.map(async (profile) => {
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
                devRuleProfile: profile,
              }),
            });
            const data = (await res.json()) as { fullText?: string; error?: string };
            if (!res.ok) throw new Error(data.error || "Translation failed");
            const full = String(data.fullText ?? "").trim();
            const { translated } = splitTranslationAndDictionary(full);
            return { profile, translated, error: null as string | null };
          } catch (e) {
            return {
              profile,
              translated: "",
              error: e instanceof Error ? e.message : "Error",
            };
          }
        })
      );

      setRows((prev) => {
        const outputs = { ...emptyOutputs() };
        for (const r of results) {
          outputs[r.profile] = {
            text: r.translated,
            error: r.error,
            loading: false,
          };
        }
        return {
          ...prev,
          [c.id]: { ...prev[c.id], outputs },
        };
      });
    },
    [dialect, slangLevel, vibe]
  );

  const runAll = useCallback(async () => {
    for (const c of activeCases) {
      await runProfilesForCase(c);
    }
  }, [activeCases, runProfilesForCase]);

  const summary = useMemo(() => {
    const wins: Partial<Record<DevRuleProfileId, number>> = {};
    const issueCounts: Partial<Record<IssueId, number>> = {};
    let rowsWithWinner = 0;

    for (const c of activeCases) {
      const r = rows[c.id];
      if (!r) continue;
      if (r.winner) {
        rowsWithWinner += 1;
        wins[r.winner as DevRuleProfileId] = (wins[r.winner as DevRuleProfileId] ?? 0) + 1;
      }
      for (const opt of ISSUE_OPTIONS) {
        if (r.issues[opt.id]) {
          issueCounts[opt.id] = (issueCounts[opt.id] ?? 0) + 1;
        }
      }
    }

    const sortedIssues = Object.entries(issueCounts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
    const sortedWins = (DEV_RULE_PROFILE_IDS.map((id) => [id, wins[id] ?? 0]) as [DevRuleProfileId, number][]).sort(
      (a, b) => b[1] - a[1]
    );

    return { wins, issueCounts, sortedIssues, sortedWins, rowsWithWinner };
  }, [activeCases, rows]);

  return (
    <div className="mx-auto min-h-[100dvh] max-w-[1600px] px-3 py-8 text-white">
      <div className="mb-6 border-b border-white/10 pb-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-cyan-400/80">Dev only</p>
        <h1 className="text-lg font-semibold tracking-tight text-white/95">Rule bakeoff (text)</h1>
        <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-white/45">
          Compare four prompt profiles on the same inputs. Uses <span className="font-mono text-white/55">devRuleProfile</span>{" "}
          in development only — same model, small instruction overlays. Dialects mirror product output lists (
          {RULE_BAKEOFF_DIALECT_COUNT} options). Not for production traffic.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/55 hover:text-white/80"
          >
            ← Home
          </Link>
          <Link
            href="/dev/evaluation"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/55 hover:text-white/80"
          >
            /dev/evaluation
          </Link>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-white/[0.08] bg-black/35 p-4">
        <label className="flex flex-col gap-1 text-[11px] text-white/50">
          Test set
          <select
            value={setKey}
            onChange={(e) => {
              const k = e.target.value as keyof typeof RULE_BAKEOFF_SETS;
              setSetKey(k);
              const cases = RULE_BAKEOFF_SETS[k].cases;
              setRows((prev) => {
                const next: typeof prev = {};
                for (const c of cases) {
                  next[c.id] = prev[c.id] ?? { outputs: emptyOutputs(), note: "", winner: "", issues: {} };
                }
                return next;
              });
            }}
            className="rounded-lg border border-white/15 bg-black/50 px-2 py-1.5 font-mono text-[11px] text-white/85"
          >
            {Object.entries(RULE_BAKEOFF_SETS).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
          <span className="max-w-xs text-[10px] text-white/35">{RULE_BAKEOFF_SETS[setKey].description}</span>
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-white/50">
          Dialect
          <select
            value={dialect}
            onChange={(e) => setDialect(e.target.value)}
            className="max-w-[min(100vw,320px)] rounded-lg border border-white/15 bg-black/50 px-2 py-1.5 font-mono text-[11px] text-white/85"
          >
            {RULE_BAKEOFF_DIALECT_GROUPS.map((group) => (
              <optgroup key={group} label={group}>
                {RULE_BAKEOFF_DIALECT_OPTIONS.filter((o) => o.group === group).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <span className="text-[10px] text-white/35">
            From <span className="font-mono text-white/45">OUTPUT_PREMIUM_OPTIONS</span> +{" "}
            <span className="font-mono text-white/45">OUTPUT_STANDARD_OPTIONS</span>; priority first.
          </span>
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-white/50">
          Vibe
          <select
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            className="rounded-lg border border-white/15 bg-black/50 px-2 py-1.5 font-mono text-[11px] text-white/85"
          >
            {EVAL_PRIORITY_VIBES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-white/50">
          Slang level
          <select
            value={slangLevel}
            onChange={(e) => setSlangLevel(Number(e.target.value) as 1 | 2 | 3)}
            className="rounded-lg border border-white/15 bg-black/50 px-2 py-1.5 font-mono text-[11px] text-white/85"
          >
            <option value={1}>1 mild</option>
            <option value={2}>2 natural</option>
            <option value={3}>3 heavy</option>
          </select>
        </label>
        <div className="flex flex-col justify-end">
          <button
            type="button"
            onClick={() => void runAll()}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-[11px] font-medium text-cyan-100/90 hover:bg-cyan-500/15"
          >
            Run all rows ({activeCases.length} × 4 calls)
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-white/[0.08] bg-black/40 p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">Summary</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-[10px] text-white/35">Wins (row-level pick)</p>
            <ul className="space-y-0.5 font-mono text-[11px] text-white/70">
              {summary.sortedWins.map(([id, n]) => (
                <li key={id}>
                  {PROFILE_LABELS[id]}: {n}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-white/30">
              Rows with a winner: {summary.rowsWithWinner} / {activeCases.length}
            </p>
          </div>
          <div>
            <p className="mb-1 text-[10px] text-white/35">Recurring issue tags (count across rows)</p>
            <ul className="space-y-0.5 font-mono text-[11px] text-white/70">
              {summary.sortedIssues.length === 0 ? (
                <li className="text-white/35">—</li>
              ) : (
                summary.sortedIssues.map(([id, n]) => (
                  <li key={id}>
                    {ISSUE_OPTIONS.find((o) => o.id === id)?.label ?? id}: {n}
                  </li>
                ))
              )}
            </ul>
            <p className="mt-2 text-[10px] text-white/30">
              Good patterns: infer from winning profile + rows with fewer issue tags; scan per-row notes below.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full min-w-[1100px] border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-white/10 bg-black/50 text-[10px] uppercase tracking-wider text-white/40">
              <th className="sticky left-0 z-10 bg-black/80 px-2 py-2 font-medium">Input</th>
              {DEV_RULE_PROFILE_IDS.map((p) => (
                <th key={p} className="min-w-[140px] px-2 py-2 font-medium text-cyan-200/80">
                  {PROFILE_LABELS[p]}
                </th>
              ))}
              <th className="min-w-[120px] px-2 py-2 font-medium">Winner</th>
              <th className="min-w-[140px] px-2 py-2 font-medium">Issues</th>
              <th className="min-w-[160px] px-2 py-2 font-medium">Notes</th>
              <th className="px-2 py-2 font-medium">Run</th>
            </tr>
          </thead>
          <tbody>
            {activeCases.map((c) => {
              const st = rows[c.id] ?? {
                outputs: emptyOutputs(),
                note: "",
                winner: "" as const,
                issues: {},
              };
              return (
                <tr key={c.id} className="border-b border-white/[0.06] align-top">
                  <td className="sticky left-0 z-10 max-w-[200px] bg-black/70 px-2 py-2">
                    <div className="text-[10px] uppercase text-white/35">{c.label}</div>
                    <div className="mt-0.5 text-white/85">{c.sourceText}</div>
                  </td>
                  {DEV_RULE_PROFILE_IDS.map((p) => {
                    const cell = st.outputs[p] ?? { text: "", error: null, loading: false };
                    return (
                      <td key={p} className="min-w-[140px] px-2 py-2 align-top text-white/80">
                        {cell.loading ? (
                          <span className="text-white/35">…</span>
                        ) : cell.error ? (
                          <span className="text-red-300/90">{cell.error}</span>
                        ) : (
                          <span className="whitespace-pre-wrap break-words">{cell.text || "—"}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 align-top">
                    <select
                      value={st.winner}
                      onChange={(e) =>
                        setRows((prev) => ({
                          ...prev,
                          [c.id]: {
                            ...prev[c.id],
                            winner: e.target.value as DevRuleProfileId | "",
                          },
                        }))
                      }
                      className="w-full rounded border border-white/10 bg-black/50 px-1 py-1 text-[10px] text-white/80"
                    >
                      <option value="">—</option>
                      {DEV_RULE_PROFILE_IDS.map((p) => (
                        <option key={p} value={p}>
                          {PROFILE_LABELS[p]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <div className="flex flex-col gap-1">
                      {ISSUE_OPTIONS.map((opt) => (
                        <label key={opt.id} className="flex cursor-pointer items-center gap-1 text-[10px] text-white/55">
                          <input
                            type="checkbox"
                            checked={!!st.issues[opt.id]}
                            onChange={(e) =>
                              setRows((prev) => ({
                                ...prev,
                                [c.id]: {
                                  ...prev[c.id],
                                  issues: { ...prev[c.id].issues, [opt.id]: e.target.checked },
                                },
                              }))
                            }
                            className="rounded border-white/20"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <textarea
                      value={st.note}
                      onChange={(e) =>
                        setRows((prev) => ({
                          ...prev,
                          [c.id]: { ...prev[c.id], note: e.target.value },
                        }))
                      }
                      placeholder="Quick notes…"
                      rows={3}
                      className="w-full resize-y rounded border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-white/80 placeholder:text-white/25"
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <button
                      type="button"
                      onClick={() => void runProfilesForCase(c)}
                      className="rounded border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-200/90"
                    >
                      Run row
                    </button>
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
