/**
 * Prompt rules so the translated line is written the way people actually type
 * and say it. That reads more natural AND speaks better (ElevenLabs follows the
 * punctuation it is given). Used by app/api/translate/route.ts.
 *
 * These rules are about punctuation, symbols and casing ONLY — they must never
 * soften the slang (a 2026-10 comparison showed a first version did).
 */

/** Slang / premium path: speech-friendly punctuation, casing and symbols — word choice untouched. */
export const SPOKEN_STYLE_RULE = [
  "SPOKEN STYLE — PUNCTUATION, SYMBOLS AND CASING ONLY (the line is also read aloud by a voice):",
  "These rules change ONLY punctuation, symbols and casing. They never change word choice: keep the slang, the dialect spelling and the street intensity exactly as strong as the rest of this prompt asks. Never replace a slang word with a more standard or neutral one, never tone down or \"clean up\" the dialect to fit these rules.",
  '- Keep spoken dialect spelling as people actually write it ("gonna", "wah gwaan", "cê tá"); never expand it to formal spelling.',
  "- Casing: casual chat — start lowercase like a real text message, but people's and place names always keep their capital letter, written in the target script as usual (SCRIPT LOCK still applies to names). Scripts without capital letters just follow their own rules.",
  '- Put a comma after a direct address at the start ("bruv, that\'s mad"); otherwise normal sentence punctuation.',
  '- At most ONE "!" or "?" at the end of a sentence — never "!!!", "???" or "?!?!".',
  '- Use "..." or "—" only for a real pause or surprise, never as decoration.',
  "- No emoji, no hashtags, no quotation marks for emphasis, no ALL-CAPS sentences.",
  '- Spanish: every sentence that ends with "?" or "!" opens with "¿" or "¡" ("¿vas a caer a la peda o qué?", "¡no mames, güey!").',
  '- French: keep the space before ! ? : ; as French typing does ("t\'es chaud ?").',
  "- Keep each language's own marks: ، ؟ in Arabic, 、。！？ in Japanese; Hebrew without added niqqud.",
].join("\n");

/**
 * Placed right before the rewrite instruction (recency) so the punctuation rules
 * cannot pull word choice toward standard language.
 */
export const SLANG_LOCK_RULE =
  "SLANG LOCK: The punctuation / casing rules only touch punctuation, symbols and capital letters. Choose every word exactly as you would without them: same slang, same openers, exclamations and tags (keep them, don't drop them), same intensifiers, same dialect spelling, same intensity. Never swap a slang word, opener or local spelling for a more standard one. Don't copy the source's words literally to make punctuation easier: the source's address word, opener and closing tag still become the local equivalent you would normally use, and a local exclamation at the start stays (punctuate it, don't drop it).";

/** Standard (non-slang) path: the punctuation part only; spelling and casing stay standard. */
export const STANDARD_PUNCTUATION_RULE = [
  "PUNCTUATION (the line may be read aloud by a voice; word choice is unaffected):",
  '- At most ONE "!" or "?" at the end of a sentence; "..." or "—" only for a real pause.',
  "- No emoji, no hashtags, no quotation marks for emphasis, no ALL-CAPS sentences.",
  "- Keep the language's own punctuation (¿ ¡, ، ؟, 、。！？, the French space before ! ? : ;); Hebrew without added niqqud.",
].join("\n");

/**
 * Generic chat authenticity rule (all slang dialects except Russian Street, which
 * has its own). Was "NO commas unless absolutely necessary"; now light, natural
 * punctuation so a direct address gets its comma (SPOKEN STYLE).
 */
export const CHAT_AUTHENTICITY_RULE =
  "AUTHENTICITY RULE: Write exactly like a real person texting a friend. Keep punctuation light and natural: normal sentence punctuation and a comma after a direct address, but no comma chains or bookish punctuation. Use short punchy phrases; line breaks only where a real chat would have them. No full sentences if the original was casual. Raw, fast, human. Think WhatsApp message not a novel.";
