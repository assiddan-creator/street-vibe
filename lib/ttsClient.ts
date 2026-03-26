/** BCP-47 locale for Web Speech API synthesis per output dialect. */
export function getDialectLocaleForTts(outputLang: string): string {
  const map: Record<string, string> = {
    "London Roadman": "en-GB",
    "Jamaican Patois": "en-JM",
    "New York Brooklyn": "en-US",
    "Tokyo Gyaru": "ja-JP",
    "Paris Banlieue": "fr-FR",
    "Russian Street": "ru-RU",
    "Lisbon Street": "pt-PT",
    "Israeli Street": "he-IL",
    "Mexico City Barrio": "es-MX",
    "Rio Favela": "pt-BR",
    "English (Standard)": "en-US",
    Spanish: "es-ES",
    French: "fr-FR",
    German: "de-DE",
    Italian: "it-IT",
    Russian: "ru-RU",
    Portuguese: "pt-PT",
    Japanese: "ja-JP",
    Arabic: "ar-SA",
    "Hebrew (Standard)": "he-IL",
  };
  return map[outputLang] ?? "en-US";
}

/** Speak with the browser's built-in TTS (no network). */
export function speakNativeTts(text: string, dialect: string): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.reject(new Error("Speech synthesis not available"));
  }
  return new Promise((resolve, reject) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = getDialectLocaleForTts(dialect);
    u.onend = () => resolve();
    u.onerror = () => reject(new Error("Speech synthesis failed"));
    window.speechSynthesis.speak(u);
  });
}

/** Poll Replicate until TTS prediction completes; returns playable URL (https or data:). */
export async function fetchTtsAudioUrl(
  text: string,
  dialect: string,
  engine: "minimax" | "google" = "minimax"
): Promise<string> {
  const startRes = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, dialect, engine }),
  });
  const startData = (await startRes.json()) as {
    audioBase64?: string;
    engine?: string;
    predictionId?: string;
    error?: string;
  };
  if (!startRes.ok) {
    throw new Error(startData.error || "TTS request failed");
  }
  if (startData.audioBase64) {
    return `data:audio/mp3;base64,${startData.audioBase64}`;
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
