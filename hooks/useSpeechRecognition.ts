"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionCtor = new () => SpeechRecognition;

/** Web Speech API (Chrome: webkitSpeechRecognition). */
function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type UseSpeechRecognitionOptions = {
  lang?: string;
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
};

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const { lang = "en-US", onInterim, onFinal } = options;
  const onInterimRef = useRef(onInterim);
  const onFinalRef = useRef(onFinal);
  onInterimRef.current = onInterim;
  onFinalRef.current = onFinal;

  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    setError(null);

    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let finalChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const piece = result[0]?.transcript ?? "";
        if (result.isFinal) finalChunk += piece;
        else interim += piece;
      }
      if (interim) onInterimRef.current?.(interim);
      if (finalChunk) onFinalRef.current?.(finalChunk.trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      setError(event.error || "recognition error");
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start microphone");
      setListening(false);
    }
  }, [lang]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return { supported, listening, error, start, stop };
}
