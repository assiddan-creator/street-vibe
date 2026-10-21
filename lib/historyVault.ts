import { STREETVIBE_HISTORY_VAULT_KEY } from "@/lib/streetVibeStorageKeys";
import { DIALECTS } from "@/lib/dialects";
import { SLANG_INTENSITY_SEGMENTS, VIBE_SEGMENTS } from "@/lib/slangSegmentControls";

const MAX_ENTRIES = 100;

export type HistoryVaultEntry = {
  id: string;
  createdAtMs: number;
  sourceText: string;
  translatedSlang: string;
  nativeTransliteration: string | null;
  dialect: string;
  vibe: string;
  slangLevel: 1 | 2 | 3;
  inputLanguage: string;
  /** Which mode produced it. Missing on entries saved before 2026-10 → "translate". */
  kind?: HistoryKind;
  /** Reply / compare lines: the line, its meaning (reply) or its city (compare). */
  items?: HistoryItem[];
  /** Check mode: the full verdict, so a restored check looks like the original. */
  check?: { score: number; verdict: string; fixed: string; tells: string[] };
};

export type HistoryKind = "translate" | "reply" | "compare" | "check";
export type HistoryItem = { text: string; note?: string; dialect?: string };

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isHistoryEntry(x: unknown): x is HistoryVaultEntry {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.createdAtMs === "number" &&
    typeof o.sourceText === "string" &&
    typeof o.translatedSlang === "string" &&
    (o.nativeTransliteration === null || typeof o.nativeTransliteration === "string") &&
    typeof o.dialect === "string" &&
    typeof o.vibe === "string" &&
    (o.slangLevel === 1 || o.slangLevel === 2 || o.slangLevel === 3) &&
    typeof o.inputLanguage === "string"
  );
}

export function loadHistoryVault(): HistoryVaultEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STREETVIBE_HISTORY_VAULT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry);
  } catch {
    return [];
  }
}

export type HistoryVaultAppendInput = Omit<HistoryVaultEntry, "id" | "createdAtMs">;

export function appendHistoryVaultEntry(input: HistoryVaultAppendInput): void {
  if (!isBrowser()) return;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const entry: HistoryVaultEntry = {
    id,
    createdAtMs: Date.now(),
    ...input,
  };
  const prev = loadHistoryVault();
  const next = [entry, ...prev].slice(0, MAX_ENTRIES);
  window.localStorage.setItem(STREETVIBE_HISTORY_VAULT_KEY, JSON.stringify(next));
}

export function clearHistoryVault(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STREETVIBE_HISTORY_VAULT_KEY);
}

const KIND_LABEL: Record<HistoryKind, string> = {
  translate: "Say it",
  reply: "Reply",
  compare: "Compare",
  check: "Check",
};

/** Human header for a history entry, e.g. "Reply · Rio · Someone new · Natural" (no internal ids). */
export function historyEntryLabel(e: HistoryVaultEntry): string {
  const city = DIALECTS.find((d) => d.value === e.dialect)?.label ?? e.dialect;
  const audience =
    VIBE_SEGMENTS.find((v) => v.value === e.vibe)?.text ??
    (e.vibe ? e.vibe.charAt(0).toUpperCase() + e.vibe.slice(1) : "");
  const level = SLANG_INTENSITY_SEGMENTS.find((l) => l.level === e.slangLevel)?.text;
  const kind = e.kind ?? "translate";
  return [kind === "translate" ? null : KIND_LABEL[kind], kind === "compare" ? null : city, audience, level]
    .filter(Boolean)
    .join(" · ");
}
