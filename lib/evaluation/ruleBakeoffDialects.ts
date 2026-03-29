/**
 * Dialect list for `/dev/rule-bakeoff` — derived from product output options in `streetVibeTheme`,
 * with eval-priority dialects listed first under their own optgroup.
 */

import { EVAL_PRIORITY_DIALECTS } from "@/lib/evaluation/streetVibeEvalDataset";
import { OUTPUT_PREMIUM_OPTIONS, OUTPUT_STANDARD_OPTIONS } from "@/lib/streetVibeTheme";

export type RuleBakeoffDialectOption = {
  value: string;
  label: string;
  group: string;
};

const labelByValue = (): Map<string, string> => {
  const m = new Map<string, string>();
  for (const o of [...OUTPUT_PREMIUM_OPTIONS, ...OUTPUT_STANDARD_OPTIONS]) {
    m.set(o.value, o.label);
  }
  return m;
};

/**
 * All translate targets from the main app (`OUTPUT_PREMIUM_OPTIONS` + `OUTPUT_STANDARD_OPTIONS`),
 * ordered: priority dialects first (subset of eval list that exists in product), then remaining premium, then remaining standard.
 */
export function getRuleBakeoffDialectSelectOptions(): RuleBakeoffDialectOption[] {
  const labels = labelByValue();
  const premiumValues = new Set(OUTPUT_PREMIUM_OPTIONS.map((o) => o.value));
  const priorityInProduct = EVAL_PRIORITY_DIALECTS.filter((d) => labels.has(d));
  const prioritySet = new Set<string>(priorityInProduct);

  const out: RuleBakeoffDialectOption[] = [];

  for (const value of priorityInProduct) {
    out.push({
      value,
      label: labels.get(value) ?? value,
      group: "Priority (eval / routing)",
    });
  }

  for (const o of OUTPUT_PREMIUM_OPTIONS) {
    if (!prioritySet.has(o.value)) {
      out.push({
        value: o.value,
        label: o.label,
        group: "Street slang — premium",
      });
    }
  }

  for (const o of OUTPUT_STANDARD_OPTIONS) {
    if (!prioritySet.has(o.value)) {
      out.push({
        value: o.value,
        label: o.label,
        group: "All languages — standard",
      });
    }
  }

  return out;
}

/** Stable list for initial state and counts (call once per module load). */
export const RULE_BAKEOFF_DIALECT_OPTIONS = getRuleBakeoffDialectSelectOptions();

export const RULE_BAKEOFF_DIALECT_COUNT = RULE_BAKEOFF_DIALECT_OPTIONS.length;
