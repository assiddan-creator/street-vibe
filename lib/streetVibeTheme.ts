import { STREETVIBE_DIALECT_REGISTRY, type StreetVibeDialectId } from "@/lib/dialectRegistry";

export type DialectTheme = {
  id: string;
  pillLabel: string;
  bg: string;
  accent: string;
  flag: string;
  city: string;
};

export const DIALECT_THEMES: DialectTheme[] = [
  {
    id: "London Roadman",
    pillLabel: "London",
    bg: "#0d0d1a",
    accent: "#60a5fa",
    flag: "🇬🇧",
    city: "London",
  },
  {
    id: "Jamaican Patois",
    pillLabel: "Kingston",
    bg: "#0a1a0a",
    accent: "#4ade80",
    flag: "🇯🇲",
    city: "Kingston",
  },
  {
    id: "New York Brooklyn",
    pillLabel: "NYC",
    bg: "#1a0a0a",
    accent: "#f87171",
    flag: "🇺🇸",
    city: "Brooklyn",
  },
  {
    id: "Tokyo Gyaru",
    pillLabel: "Tokyo",
    bg: "#0a0f1a",
    accent: "#f43f5e",
    flag: "🇯🇵",
    city: "Tokyo",
  },
  {
    id: "Paris Banlieue",
    pillLabel: "Paris",
    bg: "#1a1400",
    accent: "#60a5fa",
    flag: "🇫🇷",
    city: "Paris",
  },
  {
    id: "Russian Street",
    pillLabel: "Moscow",
    bg: "#0f0f0f",
    accent: "#93c5fd",
    flag: "🇷🇺",
    city: "Moscow",
  },
  {
    id: "Mexico City Barrio",
    pillLabel: "CDMX",
    bg: "#1a0a0f",
    accent: "#f472b6",
    flag: "🇲🇽",
    city: "Mexico City",
  },
  {
    id: "Rio Favela",
    pillLabel: "Rio",
    bg: "#001a0f",
    accent: "#34d399",
    flag: "🇧🇷",
    city: "Rio",
  },
  {
    id: "Israeli Street",
    pillLabel: "Tel Aviv",
    bg: "#0a1528",
    accent: "#93c5fd",
    flag: "🇮🇱",
    city: "Tel Aviv",
  },
  {
    id: "Arabic Egyptian",
    pillLabel: "Cairo",
    bg: "#1a1510",
    accent: "#CE1126",
    flag: "🇪🇬",
    city: "Cairo",
  },
  {
    id: "English (Standard)",
    pillLabel: "English",
    bg: "#0d0d0d",
    accent: "#B22234",
    flag: "🇺🇸",
    city: "USA",
  },
  {
    id: "Spanish",
    pillLabel: "Spanish",
    bg: "#0d0d0d",
    accent: "#c60b1e",
    flag: "🇪🇸",
    city: "Spain",
  },
  {
    id: "French",
    pillLabel: "French",
    bg: "#0d0d0d",
    accent: "#002395",
    flag: "🇫🇷",
    city: "France",
  },
  {
    id: "German",
    pillLabel: "German",
    bg: "#0d0d0d",
    accent: "#DD0000",
    flag: "🇩🇪",
    city: "Germany",
  },
  {
    id: "Italian",
    pillLabel: "Italian",
    bg: "#0d0d0d",
    accent: "#009246",
    flag: "🇮🇹",
    city: "Italy",
  },
  {
    id: "Russian",
    pillLabel: "Russian",
    bg: "#0d0d0d",
    accent: "#D52B1E",
    flag: "🇷🇺",
    city: "Russia",
  },
  {
    id: "Portuguese",
    pillLabel: "Portuguese",
    bg: "#0d0d0d",
    accent: "#006600",
    flag: "🇵🇹",
    city: "Portugal",
  },
  {
    id: "Japanese",
    pillLabel: "Japanese",
    bg: "#0d0d0d",
    accent: "#BC002D",
    flag: "🇯🇵",
    city: "Japan",
  },
  {
    id: "Hebrew (Standard)",
    pillLabel: "Hebrew",
    bg: "#0d0d0d",
    accent: "#0038B8",
    flag: "🇮🇱",
    city: "Israel",
  },
  {
    id: "Arabic",
    pillLabel: "Arabic",
    bg: "#0d0d0d",
    accent: "#007A3D",
    flag: "🇸🇦",
    city: "Arabia",
  },
];

export type StandardOption = { value: string; label: string; flag: string };

export const STANDARD_LANGUAGES: StandardOption[] = [
  { value: "English (Standard)", label: "English", flag: "🇺🇸" },
  { value: "Spanish", label: "Spanish", flag: "🇪🇸" },
  { value: "French", label: "French", flag: "🇫🇷" },
  { value: "German", label: "German", flag: "🇩🇪" },
  { value: "Italian", label: "Italian", flag: "🇮🇹" },
  { value: "Russian", label: "Russian", flag: "🇷🇺" },
  { value: "Portuguese", label: "Portuguese", flag: "🇵🇹" },
  { value: "Japanese", label: "Japanese", flag: "🇯🇵" },
  { value: "Arabic", label: "Arabic", flag: "🇸🇦" },
  { value: "Hebrew (Standard)", label: "Hebrew", flag: "🇮🇱" },
];

export const OUTPUT_PREMIUM_OPTIONS: { value: string; label: string }[] = [
  { value: "Jamaican Patois", label: "🇯🇲 Jamaican Patois" },
  { value: "London Roadman", label: "🇬🇧 London Roadman" },
  { value: "New York Brooklyn", label: "🗽 New York Brooklyn" },
  { value: "Tokyo Gyaru", label: "🇯🇵 Tokyo Gyaru" },
  { value: "Paris Banlieue", label: "🇫🇷 Paris Banlieue" },
  { value: "Russian Street", label: "🇷🇺 Russian Street" },
  { value: "Mexico City Barrio", label: "🇲🇽 Mexico City Barrio" },
  { value: "Rio Favela", label: "🇧🇷 Rio Favela" },
  { value: "Israeli Street", label: "🇮🇱 Israeli Street" },
  { value: "Arabic Egyptian", label: "🇪🇬 Arabic Egyptian" },
];

export const OUTPUT_STANDARD_OPTIONS: { value: string; label: string }[] = [
  { value: "English (Standard)", label: "🇺🇸 English" },
  { value: "Spanish", label: "🇪🇸 Spanish" },
  { value: "French", label: "🇫🇷 French" },
  { value: "German", label: "🇩🇪 German" },
  { value: "Italian", label: "🇮🇹 Italian" },
  { value: "Russian", label: "🇷🇺 Russian" },
  { value: "Portuguese", label: "🇵🇹 Portuguese" },
  { value: "Japanese", label: "🇯🇵 Japanese" },
  { value: "Arabic", label: "🇸🇦 Arabic" },
  { value: "Hebrew (Standard)", label: "🇮🇱 Hebrew" },
];

/** Universal script rule injected before dialect-specific locks (translate API). */
export const SCRIPT_OUTPUT_UNIVERSAL_RULE =
  "The output text must be written in the native script of the target dialect. For Israel/Hebrew, use Hebrew characters only.";

/**
 * Each output dialect maps to its primary language + mandatory script for the LLM.
 * Keys must match `OUTPUT_PREMIUM_OPTIONS` / `OUTPUT_STANDARD_OPTIONS` `value` strings.
 */
export const DIALECT_PRIMARY_LANGUAGE: Record<string, string> = {
  ...Object.fromEntries(
    (Object.keys(STREETVIBE_DIALECT_REGISTRY) as StreetVibeDialectId[]).map((id) => [
      id,
      STREETVIBE_DIALECT_REGISTRY[id].primaryLanguage,
    ])
  ),
  "English (Standard)": "English",
  Spanish: "Spanish",
  French: "French",
  German: "German",
  Italian: "Italian",
  Russian: "Russian",
  Portuguese: "Portuguese",
  Japanese: "Japanese",
  Arabic: "Arabic",
  "Hebrew (Standard)": "Hebrew (Modern Israeli Hebrew)",
};

/** Dialect-specific script enforcement (appended after SCRIPT_OUTPUT_UNIVERSAL_RULE). */
export const DIALECT_SCRIPT_LOCK: Record<string, string> = {
  ...Object.fromEntries(
    (Object.keys(STREETVIBE_DIALECT_REGISTRY) as StreetVibeDialectId[]).map((id) => [
      id,
      STREETVIBE_DIALECT_REGISTRY[id].scriptLock,
    ])
  ),
  "English (Standard)": "Write ONLY in English using the Latin alphabet.",
  Spanish: "Write ONLY in Spanish using the Latin alphabet.",
  French: "Write ONLY in French using the Latin alphabet (with accents).",
  German: "Write ONLY in German using the Latin alphabet.",
  Italian: "Write ONLY in Italian using the Latin alphabet.",
  Russian: "Write ONLY in Russian using Cyrillic. No Latin.",
  Portuguese: "Write ONLY in Portuguese using the Latin alphabet.",
  Japanese: "Write ONLY in Japanese (hiragana, katakana, kanji). No romaji or English for the translation.",
  Arabic: "Write ONLY in Arabic using Arabic script. No English or Latin transliteration for the main text.",
  "Hebrew (Standard)":
    "TARGET: Modern Israeli Hebrew. Write ONLY in Hebrew script (א–ת). No English or Latin. Use proper Hebrew characters for every word of the translation.",
};

export function getDialectPrimaryLanguage(dialectId: string): string {
  return DIALECT_PRIMARY_LANGUAGE[dialectId] ?? dialectId;
}

export function getDialectScriptLock(dialectId: string): string {
  return DIALECT_SCRIPT_LOCK[dialectId] ?? `Write the translation ONLY in the native language and script that matches the target "${dialectId}". Do not default to English unless the target is an English dialect.`;
}

export const NEUTRAL_BG = "#111111";
export const NEUTRAL_ACCENT = "#888888";

export const LOADING_MESSAGES: Record<string, string> = {
  ...Object.fromEntries(
    (Object.keys(STREETVIBE_DIALECT_REGISTRY) as StreetVibeDialectId[]).map((id) => [
      id,
      STREETVIBE_DIALECT_REGISTRY[id].ui.loadingMessage,
    ])
  ),
};

export const STANDARD_LOADING = "Translating…";

export function parseDictionaryPills(raw: string): string[] {
  const cleaned = raw.replace(/^dictionary:\s*/i, "").trim();
  if (!cleaned) return [];
  return cleaned
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export const DICT_SEPARATOR = "|||";

export function splitTranslationAndDictionary(fullText: string): { translated: string; dictRaw: string } {
  const trimmed = fullText.trim();
  const idx = trimmed.indexOf(DICT_SEPARATOR);
  if (idx === -1) {
    return { translated: trimmed, dictRaw: "" };
  }
  return {
    translated: trimmed.slice(0, idx).trim(),
    dictRaw: trimmed.slice(idx + DICT_SEPARATOR.length).trim(),
  };
}

export const INPUT_LANGUAGES = [
  { value: "he-IL", label: "עברית / Hebrew" },
  { value: "en-US", label: "English" },
  { value: "ru-RU", label: "Русский / Russian" },
  { value: "ar-SA", label: "العربية / Arabic" },
  { value: "es-ES", label: "Español / Spanish" },
] as const;

export function resolveTheme(outputLang: string): {
  bg: string;
  accent: string;
  flag: string;
  city: string;
} {
  const premium = DIALECT_THEMES.find((t) => t.id === outputLang);
  if (premium) {
    return { bg: premium.bg, accent: premium.accent, flag: premium.flag, city: premium.city };
  }
  const std = STANDARD_LANGUAGES.find((o) => o.value === outputLang);
  return {
    bg: NEUTRAL_BG,
    accent: NEUTRAL_ACCENT,
    flag: std?.flag ?? "🌐",
    city: std?.label ?? outputLang,
  };
}

export function isPremiumSlang(value: string): boolean {
  return DIALECT_THEMES.some((t) => t.id === value);
}
