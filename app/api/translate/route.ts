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
        `Translate the following into standard, formal, dictionary-accurate ${primaryLanguage} (target dialect id: ${dialectId}).\n` +
        `${scriptLockBlock}\n` +
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
`
      : "";

  const russianRule = isRussianLang
    ? `
CRITICAL RULES FOR RUSSIAN — read carefully:

1. GRAMMAR IS NON-NEGOTIABLE: Every sentence must be grammatically correct in Russian. Slang words must fit naturally into correct Russian sentence structure. Never force a slang word into a position where it breaks grammar. For example — "торчим" requires a location or reason, never a direct object like "тебя". Wrong: "мы тут торчим тебя". Correct: "мы тут торчим без тебя" or "мы тут зависаем".

2. USE ONLY CURRENT SLANG: Modern youth slang used right now in Moscow and St. Petersburg on Telegram and VK. Examples of current real slang: бро, чё, норм, кек, лол, зависать, чилить, агонь, жиза, краш, кринж, рофл, мб (может быть), имхо, ору, пон (понял). Do NOT use: outdated 90s criminal slang (пацан, братан in a serious way, базар, конкретно).

3. NATURAL RHYTHM: Russians text in short punchy sentences. They drop pronouns when obvious. They use abbreviations. Sound like a real 20-year-old texting on their phone right now — not a translation.

4. SELF-CHECK BEFORE OUTPUT: Before returning the result, mentally re-read it as a native Russian speaker. If any sentence sounds unnatural or grammatically broken — fix it.`
    : "";

  return {
    prompt:
      `${locationLine}${previousLine}\n\n` +
      `${scriptLockBlock}\n\n` +
      `Context: ${contextPrompt}\n` +
      `Intensity: ${intensityPrompt}\n` +
      `${antiLeakageRule}\n` +
      `${lengthRule}\n` +
      `${noAIRule}` +
      `${personalizationBlock}` +
      `${slangControlBlock}` +
      `${dialectPackBlock}` +
      `${premiumDistinctiveReminder}` +
      `${englishStandardVoiceBlock}` +
      `${newYorkBrooklynVoiceBlock}` +
      `${russianRule}\n\n` +
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
