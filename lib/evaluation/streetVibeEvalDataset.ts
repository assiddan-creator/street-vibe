/**
 * StreetVibe internal quality evaluation — fixed test inputs for manual / dev review.
 *
 * How to run: open `/dev/evaluation` in development only. Adjust global dialect / vibe / slang,
 * then translate rows and optionally probe TTS engines. Not a benchmark; no automated scoring.
 *
 * Keep inputs safe and non-extreme; rotate or extend this list between quality passes as needed.
 */

export type StreetVibeEvalIntent =
  | "casual_slang"
  | "greeting"
  | "hype"
  | "roast_light"
  | "admiration"
  | "everyday_ask"
  | "social_caption"
  | "emotionally_expressive"
  | "question";

export type StreetVibeEvalCase = {
  id: string;
  /** English source line to translate (adjust if you standardize on another input language later). */
  sourceText: string;
  intent: StreetVibeEvalIntent;
  /** Short label for the row. */
  categoryLabel: string;
  /** Soft notes for reviewers — not gold-standard expectations. */
  vibeNotes?: string;
};

/**
 * Compact set (~12): mix of tones. Source lines are plain English; target flavor comes from dialect + vibe + slang level.
 */
export const STREETVIBE_EVAL_CASES: StreetVibeEvalCase[] = [
  {
    id: "ev-01",
    sourceText: "ngl that's kinda fire if we're being honest",
    intent: "casual_slang",
    categoryLabel: "Casual slang",
    vibeNotes: "Natural street filler + mild praise.",
  },
  {
    id: "ev-02",
    sourceText: "yo wassup fam, long time no see",
    intent: "greeting",
    categoryLabel: "Greeting",
    vibeNotes: "Warm opener, informal.",
  },
  {
    id: "ev-03",
    sourceText: "let's gooo we eating good tonight no cap",
    intent: "hype",
    categoryLabel: "Hype",
    vibeNotes: "High energy, celebratory.",
  },
  {
    id: "ev-04",
    sourceText: "you're doing the most rn but it's still funny lowkey",
    intent: "roast_light",
    categoryLabel: "Light roast / attitude",
    vibeNotes: "Tease without cruelty.",
  },
  {
    id: "ev-05",
    sourceText: "she absolutely ate that performance, proud of her",
    intent: "admiration",
    categoryLabel: "Admiration",
    vibeNotes: "Positive, supportive.",
  },
  {
    id: "ev-06",
    sourceText: "can you grab oat milk on the way back? appreciate you",
    intent: "everyday_ask",
    categoryLabel: "Everyday ask",
    vibeNotes: "Practical + polite casual.",
  },
  {
    id: "ev-07",
    sourceText: "main character energy today, we outside ✨",
    intent: "social_caption",
    categoryLabel: "Social caption",
    vibeNotes: "Short punchy caption tone.",
  },
  {
    id: "ev-08",
    sourceText: "been a long week but I'm grateful for my people fr",
    intent: "emotionally_expressive",
    categoryLabel: "Emotionally expressive",
    vibeNotes: "Tired but warm.",
  },
  {
    id: "ev-09",
    sourceText: "bet, see you at eight don't be late",
    intent: "casual_slang",
    categoryLabel: "Casual confirm",
    vibeNotes: "Agreement + light command.",
  },
  {
    id: "ev-10",
    sourceText: "you pulling up tonight or nah?",
    intent: "question",
    categoryLabel: "Slang question",
    vibeNotes: "Yes/no vibe, informal.",
  },
  {
    id: "ev-11",
    sourceText: "nice fit today, who styled you 😂",
    intent: "roast_light",
    categoryLabel: "Friendly jab",
    vibeNotes: "Playful ribbing with emoji.",
  },
  {
    id: "ev-12",
    sourceText: "thanks for holding me down, that meant a lot",
    intent: "admiration",
    categoryLabel: "Gratitude",
    vibeNotes: "Sincere thanks.",
  },
];

/** Priority dialects for quick switching (subset of premium output dialects). */
export const EVAL_PRIORITY_DIALECTS = [
  "Jamaican Patois",
  "London Roadman",
  "New York Brooklyn",
  "Paris Banlieue",
  "Israeli Street",
  "Arabic Egyptian",
] as const;

/** Context keys aligned with `/api/translate` (see CONTEXT_INSTRUCTIONS in translate route). */
export const EVAL_PRIORITY_VIBES = [
  { value: "default", label: "Default" },
  { value: "dm", label: "DM" },
  { value: "hype", label: "Hype" },
  { value: "post", label: "Post" },
  { value: "reply", label: "Reply / sharp" },
  { value: "flirt", label: "Flirt" },
] as const;
