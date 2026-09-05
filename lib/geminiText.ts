/**
 * Direct Google Generative Language API call for translation text.
 * Preferred over the Replicate-hosted path: ~1–2s instead of ~13s, and cheaper.
 * The translate route falls back to Replicate if this throws, so a bad model name
 * or a transient error degrades to "slower" rather than "broken".
 */

/** Override with GEMINI_TEXT_MODEL if the default is unavailable on the key. */
export const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-3.6-flash";

/** Street slang / flirt / angry vibes trip the default filters; keep only the hard blocks. */
const SAFETY_SETTINGS = [
  "HARM_CATEGORY_HARASSMENT",
  "HARM_CATEGORY_HATE_SPEECH",
  "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  "HARM_CATEGORY_DANGEROUS_CONTENT",
].map((category) => ({ category, threshold: "BLOCK_ONLY_HIGH" }));

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
};

export type GeminiTextResult = { text: string; raw: unknown };

export async function generateGeminiText({
  apiKey,
  prompt,
  creative,
  maxOutputTokens = 1024,
  timeoutMs = 30_000,
}: {
  apiKey: string;
  prompt: string;
  creative: boolean;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<GeminiTextResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        GEMINI_TEXT_MODEL
      )}:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: creative ? 0.7 : 0.2,
            topP: 0.95,
            maxOutputTokens,
          },
          safetySettings: SAFETY_SETTINGS,
        }),
        signal: controller.signal,
      }
    );
  } catch (e) {
    throw e instanceof Error && e.name === "AbortError"
      ? new Error(`Gemini request timed out after ${timeoutMs}ms`)
      : e;
  } finally {
    clearTimeout(timer);
  }

  const rawText = await res.text();
  let data: GeminiResponse;
  try {
    data = rawText ? (JSON.parse(rawText) as GeminiResponse) : {};
  } catch {
    throw new Error(`Gemini returned invalid JSON (HTTP ${res.status})`);
  }

  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini API HTTP ${res.status}`);
  }

  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .map((part) => part?.text ?? "")
    .join("")
    .trim();

  if (!text) {
    const reason =
      data.promptFeedback?.blockReason ||
      (candidate?.finishReason && candidate.finishReason !== "STOP"
        ? candidate.finishReason
        : "empty response");
    throw new Error(`Gemini returned no usable text (${reason})`);
  }

  return { text, raw: data };
}
