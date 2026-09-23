/**
 * Remembers the user's last city and recipient so a returning visit opens
 * ready to type — the next message is the reason to come back, and it
 * shouldn't start with re-picking the same settings.
 *
 * Browser-only and best-effort: every access is guarded because storage can be
 * unavailable (private mode, blocked site data, SSR).
 */

const CITY_KEY = "sv_last_city";
const AUDIENCE_KEY = "sv_last_audience";

function read(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — non-essential */
  }
}

export function loadLastCity(): string | null {
  return read(CITY_KEY);
}

export function saveLastCity(value: string): void {
  write(CITY_KEY, value);
}

export function loadLastAudience(): string | null {
  return read(AUDIENCE_KEY);
}

export function saveLastAudience(value: string): void {
  write(AUDIENCE_KEY, value);
}
