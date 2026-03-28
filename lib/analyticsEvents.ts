/**
 * Local-first analytics (client storage). No API changes; no PII / message bodies by default.
 * Constants below are the single source of truth for event names and analytics-safe enums.
 */

// --- Source of truth: modes (text vs speak flows) ---

export const ANALYTICS_MODE = {
  TEXT: "text",
  SPEAK: "speak",
} as const;

export type StreetVibeMode = (typeof ANALYTICS_MODE)[keyof typeof ANALYTICS_MODE];

/** Every TTS analytics event uses speak flow mode. */
export const ANALYTICS_TTS_EVENT_MODE = { mode: ANALYTICS_MODE.SPEAK } as const;

// --- Source of truth: TTS engine labels (mirror client engine selector; not server routing logic) ---

export const ANALYTICS_ENGINE = {
  MINIMAX: "minimax",
  GOOGLE: "google",
  NATIVE: "native",
} as const;

export type AnalyticsTtsEngine = (typeof ANALYTICS_ENGINE)[keyof typeof ANALYTICS_ENGINE];

// --- Source of truth: voice gender (analytics only) ---

export const ANALYTICS_TTS_GENDER = {
  MALE: "male",
  FEMALE: "female",
} as const;

export type AnalyticsTtsGender = (typeof ANALYTICS_TTS_GENDER)[keyof typeof ANALYTICS_TTS_GENDER];

// --- Source of truth: event names ---

export const ANALYTICS_EVENT_NAMES = {
  APP_OPENED: "app_opened",
  MODE_SWITCHED: "mode_switched",
  SOURCE_LANGUAGE_SELECTED: "source_language_selected",
  TARGET_DIALECT_SELECTED: "target_dialect_selected",
  VOICE_GENDER_SELECTED: "voice_gender_selected",
  SLANG_LEVEL_SELECTED: "slang_level_selected",
  VIBE_SELECTED: "vibe_selected",
  TRANSLATE_REQUESTED: "translate_requested",
  TRANSLATE_SUCCEEDED: "translate_succeeded",
  TRANSLATE_FAILED: "translate_failed",
  TTS_REQUESTED: "tts_requested",
  TTS_SUCCEEDED: "tts_succeeded",
  TTS_FAILED: "tts_failed",
  TTS_REPLAYED: "tts_replayed",
  LEARNS_YOU_TOGGLED: "learns_you_toggled",
  LEARNED_PREFERENCES_RESET: "learned_preferences_reset",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[keyof typeof ANALYTICS_EVENT_NAMES];

/** Dev/export snapshot schema; bump when aggregate shape changes. */
export const ANALYTICS_SNAPSHOT_SCHEMA_VERSION = "3" as const;

// --- Normalized failure categories (translate + TTS analytics; no raw error text in UI/export) ---

export const ANALYTICS_FAILURE_CATEGORY = {
  NETWORK: "network",
  TIMEOUT: "timeout",
  RATE_LIMITED: "rate_limited",
  PROVIDER_ERROR: "provider_error",
  VALIDATION: "validation",
  ABORTED: "aborted",
  UNKNOWN: "unknown",
} as const;

export type AnalyticsFailureCategory =
  (typeof ANALYTICS_FAILURE_CATEGORY)[keyof typeof ANALYTICS_FAILURE_CATEGORY];

const ANALYTICS_FAILURE_CATEGORY_VALUES = new Set<string>(Object.values(ANALYTICS_FAILURE_CATEGORY));

export function isAnalyticsFailureCategory(x: unknown): x is AnalyticsFailureCategory {
  return typeof x === "string" && ANALYTICS_FAILURE_CATEGORY_VALUES.has(x);
}

/** Display / export order for failure category keys. */
export const ANALYTICS_FAILURE_CATEGORY_ORDER = [
  ANALYTICS_FAILURE_CATEGORY.NETWORK,
  ANALYTICS_FAILURE_CATEGORY.TIMEOUT,
  ANALYTICS_FAILURE_CATEGORY.RATE_LIMITED,
  ANALYTICS_FAILURE_CATEGORY.PROVIDER_ERROR,
  ANALYTICS_FAILURE_CATEGORY.VALIDATION,
  ANALYTICS_FAILURE_CATEGORY.ABORTED,
  ANALYTICS_FAILURE_CATEGORY.UNKNOWN,
] as const satisfies readonly AnalyticsFailureCategory[];

function emptyFailureCategoryCounts(): Record<AnalyticsFailureCategory, number> {
  return {
    [ANALYTICS_FAILURE_CATEGORY.NETWORK]: 0,
    [ANALYTICS_FAILURE_CATEGORY.TIMEOUT]: 0,
    [ANALYTICS_FAILURE_CATEGORY.RATE_LIMITED]: 0,
    [ANALYTICS_FAILURE_CATEGORY.PROVIDER_ERROR]: 0,
    [ANALYTICS_FAILURE_CATEGORY.VALIDATION]: 0,
    [ANALYTICS_FAILURE_CATEGORY.ABORTED]: 0,
    [ANALYTICS_FAILURE_CATEGORY.UNKNOWN]: 0,
  };
}

function analyticsFailureSignalString(reason: unknown): string {
  if (reason instanceof DOMException) return `${reason.name} ${reason.message}`;
  if (reason instanceof Error) return `${reason.name} ${reason.message}`;
  if (typeof reason === "string") return reason;
  return String(reason);
}

function httpStatusFromReason(reason: unknown): number | undefined {
  if (reason && typeof reason === "object" && "httpStatus" in reason) {
    const s = (reason as { httpStatus?: unknown }).httpStatus;
    if (typeof s === "number" && Number.isFinite(s)) return s;
  }
  return undefined;
}

function categorizeFromHttpStatus(status: number): AnalyticsFailureCategory | null {
  if (status === 429) return ANALYTICS_FAILURE_CATEGORY.RATE_LIMITED;
  if (status === 408 || status === 504) return ANALYTICS_FAILURE_CATEGORY.TIMEOUT;
  if (status === 400 || status === 422) return ANALYTICS_FAILURE_CATEGORY.VALIDATION;
  if (status >= 500 && status < 600) return ANALYTICS_FAILURE_CATEGORY.PROVIDER_ERROR;
  return null;
}

function categorizeFromMessageLower(m: string): AnalyticsFailureCategory {
  if (m.includes("abort") || m.includes("aborterror")) return ANALYTICS_FAILURE_CATEGORY.ABORTED;
  if (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("network request failed") ||
    m.includes("load failed") ||
    m.includes("err_network")
  ) {
    return ANALYTICS_FAILURE_CATEGORY.NETWORK;
  }
  if (m.includes("timeout") || m.includes("timed out") || m.includes("etimedout")) {
    return ANALYTICS_FAILURE_CATEGORY.TIMEOUT;
  }
  if (m.includes("429") || m.includes("rate limit") || m.includes("too many requests")) {
    return ANALYTICS_FAILURE_CATEGORY.RATE_LIMITED;
  }
  if (/\b(400|422)\b/.test(m) || m.includes("bad request") || m.includes("validation")) {
    return ANALYTICS_FAILURE_CATEGORY.VALIDATION;
  }
  if (
    /\b(500|502|503)\b/.test(m) ||
    m.includes("translation failed") ||
    m.includes("tts request failed") ||
    m.includes("tts failed") ||
    m.includes("prediction") ||
    m.includes("replicate") ||
    m.includes("speech synthesis")
  ) {
    return ANALYTICS_FAILURE_CATEGORY.PROVIDER_ERROR;
  }
  return ANALYTICS_FAILURE_CATEGORY.UNKNOWN;
}

/**
 * Maps caught errors to a stable analytics category. Uses optional `httpStatus` on `Error` when set by callers.
 * Does not persist raw message text; only the returned enum is stored on failure events.
 */
export function categorizeTranslateAnalyticsFailure(reason: unknown): AnalyticsFailureCategory {
  const status = httpStatusFromReason(reason);
  if (status != null) {
    const fromStatus = categorizeFromHttpStatus(status);
    if (fromStatus != null) return fromStatus;
  }
  const m = analyticsFailureSignalString(reason).toLowerCase();
  return categorizeFromMessageLower(m);
}

/**
 * TTS failures (API + optional native fallback). Pass both errors when both paths failed.
 */
export function categorizeTtsAnalyticsFailure(apiOrSingle: unknown, nativeErr?: unknown): AnalyticsFailureCategory {
  const combined =
    nativeErr === undefined
      ? apiOrSingle
      : `${analyticsFailureSignalString(apiOrSingle)}|${analyticsFailureSignalString(nativeErr)}`;

  const status =
    httpStatusFromReason(apiOrSingle) ?? (nativeErr !== undefined ? httpStatusFromReason(nativeErr) : undefined);
  if (status != null) {
    const fromStatus = categorizeFromHttpStatus(status);
    if (fromStatus != null) return fromStatus;
  }

  const m = analyticsFailureSignalString(combined).toLowerCase();
  if (m.includes("tts timed out")) {
    return ANALYTICS_FAILURE_CATEGORY.TIMEOUT;
  }
  if (m.includes("tts returned no audio") || m.includes("no prediction id")) {
    return ANALYTICS_FAILURE_CATEGORY.PROVIDER_ERROR;
  }
  return categorizeFromMessageLower(m);
}

/** Rollup-friendly duration buckets (request start → success/failure outcome). */
export const ANALYTICS_DURATION_BUCKET = {
  UNDER_1S: "under_1s",
  ONE_TO_3S: "1_to_3s",
  THREE_TO_7S: "3_to_7s",
  SEVEN_PLUS: "7s_plus",
} as const;

export type AnalyticsDurationBucket =
  (typeof ANALYTICS_DURATION_BUCKET)[keyof typeof ANALYTICS_DURATION_BUCKET];

export function durationBucketFromMs(ms: number): AnalyticsDurationBucket {
  const m = Math.max(0, ms);
  if (m < 1000) return ANALYTICS_DURATION_BUCKET.UNDER_1S;
  if (m < 3000) return ANALYTICS_DURATION_BUCKET.ONE_TO_3S;
  if (m < 7000) return ANALYTICS_DURATION_BUCKET.THREE_TO_7S;
  return ANALYTICS_DURATION_BUCKET.SEVEN_PLUS;
}

/** Client timing helper: call `performance.now()` at request start, then pass that value here on outcome. */
export function analyticsDurationFieldsFromStart(perfStart: number): {
  durationMs: number;
  durationBucket: AnalyticsDurationBucket;
} {
  const durationMs = Math.round(performance.now() - perfStart);
  return { durationMs, durationBucket: durationBucketFromMs(durationMs) };
}

function isAnalyticsDurationBucket(x: unknown): x is AnalyticsDurationBucket {
  return (
    x === ANALYTICS_DURATION_BUCKET.UNDER_1S ||
    x === ANALYTICS_DURATION_BUCKET.ONE_TO_3S ||
    x === ANALYTICS_DURATION_BUCKET.THREE_TO_7S ||
    x === ANALYTICS_DURATION_BUCKET.SEVEN_PLUS
  );
}

function emptyDurationBuckets(): Record<AnalyticsDurationBucket, number> {
  return {
    [ANALYTICS_DURATION_BUCKET.UNDER_1S]: 0,
    [ANALYTICS_DURATION_BUCKET.ONE_TO_3S]: 0,
    [ANALYTICS_DURATION_BUCKET.THREE_TO_7S]: 0,
    [ANALYTICS_DURATION_BUCKET.SEVEN_PLUS]: 0,
  };
}

/** Per-event payloads — no raw user message / translation text. */
export type AnalyticsEventPayload =
  | { name: typeof ANALYTICS_EVENT_NAMES.APP_OPENED; mode: StreetVibeMode }
  | { name: typeof ANALYTICS_EVENT_NAMES.MODE_SWITCHED; from: StreetVibeMode; to: StreetVibeMode }
  | { name: typeof ANALYTICS_EVENT_NAMES.SOURCE_LANGUAGE_SELECTED; sourceLanguage: string; mode: StreetVibeMode }
  | { name: typeof ANALYTICS_EVENT_NAMES.TARGET_DIALECT_SELECTED; targetDialect: string; mode: StreetVibeMode }
  | { name: typeof ANALYTICS_EVENT_NAMES.VOICE_GENDER_SELECTED; ttsGender: AnalyticsTtsGender; mode: StreetVibeMode }
  | { name: typeof ANALYTICS_EVENT_NAMES.SLANG_LEVEL_SELECTED; slangLevel: 1 | 2 | 3; mode: StreetVibeMode }
  | { name: typeof ANALYTICS_EVENT_NAMES.VIBE_SELECTED; vibe: string; mode: StreetVibeMode }
  | {
      name: typeof ANALYTICS_EVENT_NAMES.TRANSLATE_REQUESTED;
      mode: StreetVibeMode;
      targetDialect: string;
      sourceLanguage: string;
      slangLevel: 1 | 2 | 3;
      vibe: string;
      textLengthChars: number;
      learnsYouEnabled: boolean;
      implicitGuidancePresent: boolean;
    }
  | {
      name: typeof ANALYTICS_EVENT_NAMES.TRANSLATE_SUCCEEDED;
      mode: StreetVibeMode;
      targetDialect: string;
      learnsYouEnabled: boolean;
      implicitGuidancePresent: boolean;
      durationMs: number;
      durationBucket: AnalyticsDurationBucket;
    }
  | {
      name: typeof ANALYTICS_EVENT_NAMES.TRANSLATE_FAILED;
      mode: StreetVibeMode;
      targetDialect: string;
      failureCategory: AnalyticsFailureCategory;
      learnsYouEnabled: boolean;
      durationMs: number;
      durationBucket: AnalyticsDurationBucket;
    }
  | {
      name: typeof ANALYTICS_EVENT_NAMES.TTS_REQUESTED;
      mode: typeof ANALYTICS_MODE.SPEAK;
      requestedEngine: AnalyticsTtsEngine;
      effectiveEngine: AnalyticsTtsEngine;
      dialect: string;
      ttsGender: AnalyticsTtsGender;
      vibe: string;
      textLengthChars: number;
      learnsYouEnabled: boolean;
      implicitGuidancePresent: boolean;
    }
  | {
      name: typeof ANALYTICS_EVENT_NAMES.TTS_SUCCEEDED;
      mode: typeof ANALYTICS_MODE.SPEAK;
      effectiveEngine: AnalyticsTtsEngine;
      dialect: string;
      usedFallbackNative: boolean;
      durationMs: number;
      durationBucket: AnalyticsDurationBucket;
    }
  | {
      name: typeof ANALYTICS_EVENT_NAMES.TTS_FAILED;
      mode: typeof ANALYTICS_MODE.SPEAK;
      effectiveEngine: AnalyticsTtsEngine;
      dialect: string;
      failureCategory: AnalyticsFailureCategory;
      durationMs: number;
      durationBucket: AnalyticsDurationBucket;
    }
  | {
      name: typeof ANALYTICS_EVENT_NAMES.TTS_REPLAYED;
      mode: typeof ANALYTICS_MODE.SPEAK;
      dialect: string;
      requestedEngine: AnalyticsTtsEngine;
    }
  | { name: typeof ANALYTICS_EVENT_NAMES.LEARNS_YOU_TOGGLED; enabled: boolean }
  | { name: typeof ANALYTICS_EVENT_NAMES.LEARNED_PREFERENCES_RESET };

export type StreetVibeAnalyticsEvent = {
  id: string;
  ts: number;
} & AnalyticsEventPayload;

const STORAGE_KEY = "streetvibe_analytics_events_v1";
const MAX_EVENTS = 500;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Optional future sink (e.g. HTTPS batch). Default null — never blocks local storage. */
export interface AnalyticsRemoteSink {
  send(event: StreetVibeAnalyticsEvent): void | Promise<void>;
}

let analyticsRemoteSink: AnalyticsRemoteSink | null = null;

export function setAnalyticsRemoteSink(sink: AnalyticsRemoteSink | null): void {
  analyticsRemoteSink = sink;
}

/** No-op unless `setAnalyticsRemoteSink` was called; safe to fire after local persist. */
export function sendAnalyticsEventToRemote(event: StreetVibeAnalyticsEvent): void {
  const sink = analyticsRemoteSink;
  if (!sink) return;
  try {
    const out = sink.send(event);
    if (out && typeof (out as Promise<void>).then === "function") {
      void (out as Promise<void>).catch(() => {});
    }
  } catch {
    /* remote failures must not surface to the app */
  }
}

/** Build a consistent context object for logging (no content). */
export function buildAnalyticsContext(input: {
  mode: StreetVibeMode;
  sourceLanguage: string;
  targetDialect: string;
  vibe: string;
  slangLevel: 1 | 2 | 3;
  ttsGender: AnalyticsTtsGender;
  learnsYouEnabled: boolean;
  implicitGuidancePresent: boolean;
}): typeof input {
  return { ...input };
}

export function readStoredAnalyticsEvents(): StreetVibeAnalyticsEvent[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredEvent);
  } catch {
    return [];
  }
}

function isStoredEvent(x: unknown): x is StreetVibeAnalyticsEvent {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.ts === "number" && typeof o.name === "string";
}

export function clearStoredAnalyticsEvents(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export type AnalyticsSummary = {
  total: number;
  countsByName: Partial<Record<AnalyticsEventName, number>>;
  /** Top dialects from selection + translate + tts events (best-effort). */
  topTargetDialects: { dialect: string; count: number }[];
};

/** Extended rollup for dev dashboard — aggregates only, no message bodies. */
export type DevAnalyticsRollup = {
  totalEvents: number;
  countsByName: Partial<Record<AnalyticsEventName, number>>;
  topTargetDialects: { dialect: string; count: number }[];
  topVibes: { vibe: string; count: number }[];
  topVoices: { voice: string; count: number }[];
  /** effectiveEngine from TTS events */
  engineEffectiveCounts: Partial<Record<AnalyticsTtsEngine, number>>;
  /** requestedEngine from tts_requested */
  engineRequestedCounts: Partial<Record<AnalyticsTtsEngine, number>>;
  /** translate_requested counts */
  translateFlowSplit: { text: number; speak: number };
  /** app_opened counts */
  appOpenFlowSplit: { text: number; speak: number };
  ttsReplayCount: number;
  /** Approximate: tts_replayed / tts_requested (each play emits tts_requested). */
  ttsReplayRate: number | null;
  translateSuccessCount: number;
  translateFailureCount: number;
  translateFailureRate: number | null;
  ttsSuccessCount: number;
  ttsFailureCount: number;
  ttsFailureRate: number | null;
  learnsYouToggleOn: number;
  learnsYouToggleOff: number;
  translateWithLearnsYouOn: number;
  translateWithLearnsYouOff: number;
  /** Avg duration (ms) where outcome events include `durationMs` (newer buffer only). */
  translateSuccessAvgMs: number | null;
  translateFailureAvgMs: number | null;
  ttsSuccessAvgMs: number | null;
  ttsFailureAvgMs: number | null;
  translateSuccessByBucket: Record<AnalyticsDurationBucket, number>;
  translateFailureByBucket: Record<AnalyticsDurationBucket, number>;
  ttsSuccessByBucket: Record<AnalyticsDurationBucket, number>;
  ttsFailureByBucket: Record<AnalyticsDurationBucket, number>;
  /** translate_failed counts by `failureCategory` (events without category omitted). */
  translateFailureByCategory: Record<AnalyticsFailureCategory, number>;
  /** tts_failed counts by `failureCategory` (events without category omitted). */
  ttsFailureByCategory: Record<AnalyticsFailureCategory, number>;
};

function dialectFromEvent(e: StreetVibeAnalyticsEvent): string | undefined {
  if ("targetDialect" in e && typeof e.targetDialect === "string") return e.targetDialect;
  if ("dialect" in e && typeof (e as { dialect?: string }).dialect === "string")
    return (e as { dialect: string }).dialect;
  return undefined;
}

function bumpMap(m: Map<string, number>, key: string, n = 1): void {
  m.set(key, (m.get(key) ?? 0) + n);
}

function topNFromMap(m: Map<string, number>, n: number): { key: string; count: number }[] {
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

function isAnalyticsEngine(x: string): x is AnalyticsTtsEngine {
  return x === ANALYTICS_ENGINE.MINIMAX || x === ANALYTICS_ENGINE.GOOGLE || x === ANALYTICS_ENGINE.NATIVE;
}

/**
 * Single-pass aggregation from stored-shaped events (no network).
 * Call with `readStoredAnalyticsEvents()` on the client.
 */
export function computeDevAnalyticsRollup(events: StreetVibeAnalyticsEvent[]): DevAnalyticsRollup {
  const countsByName: Partial<Record<AnalyticsEventName, number>> = {};
  const dialectCounts = new Map<string, number>();
  const vibeCounts = new Map<string, number>();
  const voiceCounts = new Map<string, number>();
  const engineEff: Partial<Record<AnalyticsTtsEngine, number>> = {};
  const engineReq: Partial<Record<AnalyticsTtsEngine, number>> = {};

  let translateText = 0;
  let translateSpeak = 0;
  let appText = 0;
  let appSpeak = 0;
  let learnsYouToggleOn = 0;
  let learnsYouToggleOff = 0;
  let translateWithLearnsYouOn = 0;
  let translateWithLearnsYouOff = 0;

  for (const e of events) {
    countsByName[e.name] = (countsByName[e.name] ?? 0) + 1;

    const d = dialectFromEvent(e);
    if (d) bumpMap(dialectCounts, d);

    if (e.name === ANALYTICS_EVENT_NAMES.VIBE_SELECTED && "vibe" in e && typeof e.vibe === "string") {
      bumpMap(vibeCounts, e.vibe);
    }
    if (e.name === ANALYTICS_EVENT_NAMES.TRANSLATE_REQUESTED && "vibe" in e && typeof e.vibe === "string") {
      bumpMap(vibeCounts, e.vibe);
    }
    if (e.name === ANALYTICS_EVENT_NAMES.TTS_REQUESTED && "vibe" in e && typeof e.vibe === "string") {
      bumpMap(vibeCounts, e.vibe);
    }

    if (e.name === ANALYTICS_EVENT_NAMES.VOICE_GENDER_SELECTED && "ttsGender" in e) {
      bumpMap(voiceCounts, String(e.ttsGender));
    }
    if (e.name === ANALYTICS_EVENT_NAMES.TTS_REQUESTED && "ttsGender" in e) {
      bumpMap(voiceCounts, String(e.ttsGender));
    }

    if (e.name === ANALYTICS_EVENT_NAMES.TTS_REQUESTED) {
      const tr = e as StreetVibeAnalyticsEvent & { requestedEngine?: string; effectiveEngine?: string };
      if (typeof tr.requestedEngine === "string" && isAnalyticsEngine(tr.requestedEngine)) {
        engineReq[tr.requestedEngine] = (engineReq[tr.requestedEngine] ?? 0) + 1;
      }
      if (typeof tr.effectiveEngine === "string" && isAnalyticsEngine(tr.effectiveEngine)) {
        engineEff[tr.effectiveEngine] = (engineEff[tr.effectiveEngine] ?? 0) + 1;
      }
    }

    if (e.name === ANALYTICS_EVENT_NAMES.TRANSLATE_REQUESTED && "mode" in e) {
      if (e.mode === ANALYTICS_MODE.TEXT) translateText += 1;
      if (e.mode === ANALYTICS_MODE.SPEAK) translateSpeak += 1;
      if ("learnsYouEnabled" in e && typeof e.learnsYouEnabled === "boolean") {
        if (e.learnsYouEnabled) translateWithLearnsYouOn += 1;
        else translateWithLearnsYouOff += 1;
      }
    }

    if (e.name === ANALYTICS_EVENT_NAMES.APP_OPENED && "mode" in e) {
      if (e.mode === ANALYTICS_MODE.TEXT) appText += 1;
      if (e.mode === ANALYTICS_MODE.SPEAK) appSpeak += 1;
    }

    if (e.name === ANALYTICS_EVENT_NAMES.LEARNS_YOU_TOGGLED && "enabled" in e && typeof e.enabled === "boolean") {
      if (e.enabled) learnsYouToggleOn += 1;
      else learnsYouToggleOff += 1;
    }
  }

  const tr = countsByName[ANALYTICS_EVENT_NAMES.TTS_REQUESTED] ?? 0;
  const replay = countsByName[ANALYTICS_EVENT_NAMES.TTS_REPLAYED] ?? 0;
  const ttsOk = countsByName[ANALYTICS_EVENT_NAMES.TTS_SUCCEEDED] ?? 0;
  const ttsBad = countsByName[ANALYTICS_EVENT_NAMES.TTS_FAILED] ?? 0;
  const txOk = countsByName[ANALYTICS_EVENT_NAMES.TRANSLATE_SUCCEEDED] ?? 0;
  const txBad = countsByName[ANALYTICS_EVENT_NAMES.TRANSLATE_FAILED] ?? 0;

  const ttsReplayRate = tr > 0 ? replay / tr : null;
  const translateFailureRate =
    txOk + txBad > 0 ? txBad / (txOk + txBad) : null;
  const ttsFailureRate = ttsOk + ttsBad > 0 ? ttsBad / (ttsOk + ttsBad) : null;

  const topTargetDialects = topNFromMap(dialectCounts, 12).map(({ key: dialect, count }) => ({
    dialect,
    count,
  }));
  const topVibes = topNFromMap(vibeCounts, 12).map(({ key: vibe, count }) => ({ vibe, count }));
  const topVoices = topNFromMap(voiceCounts, 8).map(({ key: voice, count }) => ({ voice, count }));

  const translateSuccessByBucket = emptyDurationBuckets();
  const translateFailureByBucket = emptyDurationBuckets();
  const ttsSuccessByBucket = emptyDurationBuckets();
  const ttsFailureByBucket = emptyDurationBuckets();
  let translateSuccessSum = 0;
  let translateSuccessN = 0;
  let translateFailureSum = 0;
  let translateFailureN = 0;
  let ttsSuccessSum = 0;
  let ttsSuccessN = 0;
  let ttsFailureSum = 0;
  let ttsFailureN = 0;

  for (const e of events) {
    const dm = (e as { durationMs?: unknown }).durationMs;
    const db = (e as { durationBucket?: unknown }).durationBucket;
    if (typeof dm !== "number" || !isAnalyticsDurationBucket(db)) continue;

    if (e.name === ANALYTICS_EVENT_NAMES.TRANSLATE_SUCCEEDED) {
      translateSuccessSum += dm;
      translateSuccessN += 1;
      translateSuccessByBucket[db] += 1;
    } else if (e.name === ANALYTICS_EVENT_NAMES.TRANSLATE_FAILED) {
      translateFailureSum += dm;
      translateFailureN += 1;
      translateFailureByBucket[db] += 1;
    } else if (e.name === ANALYTICS_EVENT_NAMES.TTS_SUCCEEDED) {
      ttsSuccessSum += dm;
      ttsSuccessN += 1;
      ttsSuccessByBucket[db] += 1;
    } else if (e.name === ANALYTICS_EVENT_NAMES.TTS_FAILED) {
      ttsFailureSum += dm;
      ttsFailureN += 1;
      ttsFailureByBucket[db] += 1;
    }
  }

  const translateFailureByCategory = emptyFailureCategoryCounts();
  const ttsFailureByCategory = emptyFailureCategoryCounts();
  for (const e of events) {
    if (e.name === ANALYTICS_EVENT_NAMES.TRANSLATE_FAILED) {
      const fc = (e as { failureCategory?: unknown }).failureCategory;
      if (isAnalyticsFailureCategory(fc)) translateFailureByCategory[fc] += 1;
    } else if (e.name === ANALYTICS_EVENT_NAMES.TTS_FAILED) {
      const fc = (e as { failureCategory?: unknown }).failureCategory;
      if (isAnalyticsFailureCategory(fc)) ttsFailureByCategory[fc] += 1;
    }
  }

  return {
    totalEvents: events.length,
    countsByName,
    topTargetDialects,
    topVibes,
    topVoices,
    engineEffectiveCounts: engineEff,
    engineRequestedCounts: engineReq,
    translateFlowSplit: { text: translateText, speak: translateSpeak },
    appOpenFlowSplit: { text: appText, speak: appSpeak },
    ttsReplayCount: replay,
    ttsReplayRate,
    translateSuccessCount: txOk,
    translateFailureCount: txBad,
    translateFailureRate,
    ttsSuccessCount: ttsOk,
    ttsFailureCount: ttsBad,
    ttsFailureRate,
    learnsYouToggleOn,
    learnsYouToggleOff,
    translateWithLearnsYouOn,
    translateWithLearnsYouOff,
    translateSuccessAvgMs: translateSuccessN > 0 ? translateSuccessSum / translateSuccessN : null,
    translateFailureAvgMs: translateFailureN > 0 ? translateFailureSum / translateFailureN : null,
    ttsSuccessAvgMs: ttsSuccessN > 0 ? ttsSuccessSum / ttsSuccessN : null,
    ttsFailureAvgMs: ttsFailureN > 0 ? ttsFailureSum / ttsFailureN : null,
    translateSuccessByBucket,
    translateFailureByBucket,
    ttsSuccessByBucket,
    ttsFailureByBucket,
    translateFailureByCategory,
    ttsFailureByCategory,
  };
}

export function summarizeStoredAnalyticsEvents(
  events?: StreetVibeAnalyticsEvent[]
): AnalyticsSummary {
  const list = events ?? readStoredAnalyticsEvents();
  const rollup = computeDevAnalyticsRollup(list);
  return {
    total: rollup.totalEvents,
    countsByName: rollup.countsByName,
    topTargetDialects: rollup.topTargetDialects,
  };
}

/** Convenience for dev tools: read storage + full rollup. Client-only storage. */
export function readDevAnalyticsRollup(): DevAnalyticsRollup {
  return computeDevAnalyticsRollup(readStoredAnalyticsEvents());
}

/** Snapshot for copy/download — aggregates only; no event payloads or textLengthChars. */
export type AnalyticsSnapshotExport = {
  schemaVersion: typeof ANALYTICS_SNAPSHOT_SCHEMA_VERSION;
  generatedAt: string;
  totalEvents: number;
  translateFlowSplit: DevAnalyticsRollup["translateFlowSplit"];
  appOpenFlowSplit: DevAnalyticsRollup["appOpenFlowSplit"];
  topTargetDialects: DevAnalyticsRollup["topTargetDialects"];
  topVibes: DevAnalyticsRollup["topVibes"];
  topVoices: DevAnalyticsRollup["topVoices"];
  engineEffectiveCounts: DevAnalyticsRollup["engineEffectiveCounts"];
  engineRequestedCounts: DevAnalyticsRollup["engineRequestedCounts"];
  translateSuccessCount: number;
  translateFailureCount: number;
  translateFailureRate: number | null;
  ttsSuccessCount: number;
  ttsFailureCount: number;
  ttsFailureRate: number | null;
  ttsReplayCount: number;
  ttsReplayRate: number | null;
  learnsYouToggleOn: number;
  learnsYouToggleOff: number;
  translateWithLearnsYouOn: number;
  translateWithLearnsYouOff: number;
  countsByName: DevAnalyticsRollup["countsByName"];
  translateSuccessAvgMs: DevAnalyticsRollup["translateSuccessAvgMs"];
  translateFailureAvgMs: DevAnalyticsRollup["translateFailureAvgMs"];
  ttsSuccessAvgMs: DevAnalyticsRollup["ttsSuccessAvgMs"];
  ttsFailureAvgMs: DevAnalyticsRollup["ttsFailureAvgMs"];
  translateSuccessByBucket: DevAnalyticsRollup["translateSuccessByBucket"];
  translateFailureByBucket: DevAnalyticsRollup["translateFailureByBucket"];
  ttsSuccessByBucket: DevAnalyticsRollup["ttsSuccessByBucket"];
  ttsFailureByBucket: DevAnalyticsRollup["ttsFailureByBucket"];
  translateFailureByCategory: DevAnalyticsRollup["translateFailureByCategory"];
  ttsFailureByCategory: DevAnalyticsRollup["ttsFailureByCategory"];
};

export function buildAnalyticsSnapshotExport(): AnalyticsSnapshotExport {
  const r = readDevAnalyticsRollup();
  return {
    schemaVersion: ANALYTICS_SNAPSHOT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    totalEvents: r.totalEvents,
    translateFlowSplit: r.translateFlowSplit,
    appOpenFlowSplit: r.appOpenFlowSplit,
    topTargetDialects: r.topTargetDialects,
    topVibes: r.topVibes,
    topVoices: r.topVoices,
    engineEffectiveCounts: r.engineEffectiveCounts,
    engineRequestedCounts: r.engineRequestedCounts,
    translateSuccessCount: r.translateSuccessCount,
    translateFailureCount: r.translateFailureCount,
    translateFailureRate: r.translateFailureRate,
    ttsSuccessCount: r.ttsSuccessCount,
    ttsFailureCount: r.ttsFailureCount,
    ttsFailureRate: r.ttsFailureRate,
    ttsReplayCount: r.ttsReplayCount,
    ttsReplayRate: r.ttsReplayRate,
    learnsYouToggleOn: r.learnsYouToggleOn,
    learnsYouToggleOff: r.learnsYouToggleOff,
    translateWithLearnsYouOn: r.translateWithLearnsYouOn,
    translateWithLearnsYouOff: r.translateWithLearnsYouOff,
    countsByName: r.countsByName,
    translateSuccessAvgMs: r.translateSuccessAvgMs,
    translateFailureAvgMs: r.translateFailureAvgMs,
    ttsSuccessAvgMs: r.ttsSuccessAvgMs,
    ttsFailureAvgMs: r.ttsFailureAvgMs,
    translateSuccessByBucket: r.translateSuccessByBucket,
    translateFailureByBucket: r.translateFailureByBucket,
    ttsSuccessByBucket: r.ttsSuccessByBucket,
    ttsFailureByBucket: r.ttsFailureByBucket,
    translateFailureByCategory: r.translateFailureByCategory,
    ttsFailureByCategory: r.ttsFailureByCategory,
  };
}

export function trackAnalyticsEvent<P extends AnalyticsEventPayload>(payload: P): void {
  if (!isBrowser()) return;
  try {
    const event: StreetVibeAnalyticsEvent = {
      id: newId(),
      ts: Date.now(),
      ...payload,
    } as StreetVibeAnalyticsEvent;
    const prev = readStoredAnalyticsEvents();
    prev.push(event);
    const trimmed = prev.slice(-MAX_EVENTS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    sendAnalyticsEventToRemote(event);
  } catch {
    /* non-blocking */
  }
}
