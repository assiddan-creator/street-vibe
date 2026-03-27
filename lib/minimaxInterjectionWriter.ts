/**
 * Conservative MiniMax-only speech tags (e.g. `(laughs)`) for more human TTS delivery.
 * Does not run on Google TTS or affect UI copy — wire from `/api/tts` MiniMax branch only.
 *
 * TODO: Dialect-specific interjection palettes (opt-in per `dialectOverrides.interjectionPolicy`):
 * - London Roadman: sharper pacing / dry asides
 * - Jamaican Patois: looser swing / yard-style fillers (careful with spelling)
 * - New York Brooklyn: compressed aggression, rare stress tags
 * - Israeli Street: Hebrew-adjacent breath markers (v1 excluded — enable when policy allows)
 * - Rio Favela: melodic bounce / softer breaths
 */

import { isKnownPremiumDialect, type StreetVibeDialectId } from "@/lib/dialectRegistry";
import {
  VIBE_SPEECH_CONFIG,
  type InterjectionPolicy,
  type StreetVibeId,
} from "@/lib/vibeSpeechConfig";

const TAG_RE = /\((laughs|breath|sighs)\)/i;

/** v1: long enough to consider an interjection (characters). */
const MIN_CHARS_FOR_INJECTION = 72;
/** v1: need enough words for a safe boundary. */
const MIN_WORDS_FOR_INJECTION = 10;
/** Never inject into very short utterances. */
const MAX_CHARS_SHORT_UTTERANCE = 56;

function toStreetVibeId(vibe: string | undefined): StreetVibeId {
  if (!vibe || typeof vibe !== "string") return "friend";
  const k = vibe.trim().toLowerCase();
  if (k === "dm" || k === "friend" || k === "default") return "friend";
  if (k === "flirt") return "flirty";
  if (k === "angry") return "angry";
  if (k === "stoned") return "stoned";
  return "friend";
}

function getResolvedEntry(vibe: string | undefined, dialectId?: string) {
  const canonical = toStreetVibeId(vibe);
  const base = VIBE_SPEECH_CONFIG[canonical];
  if (!dialectId || !isKnownPremiumDialect(dialectId)) {
    return base;
  }
  const ov = base.dialectOverrides?.[dialectId as StreetVibeDialectId];
  if (!ov) return base;
  return { ...base, ...ov };
}

function normalizeInput(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function wordCount(input: string): number {
  return input.trim() ? input.trim().split(/\s+/).length : 0;
}

function hasInterjectionTag(input: string): boolean {
  return TAG_RE.test(input);
}

/** True if `shaped` gained a v1 tag and `original` did not (for server logs). */
export function minimaxInterjectionWasApplied(original: string, shaped: string): boolean {
  return hasInterjectionTag(shaped) && !hasInterjectionTag(normalizeInput(original));
}

/** Deterministic “occasional” gate — same text + vibe yields stable yes/no. */
function occasionalGate(text: string, vibe: StreetVibeId): boolean {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h + text.charCodeAt(i) * (i + 1) + vibe.length * 17) % 10007;
  }
  const caps: Record<StreetVibeId, number> = {
    friend: 42,
    flirty: 36,
    angry: 14,
    stoned: 40,
  };
  return h % 100 < caps[vibe];
}

function pickTag(preferredTags: string[], text: string, vibe: StreetVibeId): string {
  if (preferredTags.length === 0) return "(breath)";
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h + text.charCodeAt(i)) % 997;
  return preferredTags[h % preferredTags.length];
}

export type InterjectionPolicyResult = {
  allowed: boolean;
  maxPerUtterance: number;
  preferredTags: string[];
  placement: string[];
};

/**
 * Resolves whether interjections may run and which tags/placements are preferred.
 * Israeli Street is disabled in v1 unless later enabled via `dialectOverrides`.
 */
export function getInterjectionPolicy(
  vibe?: string,
  dialectId?: string
): InterjectionPolicyResult {
  if (dialectId === "Israeli Street") {
    return { allowed: false, maxPerUtterance: 0, preferredTags: [], placement: [] };
  }

  const entry = getResolvedEntry(vibe, dialectId);
  void entry.deliveryNotes;
  const canonical = toStreetVibeId(vibe);
  const policy: InterjectionPolicy = entry.interjectionPolicy;

  if (policy === "none") {
    return { allowed: false, maxPerUtterance: 0, preferredTags: [], placement: [] };
  }

  const placement = ["before_last_sentence", "before_last_clause", "mid_utterance"];

  let preferredTags: string[] = [];
  switch (canonical) {
    case "friend":
      preferredTags = ["(laughs)", "(breath)"];
      break;
    case "flirty":
      preferredTags = ["(laughs)", "(breath)"];
      break;
    case "angry":
      preferredTags = ["(sighs)"];
      break;
    case "stoned":
      preferredTags = ["(breath)"];
      break;
    default:
      preferredTags = ["(breath)"];
  }

  const maxPerUtterance = policy === "light" || policy === "minimal" ? 1 : 0;
  const allowed = maxPerUtterance > 0;

  return {
    allowed,
    maxPerUtterance,
    preferredTags,
    placement,
  };
}

export function shouldInjectInterjection(
  input: string,
  options?: { vibe?: string; dialectId?: string }
): boolean {
  const t = normalizeInput(input);
  if (!t) return false;

  const policy = getInterjectionPolicy(options?.vibe, options?.dialectId);
  if (!policy.allowed || policy.maxPerUtterance < 1) return false;

  if (t.length <= MAX_CHARS_SHORT_UTTERANCE) return false;
  if (t.length < MIN_CHARS_FOR_INJECTION) return false;
  if (wordCount(t) < MIN_WORDS_FOR_INJECTION) return false;

  if (hasInterjectionTag(t)) return false;

  const vibe = toStreetVibeId(options?.vibe);
  if (!occasionalGate(t, vibe)) return false;

  return true;
}

/**
 * Inserts at most one tag at a sentence/clause boundary when possible; otherwise mid-utterance.
 * Caller should only invoke when {@link shouldInjectInterjection} is true.
 */
export function injectMinimaxInterjection(
  input: string,
  options?: { vibe?: string; dialectId?: string }
): string {
  const t = normalizeInput(input);
  const policy = getInterjectionPolicy(options?.vibe, options?.dialectId);
  if (!policy.allowed || policy.preferredTags.length === 0) return t;

  const vibe = toStreetVibeId(options?.vibe);
  const tag = pickTag(policy.preferredTags, t, vibe);

  const sentences = t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length >= 2) {
    const last = sentences[sentences.length - 1];
    const head = sentences.slice(0, -1).join(" ");
    return `${head} ${tag} ${last}`.replace(/\s+/g, " ").trim();
  }

  const clauses = t.split(/,\s+/);
  if (clauses.length >= 2) {
    const last = clauses[clauses.length - 1];
    const head = clauses.slice(0, -1).join(", ");
    return `${head}, ${tag} ${last}`.replace(/\s+/g, " ").trim();
  }

  const words = t.split(/\s+/);
  if (words.length >= MIN_WORDS_FOR_INJECTION) {
    const mid = Math.max(1, Math.floor(words.length * 0.55));
    return [...words.slice(0, mid), tag, ...words.slice(mid)].join(" ");
  }

  return t;
}

/**
 * Normalizes whitespace, then optionally injects at most one MiniMax-style tag.
 */
export function shapeTextForMinimaxTts(
  input: string,
  options?: { vibe?: string; dialectId?: string }
): string {
  const n = normalizeInput(input);
  if (!shouldInjectInterjection(n, options)) {
    return n;
  }
  return injectMinimaxInterjection(n, options);
}
