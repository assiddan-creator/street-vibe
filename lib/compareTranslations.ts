import type { PublicUsage } from "@/components/UsageMeter";
import { usesPremiumStreetIntensityControls } from "@/lib/dialectRegistry";
import { splitTranslationAndDictionary } from "@/lib/streetVibeTheme";

export type CompareSettings = Readonly<{
  text: string;
  slangLevel: 1 | 2 | 3;
  context: string;
  sourceLanguage: string;
  uiLocale: string;
}>;
export type CompareRow = {
  dialect: string;
  status: "pending" | "success" | "error";
  text: string;
  error?: string;
};
type CompareResponse = { text: string; usage?: PublicUsage };
export type CompareRequest = (settings: CompareSettings, dialect: string) => Promise<CompareResponse>;

export function comparisonDialects(primary: string): string[] {
  return [...new Set([primary, "London Roadman", "Jamaican Patois", "Israeli Street"])].slice(0, 3);
}

export const requestCompareCity: CompareRequest = async (settings, dialect) => {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...settings,
      currentLang: dialect,
      translationMode: "slang",
      isPremiumSelected: usesPremiumStreetIntensityControls(dialect),
      previousMessage: null,
    }),
  });
  const data = await res.json() as { translatedText?: string; fullText?: string; error?: string; usage?: PublicUsage };
  if (!res.ok) throw new Error(data.error || "Translation failed. Please try again.");
  const { translated } = splitTranslationAndDictionary(String(data.fullText ?? "").trim());
  const text = String(data.translatedText ?? translated).trim();
  if (!text) throw new Error("No translation returned. Please try this city again.");
  return { text, usage: data.usage };
};

/** Owns one comparison snapshot; late replies from cleared/replaced runs are ignored. */
export function createComparisonController(
  request: CompareRequest,
  onChange: (rows: CompareRow[]) => void,
  onUsage?: (usage: PublicUsage) => void
) {
  let generation = 0;
  let settings: CompareSettings | null = null;
  let rows: CompareRow[] = [];
  let highestUsed = -1;
  const emit = () => onChange(rows.map(row => ({ ...row })));

  async function run(dialect: string, snapshot: CompareSettings, id: number) {
    try {
      const result = await request(snapshot, dialect);
      if (id !== generation) return;
      if (!result.text.trim()) throw new Error("No translation returned. Please try this city again.");
      rows = rows.map(row => row.dialect === dialect ? { dialect, status: "success", text: result.text } : row);
      if (result.usage && (result.usage.used ?? 0) >= highestUsed) {
        highestUsed = result.usage.used ?? 0;
        onUsage?.(result.usage);
      }
    } catch (error) {
      if (id !== generation) return;
      rows = rows.map(row => row.dialect === dialect ? {
        dialect, status: "error", text: "",
        error: error instanceof Error ? error.message : "Translation failed. Please try again.",
      } : row);
    }
    emit();
  }

  return {
    start(input: CompareSettings, primary: string) {
      const id = ++generation;
      const snapshot = Object.freeze({ ...input });
      settings = snapshot;
      highestUsed = -1;
      rows = comparisonDialects(primary).map(dialect => ({ dialect, status: "pending", text: "" }));
      emit();
      return Promise.all(rows.map(row => run(row.dialect, snapshot, id)));
    },
    retry(dialect: string) {
      if (!settings || !rows.some(row => row.dialect === dialect && row.status === "error")) return Promise.resolve();
      rows = rows.map(row => row.dialect === dialect ? { dialect, status: "pending", text: "" } : row);
      emit();
      return run(dialect, settings, generation);
    },
    clear() {
      generation++;
      settings = null;
      rows = [];
      emit();
    },
    dispose() {
      generation++;
      settings = null;
      rows = [];
    },
  };
}
