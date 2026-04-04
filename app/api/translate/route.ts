import { NextRequest, NextResponse } from "next/server";
import {
  DICT_SEPARATOR,
  getDialectPrimaryLanguage,
  getDialectScriptLock,
  SCRIPT_OUTPUT_UNIVERSAL_RULE,
  splitTranslationAndDictionary,
} from "@/lib/streetVibeTheme";
import { isKnownPremiumDialect, usesPremiumStreetIntensityControls } from "@/lib/dialectRegistry";
import {
  containsLatinLeak,
  countLatinTokens,
  ISRAELI_STREET_RETRY_REINFORCEMENT,
  sanitizeIsraeliStreetOutput,
  shouldRetryIsraeliStreetOutput,
} from "@/lib/hebrewOutputGuard";
import { sanitizeRussianStreetDictionary } from "@/lib/russianOutputGuard";
import {
  isPrimarilyHebrewScript,
  looksLikeHebrewLetterTransliteration,
  shouldOfferHebrewTransliteration,
} from "@/lib/transliterationPolicy";
import { cleanMainTranslationLine } from "@/lib/translationOutputClean";
import {
  applyPersonaPresetToProfile,
  buildPersonaPresetPromptHints,
  parseOptionalPersonaPresetId,
} from "@/lib/personaPresets";
import {
  buildPersonalizationPromptHints,
  formatPersonalizationBlockForTranslate,
  parseOptionalPersonalProfileFromBody,
} from "@/lib/personalSlangProfile";
import { buildDialectPackPromptHints, formatDialectPackPromptAppendix } from "@/lib/dialectPacks";
import {
  formatIsraeliStreetRetryFromConfig,
  formatSlangControlPromptGuidance,
} from "@/lib/slangControlConfig";
import {
  formatDevRuleProfileOverlay,
  parseDevRuleProfile,
  type DevRuleProfileId,
} from "@/lib/evaluation/devRuleProfile";
import {
  parseIntentCategory,
  resolveRuleProfile,
  type RoutingIntentCategory,
} from "@/lib/evaluation/ruleProfileRouting";

const GEMINI_MODEL = "gemini-2.5-flash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** Shared anti-overcook layer for all premium dialects — complements dialect packs, does not replace them. */
function formatPremiumAntiOvercookGuard(opts: {
  sourceText: string;
  slangLevel: number;
  intentCategory?: RoutingIntentCategory;
  context: string;
  /** When set, suppress generic flirt “interpersonal” overlay (Russian Street uses its own block). */
  dialectId?: string;
}): string {
  const trimmed = opts.sourceText.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const isShortSource = wordCount <= 14 || trimmed.length < 100;
  const inputFeelsSlangHeavy = opts.slangLevel >= 3;

  const interpersonalIntent =
    opts.intentCategory === "flirt" ||
    opts.intentCategory === "tease" ||
    opts.intentCategory === "admiration" ||
    opts.intentCategory === "emotionally_warm" ||
    (opts.intentCategory === undefined && opts.context === "flirt");

  let lines = `

PREMIUM GLOBAL — anti-overcooking (all premium dialects):
- Sound like a real person texting — not a dialect demo, not AI performing "street." Preserve intent first; local flavor second (keep identity — do not flatten to generic English).
- Prefer natural sentence shape over slang injection. Do not stack slang markers or discourse markers; do not overuse vocatives unless the source does.
- Avoid meme / viral-internet slang by default; avoid obvious calques from English. No theatrical admiration or flirt; no "street performance" voice.
- Short input → short output. One sendable chat message before |||. If unsure, underdo rather than overdo.`;

  if (isShortSource && !inputFeelsSlangHeavy) {
    lines += `
- SHORT SOURCE: default to at most one strong dialect marker or signature local touch unless the line clearly needs more.`;
  } else if (inputFeelsSlangHeavy) {
    lines += `
- HEAVY intensity: more local color is allowed — still avoid marker soup and unreadable density.`;
  }

  if (interpersonalIntent) {
    if (opts.dialectId === "Russian Street") {
      lines += `
- RUSSIAN STREET / FLIRT UI: Do not let the “flirt” context inflate neutral sources. If the source is factual, logistical, news, TV, or a plain request (not romantic), keep the same matter-of-fact energy as DM — no extra warmth, no hook questions, no “favorite” prompts, no “tell me yours” engagement.`;
    } else {
      lines += `
- INTERPERSONAL (flirt / tease / admiration / emotionally warm — or flirt context when intent omitted): prioritize naturalness and believable warmth or edge over stylization; chemistry beats persona.`;
    }
  }

  return lines;
}

function buildPrompt({
  text,
  currentLang,
  translationMode,
  slangLocation,
  slangLevel,
  isPremiumSelected,
  context,
  previousMessage,
  personalizationHints,
  devRuleProfile,
  intentCategory,
}: {
  text: string;
  currentLang: string;
  translationMode: string;
  slangLocation?: string;
  slangLevel: number;
  isPremiumSelected: boolean;
  context: string;
  previousMessage: string | null;
  personalizationHints?: string[];
  /** Rule profile overlay on slang path; explicit dev override or intent+dialect routing. */
  devRuleProfile?: DevRuleProfileId;
  /** Optional — when set, tunes interpersonal naturalness hints. */
  intentCategory?: RoutingIntentCategory;
}) {
  const INTENSITY_INSTRUCTIONS: Record<number, string> = {
    1: "Use mostly standard language with just a tiny hint of local flavor. Max 1-2 very mild slang words. Keep it readable.",
    2: "Authentic casual street talk. Natural mix of standard language and popular local slang.",
    3: "Heavy thick street slang. Deep local terminology, authentic street grammar, full immersion.",
  };

  const CONTEXT_INSTRUCTIONS: Record<string, string> = {
    dm: "This is a private DM between close friends — blunt, casual, low polish. Shortest honest way to say it; skip softening you'd use in flirt. Friend energy: real and direct, not smooth and not a caption.",
    post: "This is a social media post meant to be public and punchy.",
    reply: "This is a reply in an argument or comeback situation — keep it sharp.",
    hype: "This is a hype message — energetic, loud, encouraging.",
    flirt:
      "This is a one-on-one flirty message — warmer, a bit softer, genuinely interested (curiosity, a real compliment). When it fits the input, one specific detail beats a generic opener. Charming and human, not aggressive, not a pickup-line slogan.",
    angry: "This is an angry message — direct, aggressive, no filter, street attitude.",
    stoned: "This is a relaxed chill message — slow energy, hazy, mellow, like texting after smoking.",
    default: "This is a casual message between friends.",
  };

  const dialectId = String(currentLang);
  const primaryLanguage = getDialectPrimaryLanguage(dialectId);

  const intensityPrompt = usesPremiumStreetIntensityControls(dialectId)
    ? INTENSITY_INSTRUCTIONS[slangLevel] || INTENSITY_INSTRUCTIONS[2]
    : `STANDARD TARGET (non-premium): Natural idiomatic casual ${primaryLanguage} aligned with CONTEXT above. Ignore any raw/mild/street tier from the request; do not layer premium street-dialect thickness. Match the source register — readable, human, sendable chat — not performance slang or dialect showcase.`;

  const contextPrompt = CONTEXT_INSTRUCTIONS[context] || CONTEXT_INSTRUCTIONS.default;
  const customLocation = slangLocation ? String(slangLocation).trim() : "";
  const scriptLockBlock = [
    "SCRIPT LOCK (MANDATORY — highest priority):",
    SCRIPT_OUTPUT_UNIVERSAL_RULE,
    getDialectScriptLock(dialectId),
    dialectId === "Israeli Street" || dialectId === "Hebrew (Standard)"
      ? "ISRAEL / HEBREW: Output ONLY in Hebrew script (א–ת). Do not write the main translation in English or Latin letters. Hebrew characters only."
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const slangRequested =
    translationMode === "slang" || !!isPremiumSelected || customLocation !== "";

  const antiLeakageRule =
    "ANTI-LEAKAGE: Never use Hebrew or Israeli slang transliterated into Latin characters (sababa, yalla, achi, magniv, etc.) unless the target dialect is Israeli Street or Hebrew (Standard). For Israeli/Hebrew targets, express those ideas in Hebrew script instead of Latin transliteration. All slang must belong exclusively to the target language and location.";

  const lengthRule =
    "LENGTH RULE: Keep the output roughly the same length as the input. Do not expand, explain, or add information that was not in the original text.";

  /** Standard path only: idiomatic register-matched translation without translationese. */
  const standardNaturalnessRule =
    "NATURAL STANDARD: Match the source register — casual chat → natural idiomatic standard " +
    primaryLanguage +
    "; formal or careful writing → formal standard. Prefer idiomatic phrasing over literal word order and calques. " +
    "Do not add greetings, apologies, hedging, or explanations absent from the source. " +
    "Keep length and directness comparable to the input.";

  /** Slang/Premium path: tighter chat realism without touching dialect packs or ||| format. */
  const conversationalCompressionRule =
    "CONVERSATIONAL REALISM: Sound like a real chat reply, not a translation or assistant. " +
    "Short inputs → proportionally short replies; no padding, lead-ins, or extra clauses. " +
    "Drop words a native would drop in a quick message when meaning stays clear. " +
    "Avoid stiff complete-sentence polish, rhetorical filler, or assistant-style hedging unless the source does. " +
    (isKnownPremiumDialect(dialectId)
      ? "Dialect-specific voice, SCRIPT LOCK, and research cues above take priority — compress within that voice; never flatten to generic English."
      : "");

  const noAIRule =
    "AUTHENTICITY RULE: Write exactly like a real person texting a friend. NO commas unless absolutely necessary. Use short punchy phrases separated by spaces or line breaks — not commas. No full sentences if the original was casual. Raw, fast, human. Think WhatsApp message not a novel.";

  /** Russian Street: do not apply English-style anti-comma / line-break pressure to Russian (see CRITICAL RULES FOR RUSSIAN). */
  const slangAuthenticityRule =
    dialectId === "Russian Street"
      ? `AUTHENTICITY (RUSSIAN STREET — Telegram/VK; replaces the generic English-centric authenticity rule for this dialect):
- Write like a real Telegram or VK DM — casual young Russian, not literary prose or edited-article polish.
- Natural Russian punctuation: use commas, periods, dashes where grammar and readability need them — do not strip commas to imitate English \"no comma\" chat; follow normal Russian norms.
- Casual feel: a lowercase first letter is fine when it fits a quick message; sentence case is fine too. Avoid stiff, full-stop-heavy bookish rhythm unless the source matches it.
- Do not insert artificial line breaks that split one thought or break grammar; breaks only where they feel natural in chat.
- FLIRT context: warmth only when the source is actually flirty or romantic — if the source is neutral, keep the same matter-of-fact tone as DM (street voice, not fake flirt).`
      : noAIRule;

  /** Default slang path; Spanish Madrid uses a stricter shape below to cut glossary bloat and emoji slips. */
  const formattingRuleBase =
    "\n\nOUTPUT FORMAT — follow this exactly and nothing else:\n" +
    "<rewritten text>\n" +
    "|||\n" +
    "<dictionary: 1-3 key slang words used, format: Word - Meaning>\n" +
    "Before |||: ONLY the sendable line(s) in the target language/script — no English commentary, no gloss-as-message, no \"very direct\" / \"this implies\" notes, no labels, no preamble.\n" +
    "Do not add any other text, explanation, or preamble outside the dictionary block after |||.";

  const formattingRule =
    slangRequested && dialectId === "Spanish Madrid"
      ? `

OUTPUT FORMAT — Spanish Madrid (strict):
- Before |||: one sendable WhatsApp-style block only — Spanish, the line(s) you would actually send. No labels, no meta, no tutorial tone, no English in this block. No emoji unless the source already contains emoji.
- After |||: at most 2 lines. Each line: "término — aclaración breve en español" (short gloss only, ≤8 words after the dash). Spanish only — no English at all in gloss lines (not even one word). No heading word "dictionary", no etymology, no example sentences, no "Option A/B", no bullets of alternatives. If nothing needs glossing, output exactly one line: —
- Do not prepend or append any other commentary.`
      : formattingRuleBase;

  const personalizationBlock = formatPersonalizationBlockForTranslate(personalizationHints ?? []);

  if (!slangRequested) {
    return {
      prompt:
        `You are a professional translator.\n` +
        `Translate the following into natural, accurate standard ${primaryLanguage} matched to the source register (target dialect id: ${dialectId}).\n` +
        `${scriptLockBlock}\n` +
        `${standardNaturalnessRule}\n` +
        `Return ONLY the translated text. No explanations.\n` +
        `${antiLeakageRule}\n` +
        `${lengthRule}\n` +
        `${personalizationBlock}` +
        `Text: '''${text}'''`,
      slangRequested: false,
    };
  }

  const locationLine = customLocation
    ? `You are a 22-year-old from ${customLocation} who speaks ${primaryLanguage}. You grew up there, you text your friends every day, and you write exactly like people from your neighborhood.`
    : usesPremiumStreetIntensityControls(dialectId)
      ? `You are a 22-year-old native ${primaryLanguage} speaker from the streets (voice: ${dialectId}). You grew up there, you text your friends every day, and you write exactly like people from your city.`
      : `You are a 22-year-old native ${primaryLanguage} speaker (voice: ${dialectId}). You text friends every day in natural, idiomatic casual — believable and clear, not stiff formal.`;

  const previousLine = previousMessage
    ? `\nFor consistency, the previous message in this conversation was rewritten as: "${previousMessage}". Keep the same voice and energy.`
    : "";

  const isRussianLang =
    dialectId.toLowerCase().includes("russian") || primaryLanguage.toLowerCase().includes("russian");

  const slangControlBlock =
    slangRequested && isKnownPremiumDialect(dialectId)
      ? `\n\n${formatSlangControlPromptGuidance(dialectId)}`
      : "";

  const dialectPackBlock =
    slangRequested && isKnownPremiumDialect(dialectId)
      ? formatDialectPackPromptAppendix(buildDialectPackPromptHints(dialectId))
      : "";

  /** Premium street dialects: keep distinctive voice — do not dilute toward generic American internet filler. */
  const premiumDistinctiveReminder =
    slangRequested && isKnownPremiumDialect(dialectId)
      ? dialectId === "Russian Street"
        ? `

PREMIUM DIALECT (Russian Street): Distinctive Moscow/SPb youth voice — not generic internet Russian. Match the source: neutral or practical lines stay flat and direct even when the UI is on “flirt”; only add warmth when the source is actually flirty or romantic.
`
        : `

PREMIUM DIALECT (${dialectId}): Keep a distinctive, culturally tuned voice — not generic hype English. Preserve depth and local authenticity; flirt should feel warmer than DM, DM blunter than flirt.
`
      : "";

  const premiumAntiOvercookGuard =
    slangRequested && isKnownPremiumDialect(dialectId)
      ? formatPremiumAntiOvercookGuard({
          sourceText: text,
          slangLevel,
          intentCategory,
          context,
          dialectId,
        })
      : "";

  /** Tuning: US English standard output — consistent register, less meme-template phrasing; clearer flirt vs DM (see CONTEXT above). */
  const englishStandardVoiceBlock =
    dialectId === "English (Standard)" && slangRequested
      ? `

ENGLISH (STANDARD) — U.S. casual texting (mandatory):
- Keep ONE consistent register per message: natural General American casual. Do not mix British/street-UK words (e.g. "proper", "bruv", "mandem") with American slang in the same message unless the source text already mixes them.
- Avoid tired viral catchphrases that sound copy-pasted: e.g. "hit different", "it's giving", "understood the assignment", "no thoughts just vibes". Say the same idea in plain, human words.
- Do not end thoughts with "hit different" / "hit me different" / "lookin different" / "whole vibe just X different" — those are the same template in new words.
- STANDARD (non-premium) GOAL: believable, sendable General American casual — natural and clear. Do not try to match premium street-dialect intensity; usability and voice consistency beat performance.
- FLIRT (when context is flirt): warmer and interested; smooth, not stiff — still like a real person, not a script.
- DM (when context is dm): more direct and friend-chaotic than flirt; less polish, more shorthand.
`
      : "";

  /** Tuning: NYC voice — avoid meme-style "…different" closers; keep flirt softer than DM. */
  const newYorkBrooklynVoiceBlock =
    dialectId === "New York Brooklyn" && slangRequested
      ? `

NEW YORK BROOKLYN — street English (mandatory):
- Do not end on a hollow "different" punchline (e.g. "your energy different", "that shit different", "vibe different", or any sentence that ends on "...different") — that reads like a viral template. Close with a concrete line, a question, or plain words.
- FLIRT: interested and a little softer than DM. DM: faster and blunter than flirt — less setup, more straight talk.
- ANTI-OVERCOOK: Do not repeat signature fillers ("deadass", "son", etc.) across the message or lean on them every line — use sparingly, only where they would naturally land; vary wording like a real speaker.
`
      : "";

  /** Tuning: London Roadman — natural MLE chat, not a dialect demo. */
  const londonRoadmanAntiOvercookBlock =
    dialectId === "London Roadman" && slangRequested
      ? `

LONDON ROADMAN — lived-in MLE, not a drill:
- Write like a normal casual message: subject + verb + link words, not headline telegraph. Connect ideas with "and / so / then" where a real speaker would — not "came did a check found" keyword stacks.
- Local identity = natural UK phrasing and rhythm, not visible dialect signaling. One or two light touches (bruv, mandem, feds) can land; avoid piling "nicked / bagged / drew" etc. to prove the voice.
- Work / police / crime storytelling: do not force extra "street" garnish — plain update + light MLE reads more human than slang-for-cops.
- FLIRT context: if the source is not romantic or flirty, keep the same matter-of-fact tone as DM — do not inject soft/flirty energy, pet names, or pickup vibes.
- Prefer stable spellings over gimmicky ones; HEAVY = more color in phrasing, not more tokens per line.
- Short source → short reply; no filler ticks to sound "more road."
`
      : "";

  /** Tuning: Israeli Street — natural WhatsApp Hebrew over slang performance (esp. heavy / flirt). */
  const israeliStreetAntiOvercookBlock =
    dialectId === "Israeli Street" && slangRequested
      ? `

ISRAELI STREET — Hebrew WhatsApp (not a slang showcase):
- Direct, readable Hebrew in full thoughts — natural rhythm over staccato keyword drops. Match the source: mundane news → mundane delivery, not theatrical hype.
- Do not repeat vocatives/fillers (וואי / אחי / נו) every clause; one softener if any. Storytelling: narrate the chain clearly (מי באו → מה מצאו → מה קרה) without piling slang for show.
- HEAVY: still Hebrew-native and street — density follows the message; avoid "street performance" when the line is everyday reporting.
- FLIRT: warmer register, still complete sentences; charm from tone, not from stacked slang.
- Never trail off mid-word or mid-sentence before |||; finish the thought.
`
      : "";

  /** Yard voice — human flow, not TV patois. */
  const jamaicanPatoisVoiceBlock =
    dialectId === "Jamaican Patois" && slangRequested
      ? `

JAMAICAN PATOIS — yard voice, real DM:
- Tell the story in smooth, connected lines — full clauses with "an' / so / den" where needed — not broken keyword stacks or one-word-per-line theatrics.
- Yard identity = natural voice and rhythm, not maximum patois spelling. Prefer readable mix: standard English where it still sounds yard aloud; use patois spellings where they add clarity or realism, not to show off.
- Do not stack "di / dem / a / wi" every clause; avoid unstable or hyper-written spellings unless they clearly help. HEAVY = richer texture, not caricature dancehall or police-story slang for show.
- Work / police / everyday news: matter-of-fact first; no forced Babylon / station performance unless the source is already that energy.
- FLIRT context: if the content is not romantic or flirty, keep the same neutral storytelling tone as DM — do not add sweetness, flirting, or hype.
- Short source → short reply; no pasted-on token rows.
`
      : "";

  /** CDMX — completeness + narrative clarity (model sometimes trailed off mid-phrase). */
  const mexicoCityBarrioVoiceBlock =
    dialectId === "Mexico City Barrio" && slangRequested
      ? `

MEXICO CITY BARRIO — CDMX WhatsApp:
- Warm local Spanish with natural connectors; complete sentences before ||| — do not stop mid-phrase (e.g. dangling half-lines).
- Everyday storytelling: cómo le contarías a un amigo — eventos en orden, not a slang pile-up. One or two strong mexicanismos beat many thin ones.
- FLIRT vs DM: same clarity; flirt can be softer, not more chaotic.
`
      : "";

  /** Urban Egyptian (Cairo) — placed after RULE PROFILE overlay so these rules win (reduces meta leakage). */
  const arabicEgyptianVoiceBlock =
    dialectId === "Arabic Egyptian" && slangRequested
      ? `

ARABIC EGYPTIAN (CAIRO) — urban chat (mandatory):
- Register: modern Greater Cairo colloquial Arabic for everyday chat — warm, casual, sendable. NOT formal Modern Standard Arabic (essay/news tone). NOT theatrical "movie street," NOT meme-stacked catchphrases.
- SCRIPT: Arabic letters for Arabic words only. No Arabizi (no Latin letters for Arabic words).
- Intent first, local flavor second: match the source meaning; add Egyptian color only where it reads natural — do not stack discourse markers or force slang.
- ANTI-OVERCOOK: short input → short output; one natural beat per clause; avoid caricature slang and obvious dialect injection.
- FLIRT / HEAVY: still one sendable chat message — not a performance. Warm interest, restrained; not aggressive pickup energy. Do not add English, glosses, or alternatives because intensity is higher.

OUTPUT SHAPE (NON-NEGOTIABLE):
- Your reply before ||| must be only the in-character message: Arabic script line(s) you would actually send. One continuous voice — not a lesson.
- No English words or sentences (except unavoidable global brand names if already in the source).
- No linguistic gloss, etymology, "Option 1 / Option 2", bullet lists of variants, phonetic notes, or commentary about word choice.
- No meta ("here's a translation", "let's try", "note that"). These are internal — never print them.
- FLIRT plus HEAVY slang level: same rules — still a single final Arabic message block before |||; never switch to English or analysis.

RULE PROFILE above applies to tone/word choice only; it must not change this output shape.
`
      : "";

  const russianRule = isRussianLang
    ? `
CRITICAL RULES FOR RUSSIAN — read carefully:

1. GRAMMAR IS NON-NEGOTIABLE: Every sentence must be grammatically correct in Russian. Slang words must fit naturally into correct Russian sentence structure. Never force a slang word into a position where it breaks grammar. For example — "торчим" requires a location or reason, never a direct object like "тебя". Wrong: "мы тут торчим тебя". Correct: "мы тут торчим без тебя" or "мы тут зависаем".

2. USE ONLY CURRENT SLANG: Modern youth slang used right now in Moscow and St. Petersburg on Telegram and VK. Examples of current real slang: бро, чё, норм, кек, лол, зависать, чилить, агонь, жиза, краш, кринж, рофл, мб (может быть), имхо, ору, пон (понял). Do NOT use: outdated 90s criminal slang (пацан, братан in a serious way, базар, конкретно).

3. NATURAL RHYTHM: Russians text in short punchy sentences. They drop pronouns when obvious. They use abbreviations. Sound like a real 20-year-old texting on their phone right now — not a translation.

4. SELF-CHECK (SILENT): Before returning, mentally re-read as a native Russian speaker and fix issues — do NOT write this check, your reasoning, or any commentary in the output.

5. OUTPUT ONLY THE MESSAGE: Return ONLY the conversational line(s) in Cyrillic — exactly what you would send. No labels ("Translation:", "Вариант:"), no meta-analysis, no discussion of word choices, no alternatives or preambles.

6. PROFILE VS OUTPUT: Any RULE PROFILE or tuning block above applies to word choice only. It must never change the output shape: still only the in-character line(s), then |||, then the dictionary — never explanations, lists of options, or commentary about the rewrite.`
    : "";

  const russianStreetStabilizationBlock =
    dialectId === "Russian Street" && slangRequested
      ? `

RUSSIAN STREET — OUTPUT STABILITY (mandatory; overrides generic FLIRT context when the source is neutral):

NEUTRAL / NON-FLIRTY SOURCES (news, TV, facts, logistics, links, mundane requests):
- If the SOURCE is not romantic or flirty, ignore “flirt” as a tone mandate: write like DM — matter-of-fact, no added warmth performance.
- Do NOT add hook questions, “who’s your favorite”, “tell me yours”, “guess who”, “what do you think”, or similar engagement lines not present in the source.
- Do NOT add extra sentences to manufacture chemistry.

WHEN THE SOURCE IS ACTUALLY FLIRTY / ROMANTIC:
- Then you may use a warmer, closer register; still no English, no meta, no tutorial tone.

DICTIONARY (after |||):
- Lines after ||| must be Russian only (Cyrillic). No English words, no Latin gloss explanations, no mixed EN/RU lines, no “casual for / informal / send / when you”.
- Format: at most 2 short lines like: слово — краткое пояснение по-русски.
- If a clean Russian-only gloss is not possible, output exactly one line: —
- Do not truncate mid-word, mid-paren, or mid-dash; incomplete gloss lines are forbidden — use — instead.
`
      : "";

  const devRuleProfileOverlay = slangRequested ? formatDevRuleProfileOverlay(devRuleProfile) : "";

  /** Peninsular Madrid urban — after RULE PROFILE overlay; reduces meta + LatAm default leakage. */
  const spanishMadridVoiceBlock =
    dialectId === "Spanish Madrid" && slangRequested
      ? `

SPANISH MADRID (PENINSULAR / URBAN) — mandatory:
- Register: modern Madrid-area conversational Spanish — natural, sendable, young-adult chat. NOT influencer monologue, NOT meme-stack performance, NOT theatrical, NOT essay-formal written Spanish.
- Geography: Peninsular Spanish first; do NOT default to Latin-American vocabulary or cadence unless the source clearly is. Avoid Mexican/LatAm filler as the baseline.
- Intent first, local flavor second. Prefer stable markers (vale, qué tal, bueno, a ver, ya se verá; tío/tía sparingly). Avoid slang stacking, fake Gen-Z Madrid, and English loan filler (bro, literal, etc.).
- Avoid by default: PEC, basado, en plan as empty filler, tronco, excessive mazo, meme-catchphrase energy.
- ANTI-OVERCOOK: short input → short output; one clear beat per clause; no assistant padding or meta.
- After |||: minimal — at most two short Spanish gloss lines, or a single "—". Never a glossary essay or English explanations (see OUTPUT FORMAT below).

PRACTICAL / NEUTRAL ASKS (logistics: link, time, place, quick favor): one short line before |||; no emoji by default; plain everyday WhatsApp wording; do not elevate register (avoid stiff "enlace de referencia" — chat "link" / "pasame el link" is fine unless the source is formal).

OUTPUT SHAPE (NON-NEGOTIABLE):
- Before |||: only the in-character message in Spanish — line(s) you would actually send.
- No English, no gloss, no "option A/B", no commentary, no linguistic notes, no meta.
- FLIRT / HEAVY: still one sendable chat block before |||; do not switch to analysis or multilingual options.

RULE PROFILE above applies to tone/word choice only; it must not change this output shape.
`
      : "";

  return {
    prompt:
      `${locationLine}${previousLine}\n\n` +
      `${scriptLockBlock}\n\n` +
      `Context: ${contextPrompt}\n` +
      `Intensity: ${intensityPrompt}\n` +
      `${antiLeakageRule}\n` +
      `${lengthRule}\n` +
      `${conversationalCompressionRule}\n` +
      `${slangAuthenticityRule}` +
      `${personalizationBlock}` +
      `${slangControlBlock}` +
      `${dialectPackBlock}` +
      `${premiumDistinctiveReminder}` +
      `${premiumAntiOvercookGuard}` +
      `${englishStandardVoiceBlock}` +
      `${newYorkBrooklynVoiceBlock}` +
      `${londonRoadmanAntiOvercookBlock}` +
      `${israeliStreetAntiOvercookBlock}` +
      `${jamaicanPatoisVoiceBlock}` +
      `${mexicoCityBarrioVoiceBlock}` +
      `${devRuleProfileOverlay}\n\n` +
      `${spanishMadridVoiceBlock}` +
      `${arabicEgyptianVoiceBlock}` +
      `${russianRule}` +
      `${russianStreetStabilizationBlock}` +
      `Rewrite the following text the way YOU would actually send it (in ${primaryLanguage}, script per SCRIPT LOCK above):\n` +
      `'''${text}'''` +
      `${formattingRule}`,
    slangRequested: true,
  };
}

async function callGeminiGenerate(
  apiKey: string,
  prompt: string,
  slangRequested: boolean
): Promise<{ text: string; raw: unknown }> {
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
  const geminiRes = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: slangRequested ? 0.7 : 0.2,
        maxOutputTokens: 1024,
      },
    }),
  });
  const data = await geminiRes.json();
  const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  return { text, raw: data };
}

/** Read-aloud: target language line → Hebrew letters only (separate lightweight generation). */
async function callGeminiHebrewTransliteration(apiKey: string, translatedLine: string): Promise<string> {
  const trimmed = translatedLine.trim();
  if (!trimmed) return "";

  const prompt =
    `You output exactly one thing: a phonetic read-aloud version of the LINE below using Hebrew letters only (א–ת, including final letter forms).\n\n` +
    `CRITICAL — COMPLETENESS:\n` +
    `- You MUST provide the COMPLETE transliteration for the ENTIRE translated phrase in LINE. Cover every word from start to finish.\n` +
    `- Do not truncate the sentence, stop halfway, end with "...", or omit the tail of the LINE. If the LINE is long, output the full length in Hebrew letters anyway.\n\n` +
    `Rules:\n` +
    `- Transcribe how a Hebrew speaker would pronounce the LINE for everyday reading — practical chat style, not IPA, not linguistic analysis.\n` +
    `- Your entire output must be Hebrew script only. No Latin letters, no English words, no labels, no quotation marks wrapping the answer, no explanations.\n` +
    `- The LINE may be in any language or writing system; map the sounds to Hebrew letters in a simple, readable way.\n` +
    `- Do not repeat or translate the meaning; only approximate pronunciation in Hebrew letters.\n\n` +
    `LINE:\n` +
    trimmed;

  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
  const geminiRes = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        /** Long translated lines need room; 512 was cutting Hebrew read-aloud mid-phrase. */
        maxOutputTokens: 2048,
      },
    }),
  });
  const data = await geminiRes.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const text =
    Array.isArray(parts) && parts.length > 0
      ? parts.map((p: { text?: string }) => p?.text ?? "").join("")
      : "";
  return text.trim();
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY env var" },
      { status: 500, headers: corsHeaders }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders });
  }

  const {
    text,
    currentLang,
    translationMode,
    slangLocation,
    slangLevel,
    isPremiumSelected,
    context,
    previousMessage,
    sourceLanguage,
    uiLocale,
  } = body || {};

  if (!text || !currentLang) {
    return NextResponse.json(
      { error: "Missing required fields: text, currentLang" },
      { status: 400, headers: corsHeaders }
    );
  }

  const profileFromBody = parseOptionalPersonalProfileFromBody(body);
  const personaPresetId = parseOptionalPersonaPresetId(body);
  const effectiveProfile = applyPersonaPresetToProfile(profileFromBody, personaPresetId);
  const personalizationHints = [
    ...buildPersonalizationPromptHints(effectiveProfile),
    ...buildPersonaPresetPromptHints(personaPresetId),
  ];

  const explicitRuleProfile =
    process.env.NODE_ENV === "development" ? parseDevRuleProfile(body.devRuleProfile) : undefined;
  const intentCategory = parseIntentCategory(body.intentCategory);
  const devRuleProfile: DevRuleProfileId =
    explicitRuleProfile ?? resolveRuleProfile(String(currentLang), intentCategory);

  const { prompt, slangRequested } = buildPrompt({
    text: String(text),
    currentLang: String(currentLang),
    translationMode: translationMode === "slang" ? "slang" : "standard",
    slangLocation: slangLocation as string | undefined,
    slangLevel: parseInt(String(slangLevel), 10) || 2,
    isPremiumSelected: !!isPremiumSelected,
    context: (context as string) || "default",
    previousMessage: previousMessage ? String(previousMessage) : null,
    personalizationHints,
    devRuleProfile,
    intentCategory,
  });

  try {
    const first = await callGeminiGenerate(apiKey, prompt, slangRequested);
    let fullText = first.text;

    if (!fullText) {
      return NextResponse.json(
        { error: "Gemini returned no candidates", data: first.raw },
        { status: 502, headers: corsHeaders }
      );
    }

    const dialectId = String(currentLang);

    if (dialectId === "Israeli Street") {
      const { translated, dictRaw } = splitTranslationAndDictionary(fullText);
      let t = translated;
      const latinBefore = countLatinTokens(t);

      if (containsLatinLeak(t)) {
        console.warn("[translate][Israeli Street] Latin leakage detected in initial translation", {
          latinTokenCount: latinBefore,
          preview: t.slice(0, 140),
        });
      }

      const sanitized = sanitizeIsraeliStreetOutput(t);
      const latinAfterSanitize = countLatinTokens(sanitized);
      if (sanitized !== t && (latinAfterSanitize < latinBefore || !containsLatinLeak(sanitized))) {
        console.info("[translate][Israeli Street] Sanitization reduced Latin leakage", {
          latinBefore,
          latinAfter: latinAfterSanitize,
        });
      }
      t = sanitized;

      let combined = dictRaw ? `${t}${DICT_SEPARATOR}${dictRaw}` : t;

      if (shouldRetryIsraeliStreetOutput(t)) {
        console.warn("[translate][Israeli Street] Triggering Hebrew-only retry (single attempt)", {
          latinTokenCountAfterSanitize: latinAfterSanitize,
        });
        const retryPrompt =
          prompt + ISRAELI_STREET_RETRY_REINFORCEMENT + formatIsraeliStreetRetryFromConfig();
        const second = await callGeminiGenerate(apiKey, retryPrompt, slangRequested);
        if (!second.text) {
          console.warn("[translate][Israeli Street] Retry returned empty; keeping sanitized first-pass translation");
          fullText = combined;
        } else {
          const { translated: t2, dictRaw: d2 } = splitTranslationAndDictionary(second.text);
          let t2s = sanitizeIsraeliStreetOutput(t2);
          if (containsLatinLeak(t2s)) {
            console.warn("[translate][Israeli Street] Latin leakage remains after retry", {
              latinTokenCount: countLatinTokens(t2s),
              preview: t2s.slice(0, 140),
            });
          }
          combined = d2 ? `${t2s}${DICT_SEPARATOR}${d2}` : t2s;
          fullText = combined;
        }
      } else {
        fullText = combined;
      }
    }

    if (dialectId === "Russian Street" && slangRequested) {
      const { translated, dictRaw } = splitTranslationAndDictionary(fullText);
      const dictSanitized = sanitizeRussianStreetDictionary(dictRaw);
      fullText = dictSanitized ? `${translated}${DICT_SEPARATOR}${dictSanitized}` : translated;
    }

    const splitMain = splitTranslationAndDictionary(fullText);
    const dictRaw = splitMain.dictRaw;
    const cleanedMain = cleanMainTranslationLine(splitMain.translated);
    if (cleanedMain !== splitMain.translated) {
      fullText = dictRaw ? `${cleanedMain}${DICT_SEPARATOR}${dictRaw}` : cleanedMain;
    }
    const translatedMain = cleanedMain;

    const sourceLangStr =
      typeof sourceLanguage === "string" ? sourceLanguage : undefined;
    const uiLocaleStr = typeof uiLocale === "string" ? uiLocale : undefined;

    let hebrewTransliteration: string | undefined;
    if (
      shouldOfferHebrewTransliteration(sourceLangStr, uiLocaleStr) &&
      translatedMain.trim() &&
      !isPrimarilyHebrewScript(translatedMain)
    ) {
      try {
        const raw = await callGeminiHebrewTransliteration(apiKey, translatedMain);
        if (raw && looksLikeHebrewLetterTransliteration(raw)) {
          hebrewTransliteration = raw.trim();
        }
      } catch {
        /* omit optional field */
      }
    }

    return NextResponse.json(
      {
        fullText,
        sourceText: String(text),
        translatedText: translatedMain,
        ...(hebrewTransliteration ? { hebrewTransliteration } : {}),
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Gemini request failed", details: msg },
      { status: 500, headers: corsHeaders }
    );
  }
}
