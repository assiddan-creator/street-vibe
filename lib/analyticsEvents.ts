/**
 * Local-only analytics (client storage). No API changes; no PII / message bodies by default.
 */

export type StreetVibeMode = "text" | "speak";

export type AnalyticsEventName =
  | "app_opened"
  | "mode_switched"
  | "source_language_selected"
  | "target_dialect_selected"
  | "voice_gender_selected"
  | "slang_level_selected"
  | "vibe_selected"
  | "translate_requested"
  | "translate_succeeded"
  | "translate_failed"
  | "tts_requested"
  | "tts_succeeded"
  | "tts_failed"
  | "tts_replayed"
  | "learns_you_toggled"
  | "learned_preferences_reset";

/** Per-event payloads — no raw user message / translation text. */
export type AnalyticsEventPayload =
  | { name: "app_opened"; mode: StreetVibeMode }
  | { name: "mode_switched"; from: StreetVibeMode; to: StreetVibeMode }
  | { name: "source_language_selected"; sourceLanguage: string; mode: StreetVibeMode }
  | { name: "target_dialect_selected"; targetDialect: string; mode: StreetVibeMode }
  | { name: "voice_gender_selected"; ttsGender: "male" | "female"; mode: StreetVibeMode }
  | { name: "slang_level_selected"; slangLevel: 1 | 2 | 3; mode: StreetVibeMode }
  | { name: "vibe_selected"; vibe: string; mode: StreetVibeMode }
  | {
      name: "translate_requested";
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
      name: "translate_succeeded";
      mode: StreetVibeMode;
      targetDialect: string;
      learnsYouEnabled: boolean;
      implicitGuidancePresent: boolean;
    }
  | {
      name: "translate_failed";
      mode: StreetVibeMode;
      targetDialect: string;
      errorCode: string;
      learnsYouEnabled: boolean;
    }
  | {
      name: "tts_requested";
      mode: "speak";
      requestedEngine: "minimax" | "google" | "native";
      effectiveEngine: "minimax" | "google" | "native";
      dialect: string;
      ttsGender: "male" | "female";
      vibe: string;
      textLengthChars: number;
      learnsYouEnabled: boolean;
      implicitGuidancePresent: boolean;
    }
  | {
      name: "tts_succeeded";
      mode: "speak";
      effectiveEngine: "minimax" | "google" | "native";
      dialect: string;
      usedFallbackNative: boolean;
    }
  | {
      name: "tts_failed";
      mode: "speak";
      effectiveEngine: "minimax" | "google" | "native";
      dialect: string;
      errorCode: string;
    }
  | {
      name: "tts_replayed";
      mode: "speak";
      dialect: string;
      requestedEngine: "minimax" | "google" | "native";
    }
  | { name: "learns_you_toggled"; enabled: boolean }
  | { name: "learned_preferences_reset" };

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

/** Build a consistent context object for logging (no content). */
export function buildAnalyticsContext(input: {
  mode: StreetVibeMode;
  sourceLanguage: string;
  targetDialect: string;
  vibe: string;
  slangLevel: 1 | 2 | 3;
  ttsGender: "male" | "female";
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
  engineEffectiveCounts: Partial<Record<"minimax" | "google" | "native", number>>;
  /** requestedEngine from tts_requested */
  engineRequestedCounts: Partial<Record<"minimax" | "google" | "native", number>>;
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

/**
 * Single-pass aggregation from stored-shaped events (no network).
 * Call with `readStoredAnalyticsEvents()` on the client.
 */
export function computeDevAnalyticsRollup(events: StreetVibeAnalyticsEvent[]): DevAnalyticsRollup {
  const countsByName: Partial<Record<AnalyticsEventName, number>> = {};
  const dialectCounts = new Map<string, number>();
  const vibeCounts = new Map<string, number>();
  const voiceCounts = new Map<string, number>();
  const engineEff: Partial<Record<"minimax" | "google" | "native", number>> = {};
  const engineReq: Partial<Record<"minimax" | "google" | "native", number>> = {};

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

    if (e.name === "vibe_selected" && "vibe" in e && typeof e.vibe === "string") {
      bumpMap(vibeCounts, e.vibe);
    }
    if (e.name === "translate_requested" && "vibe" in e && typeof e.vibe === "string") {
      bumpMap(vibeCounts, e.vibe);
    }
    if (e.name === "tts_requested" && "vibe" in e && typeof e.vibe === "string") {
      bumpMap(vibeCounts, e.vibe);
    }

    if (e.name === "voice_gender_selected" && "ttsGender" in e) {
      bumpMap(voiceCounts, String(e.ttsGender));
    }
    if (e.name === "tts_requested" && "ttsGender" in e) {
      bumpMap(voiceCounts, String(e.ttsGender));
    }

    if (e.name === "tts_requested") {
      const tr = e as StreetVibeAnalyticsEvent & { requestedEngine?: string; effectiveEngine?: string };
      if (tr.requestedEngine === "minimax" || tr.requestedEngine === "google" || tr.requestedEngine === "native") {
        engineReq[tr.requestedEngine] = (engineReq[tr.requestedEngine] ?? 0) + 1;
      }
      if (tr.effectiveEngine === "minimax" || tr.effectiveEngine === "google" || tr.effectiveEngine === "native") {
        engineEff[tr.effectiveEngine] = (engineEff[tr.effectiveEngine] ?? 0) + 1;
      }
    }

    if (e.name === "translate_requested" && "mode" in e) {
      if (e.mode === "text") translateText += 1;
      if (e.mode === "speak") translateSpeak += 1;
      if ("learnsYouEnabled" in e && typeof e.learnsYouEnabled === "boolean") {
        if (e.learnsYouEnabled) translateWithLearnsYouOn += 1;
        else translateWithLearnsYouOff += 1;
      }
    }

    if (e.name === "app_opened" && "mode" in e) {
      if (e.mode === "text") appText += 1;
      if (e.mode === "speak") appSpeak += 1;
    }

    if (e.name === "learns_you_toggled" && "enabled" in e && typeof e.enabled === "boolean") {
      if (e.enabled) learnsYouToggleOn += 1;
      else learnsYouToggleOff += 1;
    }
  }

  const tr = countsByName.translate_requested ?? 0;
  const replay = countsByName.tts_replayed ?? 0;
  const ttsOk = countsByName.tts_succeeded ?? 0;
  const ttsBad = countsByName.tts_failed ?? 0;
  const txOk = countsByName.translate_succeeded ?? 0;
  const txBad = countsByName.translate_failed ?? 0;

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
  } catch {
    /* non-blocking */
  }
}
