/**
 * Dev rule-bakeoff rows — chat-realism intents for comparing prompt profiles.
 * Used by `/dev/rule-bakeoff` only.
 */

import { STREETVIBE_EVAL_CASES, type StreetVibeEvalIntent } from "@/lib/evaluation/streetVibeEvalDataset";

export type RuleBakeoffCategory =
  | "greeting"
  | "flirt"
  | "tease"
  | "attitude"
  | "practical_ask"
  | "admiration"
  | "emotionally_warm"
  | "ambiguity";

export type RuleBakeoffCase = {
  id: string;
  category: RuleBakeoffCategory;
  sourceText: string;
  label: string;
};

/** Eight intent rows tuned for chat realism bakeoffs. */
export const RULE_BAKEOFF_CHAT_REALISM: RuleBakeoffCase[] = [
  {
    id: "rb-greeting",
    category: "greeting",
    label: "Greeting",
    sourceText: "hey — been forever, you good?",
  },
  {
    id: "rb-flirt",
    category: "flirt",
    label: "Flirt",
    sourceText: "you're kinda impossible to ignore today ngl",
  },
  {
    id: "rb-tease",
    category: "tease",
    label: "Tease",
    sourceText: "okay show-off, who let you look that good",
  },
  {
    id: "rb-attitude",
    category: "attitude",
    label: "Attitude",
    sourceText: "I'm not arguing with you tonight, I don't have the bandwidth",
  },
  {
    id: "rb-practical",
    category: "practical_ask",
    label: "Practical ask",
    sourceText: "can you send the link when you get a sec",
  },
  {
    id: "rb-admiration",
    category: "admiration",
    label: "Admiration",
    sourceText: "you handled that so cleanly, seriously impressed",
  },
  {
    id: "rb-warm",
    category: "emotionally_warm",
    label: "Emotionally warm",
    sourceText: "I'm really glad we talked yesterday, it helped",
  },
  {
    id: "rb-ambiguity",
    category: "ambiguity",
    label: "Ambiguity",
    sourceText: "we'll see how it goes I guess",
  },
];

function intentToCategory(intent: StreetVibeEvalIntent): RuleBakeoffCategory {
  switch (intent) {
    case "greeting":
      return "greeting";
    case "hype":
    case "casual_slang":
    case "social_caption":
      return "attitude";
    case "roast_light":
      return "tease";
    case "admiration":
      return "admiration";
    case "everyday_ask":
      return "practical_ask";
    case "emotionally_expressive":
      return "emotionally_warm";
    case "question":
      return "ambiguity";
    default:
      return "ambiguity";
  }
}

/** Same lines as `/dev/evaluation` dataset, mapped for bakeoff UI. */
export const RULE_BAKEOFF_EVAL_MIRROR: RuleBakeoffCase[] = STREETVIBE_EVAL_CASES.map((c) => ({
  id: `mirror-${c.id}`,
  category: intentToCategory(c.intent),
  label: c.categoryLabel,
  sourceText: c.sourceText,
}));

export const RULE_BAKEOFF_SETS: Record<
  string,
  { label: string; description?: string; cases: RuleBakeoffCase[] }
> = {
  chat_realism: {
    label: "Chat realism (8 intents)",
    description: "Greeting → ambiguity mix for rule comparison.",
    cases: RULE_BAKEOFF_CHAT_REALISM,
  },
  eval_mirror: {
    label: "Eval dataset mirror",
    description: "Same rows as /dev/evaluation fixed set.",
    cases: RULE_BAKEOFF_EVAL_MIRROR,
  },
};

