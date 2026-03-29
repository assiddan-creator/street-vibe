/**
 * Rule profile routing: (dialect + intent category) → profile overlay for slang translate.
 * Edit RULE_PROFILE_ROUTING_MATRIX. Intents not listed for a dialect resolve to "current".
 */

import type { DevRuleProfileId } from "@/lib/evaluation/devRuleProfile";

/** Aligned with rule-bakeoff / product intent buckets. */
export const ROUTING_INTENT_CATEGORIES = [
  "greeting",
  "flirt",
  "tease",
  "attitude",
  "practical_ask",
  "admiration",
  "emotionally_warm",
  "ambiguity",
] as const;

export type RoutingIntentCategory = (typeof ROUTING_INTENT_CATEGORIES)[number];

export type RuleRoutingEntry = {
  /** Partial: only listed intents get a profile; any other valid intent → "current". */
  byIntent: Partial<Record<RoutingIntentCategory, DevRuleProfileId>>;
};

/**
 * Dialect keys must match `currentLang` values from the app (e.g. "New York Brooklyn").
 */
export const RULE_PROFILE_ROUTING_MATRIX: Record<string, RuleRoutingEntry> = {
  "New York Brooklyn": {
    byIntent: {
      greeting: "anti-overcooked",
      flirt: "safer",
      tease: "anti-overcooked",
      attitude: "anti-overcooked",
      practical_ask: "dialect-tuned",
      admiration: "anti-overcooked",
      emotionally_warm: "current",
      ambiguity: "anti-overcooked",
    },
  },
  "London Roadman": {
    byIntent: {
      greeting: "dialect-tuned",
      flirt: "anti-overcooked",
      tease: "dialect-tuned",
      attitude: "anti-overcooked",
      practical_ask: "safer",
      admiration: "anti-overcooked",
    },
  },
  "Paris Banlieue": {
    byIntent: {
      greeting: "anti-overcooked",
      flirt: "safer",
      tease: "dialect-tuned",
      attitude: "safer",
      practical_ask: "anti-overcooked",
      admiration: "dialect-tuned",
      emotionally_warm: "anti-overcooked",
    },
  },
  "Jamaican Patois": {
    byIntent: {
      greeting: "anti-overcooked",
      flirt: "dialect-tuned",
      tease: "current",
      attitude: "dialect-tuned",
      practical_ask: "anti-overcooked",
    },
  },
  "Russian Street": {
    byIntent: {
      greeting: "current",
      flirt: "safer",
      tease: "dialect-tuned",
      attitude: "dialect-tuned",
      practical_ask: "current",
      admiration: "current",
      emotionally_warm: "dialect-tuned",
      ambiguity: "current",
    },
  },
  "Rio Favela": {
    byIntent: {
      greeting: "current",
      flirt: "current",
      tease: "current",
      attitude: "dialect-tuned",
      practical_ask: "current",
      admiration: "anti-overcooked",
      emotionally_warm: "current",
      ambiguity: "current",
    },
  },
  "Mexico City Barrio": {
    byIntent: {
      greeting: "current",
      flirt: "current",
      tease: "current",
      attitude: "anti-overcooked",
      practical_ask: "current",
      admiration: "current",
      emotionally_warm: "current",
      ambiguity: "current",
    },
  },
  "Tokyo Gyaru": {
    byIntent: {
      greeting: "current",
      flirt: "dialect-tuned",
      tease: "current",
      attitude: "current",
      practical_ask: "safer",
      admiration: "dialect-tuned",
      emotionally_warm: "current",
      ambiguity: "current",
    },
  },
  "Israeli Street": {
    byIntent: {
      greeting: "current",
      flirt: "current",
      tease: "current",
      attitude: "dialect-tuned",
      practical_ask: "anti-overcooked",
      admiration: "anti-overcooked",
      emotionally_warm: "anti-overcooked",
    },
  },
};

export function parseIntentCategory(v: unknown): RoutingIntentCategory | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return (ROUTING_INTENT_CATEGORIES as readonly string[]).includes(t) ? (t as RoutingIntentCategory) : undefined;
}

/**
 * - Missing `intentCategory` → "current"
 * - Unknown dialect → "current"
 * - Valid intent not listed for that dialect → "current"
 * - Invalid intent string (not in ROUTING_INTENT_CATEGORIES) → "current" (caller passes undefined from parseIntentCategory)
 */
export function resolveRuleProfile(
  dialectId: string,
  intentCategory: RoutingIntentCategory | undefined
): DevRuleProfileId {
  if (!intentCategory) return "current";
  const entry = RULE_PROFILE_ROUTING_MATRIX[dialectId.trim()];
  if (!entry) return "current";
  const resolved = entry.byIntent[intentCategory];
  return resolved !== undefined ? resolved : "current";
}
