/**
 * Prompt rules so the translated line is written the way people actually say
 * it. That reads more natural AND speaks better (ElevenLabs follows the
 * punctuation it is given). Used by app/api/translate/route.ts.
 */

/** Slang / premium path: spoken spelling + speech-friendly punctuation. */
export const SPOKEN_STYLE_RULE = [
  "SPOKEN STYLE (the line is also read aloud by a voice):",
  '- Spell it the way people from here actually say it (e.g. "gonna", "wah gwaan", "cê tá") — no formal expansions of spoken forms.',
  '- Put a comma after a direct address at the start ("Bruv, that\'s mad"); otherwise use normal sentence punctuation.',
  '- At most ONE "!" or "?" at the end of a sentence — never "!!!", "???" or "?!?!".',
  '- Use "..." or "—" only for a real pause or surprise, never as decoration.',
  "- No emoji, no hashtags, no quotation marks for emphasis, no ALL-CAPS sentences.",
  "- Keep the language's own punctuation: ¿ ¡ in Spanish, ، ؟ in Arabic, 、。！？ in Japanese; Hebrew without added niqqud.",
].join("\n");

/** Standard (non-slang) path: the punctuation part only; spelling stays standard. */
export const STANDARD_PUNCTUATION_RULE = [
  "PUNCTUATION (the line may be read aloud by a voice):",
  '- At most ONE "!" or "?" at the end of a sentence; "..." or "—" only for a real pause.',
  "- No emoji, no hashtags, no quotation marks for emphasis, no ALL-CAPS sentences.",
  "- Keep the language's own punctuation (¿ ¡, ، ؟, 、。！？); Hebrew without added niqqud.",
].join("\n");

/**
 * Generic chat authenticity rule (all slang dialects except Russian Street, which
 * has its own). Was "NO commas unless absolutely necessary"; now light, natural
 * punctuation so a direct address gets its comma (SPOKEN STYLE).
 */
export const CHAT_AUTHENTICITY_RULE =
  "AUTHENTICITY RULE: Write exactly like a real person texting a friend. Keep punctuation light and natural: normal sentence punctuation and a comma after a direct address, but no comma chains or bookish punctuation. Use short punchy phrases; line breaks only where a real chat would have them. No full sentences if the original was casual. Raw, fast, human. Think WhatsApp message not a novel.";
