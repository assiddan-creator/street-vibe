import { NextRequest, NextResponse } from "next/server";
import {
  DICT_SEPARATOR,
  getDialectPrimaryLanguage,
  getDialectScriptLock,
  SCRIPT_OUTPUT_UNIVERSAL_RULE,
  splitTranslationAndDictionary,
} from "@/lib/streetVibeTheme";
import { isKnownPremiumDialect } from "@/lib/dialectRegistry";
import {
  containsLatinLeak,
  countLatinTokens,
  ISRAELI_STREET_RETRY_REINFORCEMENT,
  sanitizeIsraeliStreetOutput,
  shouldRetryIsraeliStreetOutput,
} from "@/lib/hebrewOutputGuard";
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
import { parseIntentCategory, resolveRuleProfile } from "@/lib/evaluation/ruleProfileRouting";

const GEMINI_MODEL = "gemini-2.5-flash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

  const intensityPrompt = INTENSITY_INSTRUCTIONS[slangLevel] || INTENSITY_INSTRUCTIONS[2];
  const contextPrompt = CONTEXT_INSTRUCTIONS[context] || CONTEXT_INSTRUCTIONS.default;
  const customLocation = slangLocation ? String(slangLocation).trim() : "";

  const dialectId = String(currentLang);
  const primaryLanguage = getDialectPrimaryLanguage(dialectId);
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

  const formattingRule =
    "\n\nOUTPUT FORMAT — follow this exactly and nothing else:\n" +
    "<rewritten text>\n" +
    "|||\n" +
    "<dictionary: 1-3 key slang words used, format: Word - Meaning>\n" +
    "Do not add any other text, explanation, or preamble.";

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
    : `You are a 22-year-old native ${primaryLanguage} speaker from the streets (voice: ${dialectId}). You grew up there, you text your friends every day, and you write exactly like people from your city.`;

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
      ? `

PREMIUM DIALECT (${dialectId}): Keep a distinctive, culturally tuned voice — not generic hype English. Preserve depth and local authenticity; flirt should feel warmer than DM, DM blunter than flirt.
`
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

  /** Tuning: London Roadman — fewer stacked discourse markers in one breath. */
  const londonRoadmanAntiOvercookBlock =
    dialectId === "London Roadman" && slangRequested
      ? `

LONDON ROADMAN — avoid marker soup:
- Do not stack multiple roadman discourse markers in the same line (e.g. still / init / proper / tru say / you get me) unless the source genuinely needs that energy — usually one or two beats max.
- Short source → short reply; do not pad with filler ticks to sound "more road."
`
      : "";

  /** Tuning: Israeli Street — natural WhatsApp Hebrew over slang performance (esp. heavy / flirt). */
  const israeliStreetAntiOvercookBlock =
    dialectId === "Israeli Street" && slangRequested
      ? `

ISRAELI STREET — natural texting (not slang cosplay):
- Prefer believable Israeli WhatsApp Hebrew: direct and local, but not every clause stuffed with slang tokens — one or two sharp hits often beat a wall of slang.
- If the source is plain, keep the Hebrew plain-street, not a showcase reel.
- HEAVY intensity: stay Hebrew-native and street, but do not add slang just to sound "more street" — density must match the message; avoid piling slang for show.
- FLIRT: warmth and interest in natural Hebrew; charm from tone and word choice, not a caricature performance of "street."
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

  const devRuleProfileOverlay = slangRequested ? formatDevRuleProfileOverlay(devRuleProfile) : "";

  return {
    prompt:
      `${locationLine}${previousLine}\n\n` +
      `${scriptLockBlock}\n\n` +
      `Context: ${contextPrompt}\n` +
      `Intensity: ${intensityPrompt}\n` +
      `${antiLeakageRule}\n` +
      `${lengthRule}\n` +
      `${conversationalCompressionRule}\n` +
      `${noAIRule}` +
      `${personalizationBlock}` +
      `${slangControlBlock}` +
      `${dialectPackBlock}` +
      `${premiumDistinctiveReminder}` +
      `${englishStandardVoiceBlock}` +
      `${newYorkBrooklynVoiceBlock}` +
      `${londonRoadmanAntiOvercookBlock}` +
      `${israeliStreetAntiOvercookBlock}` +
      `${devRuleProfileOverlay}\n\n` +
      `${arabicEgyptianVoiceBlock}` +
      `${russianRule}` +
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

    return NextResponse.json({ fullText }, { status: 200, headers: corsHeaders });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Gemini request failed", details: msg },
      { status: 500, headers: corsHeaders }
    );
  }
}
