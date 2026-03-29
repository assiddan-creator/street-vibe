/**
 * Conservative text shaping for Google Cloud TTS (Chirp 3 HD) only.
 * Does not alter UI copy or translation output — apply only on the server TTS path.
 *
 * TODO (dialect-specific shaping — future):
 * - Jamaican Patois: rhythm / phrase pacing tuned for patois cadence
 * - New York Brooklyn: compression / faster clause boundaries
 * - Israeli Street: Hebrew street punchiness (breath breaks without mangling slang)
 * - Tokyo Gyaru: clipped cadence, shorter breath groups
 * - Rio Favela: melodic flow / softer phrase boundaries
 * - Arabic Egyptian: relaxed pauses + Cairo conversational shaping (see `vibeSpeechConfig` overrides); final Arabic cleanup runs in `/api/tts` via `normalizeArabicPremiumForSpeech`.
 * - Spanish Madrid: Madrid conversational shaping via `vibeSpeechConfig`; final strip/abbrev pass in `/api/tts` via `normalizeSpanishMadridForSpeech`.
 */

import { isKnownPremiumDialect, type StreetVibeDialectId } from "@/lib/dialectRegistry";
import {
  VIBE_SPEECH_CONFIG,
  getGoogleTextStyleNotesForVibe,
  type PauseProfile,
  type StreetVibeId,
} from "@/lib/vibeSpeechConfig";

const MAX_PHRASE_CHARS = 110;

function toStreetVibeId(vibe: string | undefined): StreetVibeId {
  if (!vibe || typeof vibe !== "string") return "friend";
  const k = vibe.trim().toLowerCase();
  if (k === "dm" || k === "friend" || k === "default") return "friend";
  if (k === "flirt") return "flirty";
  if (k === "angry") return "angry";
  if (k === "stoned") return "stoned";
  return "friend";
}

function getResolvedSpeechEntry(vibe: string | undefined, dialectId?: string) {
  const canonical = toStreetVibeId(vibe);
  const base = VIBE_SPEECH_CONFIG[canonical];
  if (!dialectId || !isKnownPremiumDialect(dialectId)) {
    return base;
  }
  const ov = base.dialectOverrides?.[dialectId as StreetVibeDialectId];
  if (!ov) return base;
  return { ...base, ...ov };
}

/**
 * Legacy / UI vibe keys → canonical profile (matches `vibeSpeechConfig` normalization).
 */
export function applyVibeAwareStyling(input: string, vibe?: string): string {
  let s = input.replace(/\r\n/g, "\n").trim();
  if (!s) return s;

  const profile = VIBE_SPEECH_CONFIG[toStreetVibeId(vibe)].pauseProfile;

  if (profile === "minimal") {
    s = s.replace(/[ \t]+/g, " ");
    return s;
  }
  if (profile === "relaxed") {
    s = s.replace(/[ \t]+/g, " ");
    s = s.replace(/\n{2,}/g, "\n");
    return s;
  }
  if (profile === "punctuated") {
    s = s.replace(/[ \t]+/g, " ");
    return s;
  }
  // natural
  s = s.replace(/[ \t]+/g, " ");
  return s;
}

/**
 * Splits text into speakable chunks at sentence boundaries; breaks very long segments at commas.
 * Preserves wording — no inserted slang or paraphrase.
 */
export function splitIntoSpeechPhrases(input: string): string[] {
  const t = input.trim();
  if (!t) return [];

  const rough = t.split(/(?<=[.!?])\s+/).map((p) => p.trim()).filter(Boolean);
  const segments = rough.length ? rough : [t];
  const out: string[] = [];

  for (const segment of segments) {
    if (segment.length <= MAX_PHRASE_CHARS) {
      out.push(segment);
      continue;
    }
    const byComma = segment.split(/,\s+/);
    if (byComma.length > 1) {
      for (const c of byComma) {
        const x = c.trim();
        if (x) out.push(x);
      }
    } else {
      out.push(segment);
    }
  }

  return out.length ? out : [t];
}

function joinPhrasesForPauseProfile(phrases: string[], profile: PauseProfile): string {
  if (phrases.length === 0) return "";
  if (phrases.length === 1) return phrases[0];

  if (profile === "minimal") {
    return phrases.join(" ");
  }
  if (profile === "relaxed") {
    return phrases.join("\n\n");
  }
  if (profile === "punctuated") {
    return phrases.join("\n\n");
  }
  // natural
  return phrases.join("\n");
}

/**
 * Light punctuation / spacing fixes so TTS does not glue sentences (no new words).
 */
export function applyConversationalPacing(input: string): string {
  let s = input.replace(/\r\n/g, "\n");
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/([.!?])([^\s\n.!?])/g, "$1 $2");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

/**
 * Full pipeline for Google TTS input. Uses vibe + dialect (when premium) for pause profile;
 * `getGoogleTextStyleNotesForVibe` supplies internal guidance for future enrichment.
 */
export function shapeTextForGoogleTts(
  input: string,
  options?: { vibe?: string; dialectId?: string }
): string {
  // Reserved for future SSML / per-dialect hints (currently empty arrays).
  getGoogleTextStyleNotesForVibe(options?.vibe, options?.dialectId);

  const entry = getResolvedSpeechEntry(options?.vibe, options?.dialectId);
  const profile = entry.pauseProfile;

  let s = input.replace(/\r\n/g, "\n");
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n[ \t]+/g, "\n");
  s = s.trim();

  s = applyVibeAwareStyling(s, options?.vibe);

  const phrases = splitIntoSpeechPhrases(s);
  let joined = joinPhrasesForPauseProfile(phrases, profile);
  joined = applyConversationalPacing(joined);

  return joined.trim();
}
