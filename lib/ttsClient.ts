/** Poll Replicate until TTS prediction completes; returns audio URL string. */
export async function fetchTtsAudioUrl(text: string, dialect: string): Promise<string> {
  const startRes = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, dialect }),
  });
  const startData = (await startRes.json()) as { predictionId?: string; error?: string };
  if (!startRes.ok) {
    throw new Error(startData.error || "TTS request failed");
  }
  const predictionId = startData.predictionId;
  if (!predictionId) throw new Error("No prediction ID from TTS");

  const maxAttempts = 80;
  for (let i = 0; i < maxAttempts; i++) {
    const pollRes = await fetch("/api/tts-poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictionId }),
    });
    const data = (await pollRes.json()) as {
      status?: string;
      output?: string | string[] | null;
      error?: string | null;
    };

    if (data.status === "succeeded") {
      const out = data.output;
      if (typeof out === "string" && out.startsWith("http")) return out;
      if (Array.isArray(out) && out[0] && typeof out[0] === "string") return out[0];
      throw new Error("TTS returned no audio URL");
    }
    if (data.status === "failed" || data.error) {
      throw new Error(typeof data.error === "string" ? data.error : "TTS failed");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("TTS timed out");
}
