/**
 * Prompt overlays for `/api/translate` slang path — rule tuning, not model changes.
 * Used by dev bakeoffs (explicit profile) and optional intent+dialect routing in production.
 */

export const DEV_RULE_PROFILE_IDS = ["current", "safer", "anti-overcooked", "dialect-tuned"] as const;

export type DevRuleProfileId = (typeof DEV_RULE_PROFILE_IDS)[number];

export function parseDevRuleProfile(v: unknown): DevRuleProfileId | undefined {
  if (typeof v !== "string") return undefined;
  return (DEV_RULE_PROFILE_IDS as readonly string[]).includes(v) ? (v as DevRuleProfileId) : undefined;
}

/**
 * Appended to the slang prompt (before the rewrite instruction).
 */
export function formatDevRuleProfileOverlay(profile: DevRuleProfileId | undefined): string {
  if (!profile || profile === "current") return "";

  switch (profile) {
    case "safer":
      return `

RULE PROFILE — safer:
- Prefer clarity and sendability over slang density. Use fewer slang tokens unless the source clearly needs them.
- Avoid risky or confusing phrasing; keep the line easy to read on a phone screen.`;
    case "anti-overcooked":
      return `

RULE PROFILE — anti-overcooked:
- Do not stack slang, markers, or filler for theatrical effect. One natural beat per clause.
- If the meaning is already clear, stop — no extra "street garnish" or repeated signature words.`;
    case "dialect-tuned":
      return `

RULE PROFILE — dialect-tuned:
- Let dialect pack, script lock, and locale-specific cues drive word choice ahead of generic global internet slang.
- When choosing between a generic filler and a locally authentic phrasing for this dialect, pick the local one — silently; do not explain the choice, list alternatives, or add meta-commentary.
- The visible output must be only the final in-character message (per OUTPUT FORMAT below), not analysis.`;
    default:
      return "";
  }
}
