import { STREETVIBE_HISTORY_VAULT_KEY } from "@/lib/streetVibeStorageKeys";

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
};

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
