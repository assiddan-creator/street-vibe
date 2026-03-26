"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseSpeechRecognitionProps {
  lang?: string;
  onResult?: (text: string) => void;
  onFinalResult?: (text: string) => void;
}

/** Collapse whitespace for display / commits. */
function normalizeTranscript(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Key for duplicate detection — mobile often re-emits with spacing/case differences. */
function dedupeKey(s: string): string {
  return s.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Web Speech API wrapper. Non-continuous mode = one utterance per session.
 * Mobile WebKit often fires onresult multiple times with the same final phrase — we dedupe
 * with a normalized key (NFKC, whitespace, case) stored in lastProcessedText.
 * Final text is committed only once per distinct phrase; interim stays separate state.
 */
export function useSpeechRecognition({
  lang = "he-IL",
  onResult,
  onFinalResult,
}: UseSpeechRecognitionProps = {}) {
  const [isListening, setIsListening] = useState(false);
  /** Volatile preview only; never append this into committed app state in the parent. */
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<unknown>(null);
  const onResultRef = useRef(onResult);
  const onFinalResultRef = useRef(onFinalResult);

  /** Last committed phrase key (dedupeKey) — blocks identical consecutive finals from mobile. */
  const lastProcessedText = useRef<string | null>(null);

  useEffect(() => {
    onResultRef.current = onResult;
    onFinalResultRef.current = onFinalResult;
  }, [onResult, onFinalResult]);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;

    const w = window as unknown as {
      SpeechRecognition?: new () => unknown;
      webkitSpeechRecognition?: new () => unknown;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setError("Speech recognition not supported in this browser. Please use Chrome.");
      return;
    }

    if (recognitionRef.current) {
      try {
        (recognitionRef.current as { stop: () => void }).stop();
      } catch {
        /* ignore */
      }
    }

    lastProcessedText.current = null;

    const recognition = new SR() as {
      continuous: boolean;
      interimResults: boolean;
      maxAlternatives: number;
      lang: string;
      onstart: (() => void) | null;
      onresult: ((event: { resultIndex: number; results: SpeechRecognitionResultList }) => void) | null;
      onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
      onend: (() => void) | null;
      start: () => void;
    };
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setInterimText("");
      lastProcessedText.current = null;
    };

    recognition.onresult = (event) => {
      // Interim line: rebuild full non-final snapshot (results are cumulative).
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) {
          interim += result[0].transcript;
        }
      }

      // New final segments in this event only — always from resultIndex onward.
      let newFinal = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          newFinal += result[0].transcript;
        }
      }

      setInterimText(interim);
      onResultRef.current?.(interim);

      const trimmed = normalizeTranscript(newFinal);
      if (!trimmed) return;

      const key = dedupeKey(trimmed);
      const prevKey = lastProcessedText.current;

      // Same phrase again (spacing/case-insensitive) — mobile often fires duplicate onresult.
      if (prevKey !== null && key === prevKey) {
        return;
      }

      lastProcessedText.current = key;
      setInterimText("");
      onFinalResultRef.current?.(trimmed);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessages: Record<string, string> = {
        "not-allowed": "Microphone access denied. Please allow microphone.",
        "no-speech": "No speech detected. Try again.",
        network: "Network error. Check your connection.",
        "audio-capture": "No microphone found.",
      };
      setError(errorMessages[event.error] || "Error: " + event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setError("Could not start microphone.");
      setIsListening(false);
    }
  }, [lang]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        (recognitionRef.current as { stop: () => void }).stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText("");
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  return { isListening, interimText, error, start, stop, toggle };
}
