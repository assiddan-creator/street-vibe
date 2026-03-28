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

function dialectFromEvent(e: StreetVibeAnalyticsEvent): string | undefined {
  if ("targetDialect" in e && typeof e.targetDialect === "string") return e.targetDialect;
  if ("dialect" in e && typeof (e as { dialect?: string }).dialect === "string")
    return (e as { dialect: string }).dialect;
  return undefined;
}

export function summarizeStoredAnalyticsEvents(): AnalyticsSummary {
  const events = readStoredAnalyticsEvents();
  const countsByName: Partial<Record<AnalyticsEventName, number>> = {};
  const dialectCounts = new Map<string, number>();

  for (const e of events) {
    countsByName[e.name] = (countsByName[e.name] ?? 0) + 1;
    const d = dialectFromEvent(e);
    if (d) dialectCounts.set(d, (dialectCounts.get(d) ?? 0) + 1);
  }

  const topTargetDialects = [...dialectCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([dialect, count]) => ({ dialect, count }));

  return {
    total: events.length,
    countsByName,
    topTargetDialects,
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
  } catch {
    /* non-blocking */
  }
}
