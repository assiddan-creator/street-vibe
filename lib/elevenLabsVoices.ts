/**
 * Street Vibe — ElevenLabs regional voice catalogue.
 *
 * Every Voice ID in this file was verified directly against the official
 * ElevenLabs API (`GET /v1/shared-voices`) by `scripts/audit-elevenlabs-voices.mjs`.
 * Nothing here comes from a third-party catalogue, a blog post, or a model's
 * recollection. Re-run the audit to refresh or replace any entry:
 *
 *     node scripts/audit-elevenlabs-voices.mjs --city Kingston
 *
 * IMPORTANT — why these are not active by default
 * ------------------------------------------------
 * Voice Library (shared) voices require a paid ElevenLabs plan. On a free plan
 * the TTS endpoint rejects them:
 *
 *     HTTP 402 payment_required / paid_plan_required
 *     "Free users cannot use library voices via the API."
 *
 * Wiring them in as unconditional defaults would make every premium dialect
 * fail its ElevenLabs call and silently drop to MiniMax on every request. So the
 * catalogue ships inert: it is only consulted when `ELEVENLABS_REGIONAL_VOICES`
 * is switched on (or a specific per-city env override is set). Until then the
 * existing global Will/Jessica premade voices keep serving every dialect, which
 * is exactly the behaviour on `main`.
 */

export type VoiceGender = "male" | "female";

/** Voice metadata as reported by the official ElevenLabs API at audit time. */
export type VerifiedVoice = {
  voiceId: string;
  name: string;
  /** `accent` field from the API, verbatim. */
  accent: string;
  /** `locale` field from the API, verbatim. */
  locale: string | null;
  age: string | null;
  useCase: string | null;
  category: string | null;
  /** `notice_period` in days. `null` means the owner gave no notice period. */
  noticePeriodDays: number | null;
};

export type DialectVoiceStatus =
  /** A regional voice was verified from official API metadata. */
  | "verified"
  /** No regional voice could be verified; global fallback stands. */
  | "needs_native_test";

export type DialectVoiceEntry = {
  /** Display city, for logs and the audit script. */
  city: string;
  /** ElevenLabs `language_code` hint. */
  languageCode: string;
  /** Preferred locale, where the API reports one. */
  locale?: string;
  /** `ELEVENLABS_VOICE_<envPrefix>_MALE` / `_FEMALE`. */
  envPrefix: string;
  status: DialectVoiceStatus;
  male?: VerifiedVoice;
  female?: VerifiedVoice;
  /** What the API metadata actually supported — and what it did not. */
  evidence: string;
};

/** Date the catalogue below was verified against the official API. */
export const VOICE_CATALOGUE_VERIFIED_AT = "2026-09-17";

/**
 * Premium dialect voices. Keys are the internal Street Vibe dialect IDs and must
 * stay in sync with `lib/dialects.ts` / `lib/streetVibeTheme.ts`.
 */
export const PREMIUM_DIALECT_VOICES: Record<string, DialectVoiceEntry> = {
  "Jamaican Patois": {
    city: "Kingston",
    languageCode: "en",
    locale: "en-JM",
    envPrefix: "KINGSTON",
    status: "verified",
    evidence:
      "API reports a real `jamaican` accent with locale en-JM (11 voices). Both picks are accent=jamaican, not American or British reading Patois.",
    male: {
      voiceId: "RPmw5qjRTyUVwSbGoBJp",
      name: "THJ",
      accent: "jamaican",
      locale: "en-JM",
      age: "young",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 180,
    },
    female: {
      voiceId: "Q9Vh1SycNbxygVIup9vI",
      name: "Paulette - Calm, Jamaican Woman",
      accent: "jamaican",
      locale: "en-JM",
      age: "middle_aged",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 730,
    },
  },

  "London Roadman": {
    city: "London",
    languageCode: "en",
    locale: "en-GB",
    envPrefix: "LONDON",
    status: "verified",
    evidence:
      "NO London-specific accent exists in the API: accent=london returns 0 and accent=cockney only 2. These are en-GB `british`, young, conversational — which meets 'young modern British, not American, not formal RP' but does NOT verify a roadman register. Listening test still required.",
    male: {
      voiceId: "DZNh3Yc5s4destl1X9EI",
      name: "Franz",
      accent: "british",
      locale: "en-GB",
      age: "young",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 730,
    },
    female: {
      voiceId: "RkXKdlVJ0SdQ6oXmB4jg",
      name: "Abi",
      accent: "british",
      locale: "en-GB",
      age: "young",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 730,
    },
  },

  "New York Brooklyn": {
    city: "Brooklyn",
    languageCode: "en",
    locale: "en-US",
    envPrefix: "BROOKLYN",
    status: "verified",
    evidence:
      "API exposes a real `new york` accent (33 voices); accent=brooklyn returns 0. Both picks are accent=new york, so neither is the generic-American failure mode the research warned about.",
    male: {
      voiceId: "ewxUvnyvvOehYjKjUVKC",
      name: "Mike - Deep, Calm and Captivating",
      accent: "new york",
      locale: "en-US",
      age: "young",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 365,
    },
    female: {
      voiceId: "DZ2ULBbuhpX6zJYCQic4",
      name: "NYC Calm Alto - Warm, Confident Black Female Voice",
      accent: "new york",
      locale: "en-US",
      age: "young",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 730,
    },
  },

  "Tokyo Gyaru": {
    city: "Tokyo",
    languageCode: "ja",
    locale: "ja-JP",
    envPrefix: "TOKYO",
    status: "verified",
    evidence:
      "API exposes a `kanto` accent (the Tokyo region) distinct from kansai/okinawa. Both picks are accent=kanto, young, conversational. Note: research lead 'Kuon' (B8gJV1IhpuegLxdpXFOE) is accent=standard and FEMALE, not male.",
    male: {
      voiceId: "ku6tlRNlVa98Jhz5xz1B",
      name: "Taro - Calm Japanese Male",
      accent: "kanto",
      locale: "ja-JP",
      age: "young",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 730,
    },
    female: {
      voiceId: "GxhGYQesaQaYKePCZDEC",
      name: "Chii-chan - Neutral and Clear",
      accent: "kanto",
      locale: "ja-JP",
      age: "young",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 730,
    },
  },

  "Paris Banlieue": {
    city: "Paris",
    languageCode: "fr",
    locale: "fr-FR",
    envPrefix: "PARIS",
    status: "verified",
    evidence:
      "API exposes a `parisian` accent with locale fr-FR. Both picks are accent=parisian — no Quebec/Canadian French.",
    male: {
      voiceId: "CYR0HqHoZAUmoZsLWPob",
      name: "Marco - interactive pour vos agents",
      accent: "parisian",
      locale: "fr-FR",
      age: "young",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 730,
    },
    female: {
      voiceId: "MtmOw0YCJmdnFGEjqlkh",
      name: "Clarris - Studio",
      accent: "parisian",
      locale: "fr-FR",
      age: "young",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 730,
    },
  },

  "Russian Street": {
    city: "Moscow",
    languageCode: "ru",
    locale: "ru-RU",
    envPrefix: "MOSCOW",
    status: "verified",
    evidence:
      "API exposes a `moscow` accent distinct from `saint petersburg`. Both picks are accent=moscow. The higher-scoring female 'Molly' was rejected: its own description says the speaker is from Kazakhstan, contradicting the Moscow accent tag.",
    male: {
      voiceId: "JoMSKT9U9IuvcWwxNJUV",
      name: "Vovis",
      accent: "moscow",
      locale: "ru-RU",
      age: "young",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 730,
    },
    female: {
      voiceId: "dJLURfd0OIfcFXn6H1Hq",
      name: "Elena Tymanova",
      accent: "moscow",
      locale: "ru-RU",
      age: "young",
      useCase: "social_media",
      category: "high_quality",
      noticePeriodDays: 730,
    },
  },

  "Mexico City Barrio": {
    city: "Mexico City",
    languageCode: "es",
    locale: "es-MX",
    envPrefix: "CDMX",
    status: "verified",
    evidence:
      "Both picks are accent=mexican with locale es-MX — never es-ES. The male pick's own description says 'a Chilango at heart', i.e. Mexico City specifically. The alternative female 'Marisol' was demoted: her description says Northern Mexico, not CDMX.",
    male: {
      voiceId: "p1Q3ihQuPjyyENa1RGtl",
      name: "Tom - Kind, Sincere and Calm",
      accent: "mexican",
      locale: "es-MX",
      age: "young",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 730,
    },
    female: {
      voiceId: "sORJQTBm9rUDnyKe7RpG",
      name: "Erika - Executive & Friendly",
      accent: "mexican",
      locale: "es-MX",
      age: "young",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 730,
    },
  },

  "Rio Favela": {
    city: "Rio",
    languageCode: "pt",
    locale: "pt-BR",
    envPrefix: "RIO",
    status: "verified",
    evidence:
      "accent=carioca returns 0 — there is no Rio-specific accent tag. Both picks are accent=brazilian with locale pt-BR (never pt-PT). The female pick is the one genuine Rio signal: her official description states a 'natural Rio accent'. The male pick has no Rio-specific evidence and is Brazilian-generic.",
    male: {
      voiceId: "E9a8LlXPNWtyvvSoZzrb",
      name: "Talis - Natural, Relaxed, Real",
      accent: "brazilian",
      locale: "pt-BR",
      age: "young",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 730,
    },
    female: {
      voiceId: "5p4THmLc2S6kXKO1pOM5",
      name: "Nayara Técia",
      accent: "brazilian",
      locale: "pt-BR",
      age: "young",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 730,
    },
  },

  "Israeli Street": {
    city: "Tel Aviv",
    languageCode: "he",
    envPrefix: "TELAVIV",
    status: "needs_native_test",
    evidence:
      "NO Hebrew voice exists in the ElevenLabs shared library. Verified four ways: language=he -> 0 results, locale=he-IL -> HTTP 400 (locale not recognised), search='hebrew' -> 0, accent=israeli -> 0. Deliberately left NULL; the global fallback stands. Do not fill this in without a native listening test.",
  },

  "Arabic Egyptian": {
    city: "Cairo",
    languageCode: "ar",
    locale: "ar-EG",
    envPrefix: "CAIRO",
    status: "verified",
    evidence:
      "API exposes an `egyptian` accent with locale ar-EG, distinct from saudi/gulf/levantine and from `modern standard`. Both picks are accent=egyptian. The top-scoring male 'Hazem' was demoted because its description is explicitly formal/authoritative, which fights a street register.",
    male: {
      voiceId: "4mZ0H4Jh5iqmgAWK97eF",
      name: "Omarii - Confident Customer Care Agent",
      accent: "egyptian",
      locale: "ar-EG",
      age: "young",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 730,
    },
    female: {
      voiceId: "I3u6waC588j43py1kDN2",
      name: "Fatima - Expressive Egyptian",
      accent: "egyptian",
      locale: "ar-EG",
      age: "young",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 730,
    },
  },

  "Spanish Madrid": {
    city: "Madrid",
    languageCode: "es",
    locale: "es-ES",
    envPrefix: "MADRID",
    status: "verified",
    evidence:
      "Both picks are accent=peninsular with locale es-ES — never Mexican or Latin American. The male pick's description states 'native Castilian Spanish'.",
    male: {
      voiceId: "WsvUasyBVDfzPhE0B6jC",
      name: "Diego - Natural, Warm, Conversational",
      accent: "peninsular",
      locale: "es-ES",
      age: "young",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 730,
    },
    female: {
      voiceId: "nH81SxhcPaX89XdDlp2m",
      name: "Cristina - Casual conversation",
      accent: "peninsular",
      locale: "es-ES",
      age: "young",
      useCase: "conversational",
      category: "professional",
      noticePeriodDays: 730,
    },
  },
};

/**
 * `language_code` for every output option, premium and standard. Independent of
 * whether a regional voice exists, so the model always gets a language hint.
 */
export const DIALECT_LANGUAGE_CODE: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(PREMIUM_DIALECT_VOICES).map(([dialect, entry]) => [
      dialect,
      entry.languageCode,
    ])
  ),
  "English (Standard)": "en",
  Spanish: "es",
  French: "fr",
  German: "de",
  Italian: "it",
  Russian: "ru",
  Portuguese: "pt",
  Japanese: "ja",
  Arabic: "ar",
  "Hebrew (Standard)": "he",
};

/** Minimal shape of the env we read, so tests need not touch `process.env`. */
export type VoiceEnv = Record<string, string | undefined>;

/** Global premade fallbacks. Premade voices work on every plan, including free. */
export const GLOBAL_FALLBACK_MALE = "bIHbv24MWmeRgasZH58o"; // Will (premade)
export const GLOBAL_FALLBACK_FEMALE = "cgSgspJ2msm6clMCkdW9"; // Jessica (premade)

function cleanId(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Whether the verified catalogue may supply defaults.
 *
 * Off by default: Voice Library voices 402 on a free ElevenLabs plan, so
 * enabling them there would break the ElevenLabs path for every premium
 * dialect. Flip this on once the account is on a paid plan.
 */
export function regionalVoicesEnabled(env: VoiceEnv = process.env): boolean {
  const raw = env.ELEVENLABS_REGIONAL_VOICES?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

export type VoiceSource =
  /** An `ELEVENLABS_VOICE_<CITY>_<GENDER>` variable was set. */
  | "env-override"
  /** The verified catalogue supplied it (requires ELEVENLABS_REGIONAL_VOICES). */
  | "catalogue"
  /** Global premade Will/Jessica. */
  | "global-fallback";

export type VoiceResolution = {
  voiceId: string;
  languageCode?: string;
  locale?: string;
  source: VoiceSource;
  /** Catalogue name when known — for logs only, never user-facing. */
  voiceName?: string;
};

/** Env var name for a dialect's per-gender override. */
export function voiceEnvVarName(
  dialect: string,
  gender: VoiceGender
): string | undefined {
  const entry = PREMIUM_DIALECT_VOICES[dialect];
  if (!entry) return undefined;
  return `ELEVENLABS_VOICE_${entry.envPrefix}_${gender.toUpperCase()}`;
}

/**
 * Resolve which ElevenLabs voice to use.
 *
 * Precedence:
 *   1. per-dialect env override — always wins, so one city can be A/B tested alone
 *   2. verified catalogue — only when `ELEVENLABS_REGIONAL_VOICES` is enabled
 *   3. global premade fallback
 */
export function resolveElevenLabsVoiceSelection(
  gender: VoiceGender,
  dialect?: string,
  env: VoiceEnv = process.env
): VoiceResolution {
  const entry = dialect ? PREMIUM_DIALECT_VOICES[dialect] : undefined;
  const languageCode = dialect ? DIALECT_LANGUAGE_CODE[dialect] : undefined;
  const fallbackId =
    cleanId(gender === "female" ? env.ELEVENLABS_VOICE_FEMALE : env.ELEVENLABS_VOICE_MALE) ??
    (gender === "female" ? GLOBAL_FALLBACK_FEMALE : GLOBAL_FALLBACK_MALE);

  if (entry) {
    const envName = `ELEVENLABS_VOICE_${entry.envPrefix}_${gender.toUpperCase()}`;
    const override = cleanId(env[envName]);
    if (override) {
      return {
        voiceId: override,
        languageCode: entry.languageCode,
        locale: entry.locale,
        source: "env-override",
      };
    }

    const catalogueVoice = entry[gender];
    if (catalogueVoice && regionalVoicesEnabled(env)) {
      return {
        voiceId: catalogueVoice.voiceId,
        languageCode: entry.languageCode,
        locale: entry.locale,
        source: "catalogue",
        voiceName: catalogueVoice.name,
      };
    }

    return {
      voiceId: fallbackId,
      languageCode: entry.languageCode,
      locale: entry.locale,
      source: "global-fallback",
    };
  }

  return { voiceId: fallbackId, languageCode, source: "global-fallback" };
}

/** Backward-compatible helper for older call sites. */
export function resolveElevenLabsVoiceId(
  gender: VoiceGender,
  dialect?: string,
  env: VoiceEnv = process.env
): string {
  return resolveElevenLabsVoiceSelection(gender, dialect, env).voiceId;
}

/** Cities with no verified regional voice — surfaced by the audit script. */
export function dialectsNeedingNativeTest(): string[] {
  return Object.entries(PREMIUM_DIALECT_VOICES)
    .filter(([, entry]) => entry.status === "needs_native_test")
    .map(([dialect]) => dialect);
}
