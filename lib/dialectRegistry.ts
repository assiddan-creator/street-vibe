/**
 * Central registry of StreetVibe premium dialect metadata.
 * Read-only helpers (`streetVibeTheme`, `googleTtsVoiceConfig`, `minimaxLanguageBoost`) derive
 * premium-dialect maps from this file; standard-language rows remain local to those modules.
 */

import { MINIMAX_VOICE_ID_BY_GENDER } from "@/lib/ttsVoiceGender";

export type StreetVibeDialectId =
  | "London Roadman"
  | "Jamaican Patois"
  | "New York Brooklyn"
  | "Tokyo Gyaru"
  | "Paris Banlieue"
  | "Russian Street"
  | "Mexico City Barrio"
  | "Rio Favela"
  | "Israeli Street";

export type StreetVibeDialectRegistryEntry = {
  id: StreetVibeDialectId;
  primaryLanguage: string;
  scriptLock: string;
  isPremiumSlang: boolean;
  google: {
    languageCode: string;
    speakingRate: number;
    pitch: number;
  };
  minimax: {
    languageBoost: string;
    defaultMaleVoiceId: string;
    defaultFemaleVoiceId: string;
  };
  ui: {
    loadingMessage: string;
  };
};

/** Single source of truth for the nine premium street dialects (TTS + translate script locks + UI loading). */
export const STREETVIBE_DIALECT_REGISTRY: Record<StreetVibeDialectId, StreetVibeDialectRegistryEntry> = {
  "London Roadman": {
    id: "London Roadman",
    primaryLanguage: "English (UK street / Multicultural London English)",
    scriptLock:
      "Write ONLY in English using the Latin alphabet. British street tone; no other languages or scripts.",
    isPremiumSlang: true,
    google: {
      languageCode: "en-GB",
      speakingRate: 0.95,
      pitch: -1.5,
    },
    minimax: {
      languageBoost: "English",
      defaultMaleVoiceId: "Casual_Guy",
      defaultFemaleVoiceId: "Lively_Girl",
    },
    ui: {
      loadingMessage: "Hold tight bruv, mandem is translating...",
    },
  },
  "Jamaican Patois": {
    id: "Jamaican Patois",
    primaryLanguage: "English (Jamaican Patois)",
    scriptLock:
      "Write ONLY in English using the Latin alphabet (Jamaican Patois orthography). No plain standard-English-only paraphrase unless the patois requires it.",
    isPremiumSlang: true,
    google: {
      languageCode: "en-GB",
      speakingRate: 0.9,
      pitch: -1.5,
    },
    minimax: {
      languageBoost: "English",
      defaultMaleVoiceId: "Casual_Guy",
      defaultFemaleVoiceId: "Lively_Girl",
    },
    ui: {
      loadingMessage: "Hold a vibes, mi a cook di patwa...",
    },
  },
  "New York Brooklyn": {
    id: "New York Brooklyn",
    primaryLanguage: "English (NYC / Brooklyn street)",
    scriptLock:
      "Write ONLY in English using the Latin alphabet. NYC street tone; no other languages or scripts.",
    isPremiumSlang: true,
    google: {
      languageCode: "en-US",
      speakingRate: 0.95,
      pitch: 0,
    },
    minimax: {
      languageBoost: "English",
      defaultMaleVoiceId: "Casual_Guy",
      defaultFemaleVoiceId: "Lively_Girl",
    },
    ui: {
      loadingMessage: "Hold up my guy, cooking up the heat...",
    },
  },
  "Tokyo Gyaru": {
    id: "Tokyo Gyaru",
    primaryLanguage: "Japanese",
    scriptLock:
      "Write ONLY in Japanese using hiragana, katakana, and kanji as appropriate. Do not use Latin letters, romaji, or English for the main message body.",
    isPremiumSlang: true,
    google: {
      languageCode: "ja-JP",
      speakingRate: 1.0,
      pitch: 0.5,
    },
    minimax: {
      languageBoost: "Japanese",
      defaultMaleVoiceId: "Casual_Guy",
      defaultFemaleVoiceId: "Lively_Girl",
    },
    ui: {
      loadingMessage: "Chotto matte! Cooking something yabai...",
    },
  },
  "Paris Banlieue": {
    id: "Paris Banlieue",
    primaryLanguage: "French",
    scriptLock:
      "Write ONLY in French using the Latin alphabet (with correct accents). No English.",
    isPremiumSlang: true,
    google: {
      languageCode: "fr-FR",
      speakingRate: 0.95,
      pitch: -1.5,
    },
    minimax: {
      languageBoost: "French",
      defaultMaleVoiceId: "Casual_Guy",
      defaultFemaleVoiceId: "Lively_Girl",
    },
    ui: {
      loadingMessage: "Attends 2s gros, je prépare une dinguerie...",
    },
  },
  "Russian Street": {
    id: "Russian Street",
    primaryLanguage: "Russian",
    scriptLock:
      "Write ONLY in Russian using Cyrillic letters. Do not use Latin characters or English.",
    isPremiumSlang: true,
    google: {
      languageCode: "ru-RU",
      speakingRate: 0.9,
      pitch: -1.5,
    },
    minimax: {
      languageBoost: "Russian",
      defaultMaleVoiceId: "Casual_Guy",
      defaultFemaleVoiceId: "Lively_Girl",
    },
    ui: {
      loadingMessage: "Sekundu bratan, shcha vsyo budet...",
    },
  },
  "Mexico City Barrio": {
    id: "Mexico City Barrio",
    primaryLanguage: "Spanish (Mexico)",
    scriptLock: "Write ONLY in Spanish using the Latin alphabet (Mexico). No English.",
    isPremiumSlang: true,
    google: {
      languageCode: "es-US",
      speakingRate: 0.95,
      pitch: -1.5,
    },
    minimax: {
      languageBoost: "Spanish",
      defaultMaleVoiceId: "Casual_Guy",
      defaultFemaleVoiceId: "Lively_Girl",
    },
    ui: {
      loadingMessage: "Aguanta tantito, wey...",
    },
  },
  "Rio Favela": {
    id: "Rio Favela",
    primaryLanguage: "Portuguese (Brazil)",
    scriptLock: "Write ONLY in Brazilian Portuguese using the Latin alphabet. No English.",
    isPremiumSlang: true,
    google: {
      languageCode: "pt-BR",
      speakingRate: 0.95,
      pitch: -1.5,
    },
    minimax: {
      languageBoost: "Portuguese",
      defaultMaleVoiceId: "Casual_Guy",
      defaultFemaleVoiceId: "Lively_Girl",
    },
    ui: {
      loadingMessage: "Segura aí, mano...",
    },
  },
  "Israeli Street": {
    id: "Israeli Street",
    primaryLanguage: "Hebrew (Israeli street / spoken Hebrew)",
    scriptLock:
      "TARGET DIALECT: Israeli Street (Israel). Write the rewritten message ONLY in Hebrew script (Unicode letters א–ת). Do not use English, Latin, or transliterated Hebrew (e.g. sababa, achi, yalla) as the main output — use authentic Hebrew orthography for slang.",
    isPremiumSlang: true,
    google: {
      languageCode: "he-IL",
      speakingRate: 0.95,
      pitch: 0,
    },
    minimax: {
      languageBoost: "Hebrew",
      defaultMaleVoiceId: "Casual_Guy",
      defaultFemaleVoiceId: "Lively_Girl",
    },
    ui: {
      loadingMessage: "רגע אחד, מתרגמים...",
    },
  },
};

export function getDialectConfig(id: string): StreetVibeDialectRegistryEntry | undefined {
  if (!isKnownPremiumDialect(id)) return undefined;
  return STREETVIBE_DIALECT_REGISTRY[id];
}

export function isKnownPremiumDialect(id: string): id is StreetVibeDialectId {
  return Object.prototype.hasOwnProperty.call(STREETVIBE_DIALECT_REGISTRY, id);
}

/**
 * Dev-only consistency checks for the registry. Never throws; returns human-readable warnings.
 * Call from tests or diagnostics — not used in production hot paths.
 */
export function validateDialectRegistryShape(): string[] {
  const warnings: string[] = [];
  const ids = Object.keys(STREETVIBE_DIALECT_REGISTRY) as StreetVibeDialectId[];

  if (ids.length !== 9) {
    warnings.push(`Expected exactly 9 premium dialect entries, found ${ids.length}.`);
  }

  for (const id of ids) {
    const entry = STREETVIBE_DIALECT_REGISTRY[id];
    if (entry.id !== id) {
      warnings.push(`Key "${id}" does not match entry.id "${entry.id}".`);
    }
    if (!entry.primaryLanguage?.trim()) warnings.push(`Missing primaryLanguage for "${id}".`);
    if (!entry.scriptLock?.trim()) warnings.push(`Missing scriptLock for "${id}".`);
    if (entry.isPremiumSlang !== true) warnings.push(`isPremiumSlang must be true for "${id}".`);

    const { google, minimax, ui } = entry;
    if (!google?.languageCode?.trim()) warnings.push(`Missing google.languageCode for "${id}".`);
    if (typeof google?.speakingRate !== "number" || Number.isNaN(google.speakingRate)) {
      warnings.push(`Invalid google.speakingRate for "${id}".`);
    }
    if (typeof google?.pitch !== "number" || Number.isNaN(google.pitch)) {
      warnings.push(`Invalid google.pitch for "${id}".`);
    }
    if (!minimax?.languageBoost?.trim()) warnings.push(`Missing minimax.languageBoost for "${id}".`);
    if (!minimax?.defaultMaleVoiceId?.trim()) warnings.push(`Missing minimax.defaultMaleVoiceId for "${id}".`);
    if (!minimax?.defaultFemaleVoiceId?.trim()) warnings.push(`Missing minimax.defaultFemaleVoiceId for "${id}".`);
    if (!ui?.loadingMessage?.trim()) warnings.push(`Missing ui.loadingMessage for "${id}".`);

    if (minimax?.defaultMaleVoiceId !== MINIMAX_VOICE_ID_BY_GENDER.male) {
      warnings.push(
        `"${id}": minimax.defaultMaleVoiceId "${minimax?.defaultMaleVoiceId}" does not match MINIMAX_VOICE_ID_BY_GENDER.male "${MINIMAX_VOICE_ID_BY_GENDER.male}".`
      );
    }
    if (minimax?.defaultFemaleVoiceId !== MINIMAX_VOICE_ID_BY_GENDER.female) {
      warnings.push(
        `"${id}": minimax.defaultFemaleVoiceId "${minimax?.defaultFemaleVoiceId}" does not match MINIMAX_VOICE_ID_BY_GENDER.female "${MINIMAX_VOICE_ID_BY_GENDER.female}".`
      );
    }
  }

  return warnings;
}
