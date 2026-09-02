const REPLICATE_TEXT_MODEL = "google/gemini-3.1-pro";
const REPLICATE_WAIT_SECONDS = 60;

type ReplicatePrediction = {
  id?: string;
  status?: string;
  output?: string | string[] | null;
  error?: string | null;
};

export type ReplicateTextResult = {
  text: string;
  raw: ReplicatePrediction;
};

function readPredictionText(output: ReplicatePrediction["output"]): string {
  if (Array.isArray(output)) return output.join("").trim();
  return typeof output === "string" ? output.trim() : "";
}

/** Run Gemini 3.1 Pro through Replicate with low reasoning for interactive translation latency. */
export async function generateReplicateText({
  apiToken,
  prompt,
  creative,
  maxOutputTokens = 1024,
}: {
  apiToken: string;
  prompt: string;
  creative: boolean;
  maxOutputTokens?: number;
}): Promise<ReplicateTextResult> {
  const response = await fetch(
    `https://api.replicate.com/v1/models/${REPLICATE_TEXT_MODEL}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken.trim()}`,
        "Content-Type": "application/json",
        Prefer: `wait=${REPLICATE_WAIT_SECONDS}`,
      },
      body: JSON.stringify({
        input: {
          prompt,
          thinking_level: "low",
          temperature: creative ? 0.7 : 0.2,
          top_p: 0.95,
          max_output_tokens: maxOutputTokens,
        },
      }),
    }
  );

  const rawText = await response.text();
  let prediction: ReplicatePrediction;
  try {
    prediction = rawText ? (JSON.parse(rawText) as ReplicatePrediction) : {};
  } catch {
    throw new Error(`Replicate returned invalid JSON (HTTP ${response.status})`);
  }

  if (!response.ok) {
    throw new Error(prediction.error || `Replicate API HTTP ${response.status}`);
  }

  if (prediction.error || prediction.status === "failed" || prediction.status === "canceled") {
    throw new Error(prediction.error || `Replicate prediction ${prediction.status}`);
  }

  if (prediction.status !== "succeeded") {
    throw new Error(
      `Replicate prediction did not finish within ${REPLICATE_WAIT_SECONDS} seconds (status: ${prediction.status || "unknown"})`
    );
  }

  return { text: readPredictionText(prediction.output), raw: prediction };
}

export { REPLICATE_TEXT_MODEL };
