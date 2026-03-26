"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseSpeechRecognitionProps {
  lang?: string;
  onResult?: (text: string) => void;
  onFinalResult?: (text: string) => void;
}

/**
 * Web Speech API wrapper. Uses non-continuous mode so each utterance yields a single final
 * result (fixes duplicate / runaway transcripts on mobile). Interim text is rebuilt from the
 * full results list each event so it replaces the live line instead of stacking duplicates.
 */
export function useSpeechRecognition({
  lang = "he-IL",
  onResult,
  onFinalResult,
}: UseSpeechRecognitionProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<unknown>(null);
  const onResultRef = useRef(onResult);
  const onFinalResultRef = useRef(onFinalResult);
  /** Dedupe: some mobile engines emit the same final transcript twice in a row. */
  const lastFinalEmittedRef = useRef<string | null>(null);

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

    lastFinalEmittedRef.current = null;

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
    // One utterance per session — avoids piling the same interim/final on mobile.
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setInterimText("");
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) {
          interim += result[0].transcript;
        }
      }

      let newFinal = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          newFinal += result[0].transcript;
        }
      }

      setInterimText(interim);
      onResultRef.current?.(interim);

      const trimmed = newFinal.trim();
      if (!trimmed) return;

      if (trimmed === lastFinalEmittedRef.current) {
        return;
      }
      lastFinalEmittedRef.current = trimmed;
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
