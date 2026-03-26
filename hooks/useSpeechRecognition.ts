"use client";

import { useState, useRef, useCallback } from "react";

interface UseSpeechRecognitionProps {
  lang?: string;
  onResult?: (text: string) => void;
  onFinalResult?: (text: string) => void;
}

export function useSpeechRecognition({
  lang = "he-IL",
  onResult,
  onFinalResult,
}: UseSpeechRecognitionProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<unknown>(null);

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

    const recognition = new SR() as {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onstart: (() => void) | null;
      onresult: ((event: { resultIndex: number; results: SpeechRecognitionResultList }) => void) | null;
      onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
      onend: (() => void) | null;
      start: () => void;
    };
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setInterimText("");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (interim) {
        setInterimText(interim);
        onResult?.(interim);
      }

      if (final) {
        setInterimText("");
        onFinalResult?.(final.trim());
      }
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
  }, [lang, onResult, onFinalResult]);

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
