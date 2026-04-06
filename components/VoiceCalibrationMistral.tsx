"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getStoredVoiceReferenceAudioBase64,
  setStoredVoiceReferenceAudioBase64,
} from "@/lib/customVoicePreference";

/** Exactly 3.0s capture window (Mistral zero-shot voice prompt). */
const VOICE_PROMPT_MS = 3000;

/** Instruction copy aligned with Mistral Voxtral docs (2–3s emotional reference). */
export const VOICE_CALIBRATION_MISTRAL_SCRIPT = `Record exactly three seconds of emotional speech — this clip becomes your voice prompt for zero-shot cloning. Pick a tone you want translations to sound like: hype, soft, tired, playful, or serious. One voice, minimal background noise, speak clearly into the mic.`;

type Props = {
  onVoicePromptSaved?: () => void;
  className?: string;
};

type Phase = "idle" | "recording" | "saving" | "done" | "error";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = r.result;
      if (typeof s !== "string") {
        reject(new Error("Could not read audio"));
        return;
      }
      const comma = s.indexOf(",");
      resolve(comma >= 0 ? s.slice(comma + 1) : s);
    };
    r.onerror = () => reject(new Error("Read failed"));
    r.readAsDataURL(blob);
  });
}

export function VoiceCalibrationMistral({ onVoicePromptSaved, className = "" }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [referenceBase64, setReferenceBase64] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    const existing = getStoredVoiceReferenceAudioBase64();
    if (existing) {
      setReferenceBase64(existing);
      setSaved(true);
    }
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const clearAutoStop = useCallback(() => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  }, []);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopTick();
      clearAutoStop();
      cleanupStream();
      mediaRecorderRef.current?.stop();
    };
  }, [cleanupStream, clearAutoStop, stopTick]);

  const pickMime = (): string | undefined => {
    if (typeof MediaRecorder === "undefined") return undefined;
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return undefined;
  };

  const startRecording = async () => {
    setError(null);
    setSaved(false);
    setReferenceBase64(null);
    stoppedRef.current = false;
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onerror = () => {
        setError("Recording error");
        setPhase("error");
        cleanupStream();
      };

      rec.start(100);
      setPhase("recording");
      startTimeRef.current = Date.now();
      setElapsedMs(0);
      stopTick();
      tickRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 100);

      clearAutoStop();
      autoStopRef.current = setTimeout(() => {
        stopRecording();
      }, VOICE_PROMPT_MS);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Microphone access denied");
      setPhase("error");
    }
  };

  const stopRecording = () => {
    if (stoppedRef.current) return;
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === "inactive") return;

    stoppedRef.current = true;
    clearAutoStop();
    stopTick();

    const durationMs = Date.now() - startTimeRef.current;
    if (durationMs < 500) {
      cleanupStream();
      mediaRecorderRef.current = null;
      setError("Too short — keep recording toward the 3s mark.");
      setPhase("error");
      return;
    }

    rec.onstop = () => {
      cleanupStream();
      mediaRecorderRef.current = null;
      const mime = rec.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mime });
      chunksRef.current = [];

      if (blob.size < 200) {
        setError("Clip too small — try again.");
        setPhase("error");
        return;
      }

      void savePrompt(blob);
    };

    rec.stop();
    setPhase("idle");
  };

  const savePrompt = async (blob: Blob) => {
    setPhase("saving");
    setError(null);
    try {
      const b64 = await blobToBase64(blob);
      setReferenceBase64(b64);
      setStoredVoiceReferenceAudioBase64(b64);
      setSaved(true);
      setPhase("done");
      onVoicePromptSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save voice prompt");
      setPhase("error");
    }
  };

  const fmtTime = (ms: number) => {
    const s = Math.min(ms / 1000, VOICE_PROMPT_MS / 1000);
    return `${s.toFixed(1)}s`;
  };

  return (
    <div className={`flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left ${className}`}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">Mistral voice prompt</p>
      <p className="max-h-28 overflow-y-auto text-[11px] leading-relaxed text-white/70">
        {VOICE_CALIBRATION_MISTRAL_SCRIPT}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {phase !== "recording" && phase !== "saving" ? (
          <button
            type="button"
            onClick={() => void startRecording()}
            className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/90 transition hover:bg-white/15"
          >
            {saved ? "Record again" : "Record 3s prompt"}
          </button>
        ) : null}

        {phase === "recording" ? (
          <>
            <span className="font-mono text-[11px] text-emerald-400/90">
              {fmtTime(elapsedMs)} / {(VOICE_PROMPT_MS / 1000).toFixed(0)}s
            </span>
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-[11px] font-medium text-red-200 transition hover:bg-red-500/25"
            >
              Stop early
            </button>
          </>
        ) : null}

        {phase === "saving" ? <span className="text-[11px] text-white/50">Saving…</span> : null}

        {phase === "done" && saved && referenceBase64 ? (
          <span className="text-[11px] text-emerald-400/90">
            Voice prompt saved — enable “My voice” for Mistral Voxtral TTS.
          </span>
        ) : null}
      </div>

      {error ? <p className="text-[11px] text-red-400/90">{error}</p> : null}
    </div>
  );
}
