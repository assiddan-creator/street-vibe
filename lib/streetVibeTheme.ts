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
    accent: "#a78bfa",
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
    accent: "#60a5fa",
    flag: "🇯🇵",
    city: "Tokyo",
  },
  {
    id: "Paris Banlieue",
    pillLabel: "Paris",
    bg: "#1a1400",
    accent: "#fbbf24",
    flag: "🇫🇷",
    city: "Paris",
  },
  {
    id: "Russian Street",
    pillLabel: "Moscow",
    bg: "#0f0f0f",
    accent: "#e2e8f0",
    flag: "🇷🇺",
    city: "Moscow",
  },
  {
    id: "Mumbai Hinglish",
    pillLabel: "Mumbai",
    bg: "#1a0f00",
    accent: "#fb923c",
    flag: "🇮🇳",
    city: "Mumbai",
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
  { value: "Mumbai Hinglish", label: "🇮🇳 Mumbai Hinglish" },
  { value: "Mexico City Barrio", label: "🇲🇽 Mexico City Barrio" },
  { value: "Rio Favela", label: "🇧🇷 Rio Favela" },
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

export const NEUTRAL_BG = "#111111";
export const NEUTRAL_ACCENT = "#888888";

export const LOADING_MESSAGES: Record<string, string> = {
  "London Roadman": "Hold tight bruv, mandem is translating...",
  "Jamaican Patois": "Hold a vibes, mi a cook di patwa...",
  "New York Brooklyn": "Hold up my guy, cooking up the heat...",
  "Tokyo Gyaru": "Chotto matte! Cooking something yabai...",
  "Paris Banlieue": "Attends 2s gros, je prépare une dinguerie...",
  "Russian Street": "Sekundu bratan, shcha vsyo budet...",
  "Mumbai Hinglish": "Arey bhai, zara ruk na public...",
  "Mexico City Barrio": "Aguanta tantito, wey...",
  "Rio Favela": "Segura aí, mano...",
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
