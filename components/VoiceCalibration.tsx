"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { setStoredVoiceReferenceAudioBase64 } from "@/lib/customVoicePreference";

const MAX_RECORD_MS = 3000;

/** Short emotional prompt — model needs ~2–3s for zero-shot cloning. */
export const VOICE_CALIBRATION_SCRIPT = `Record about three seconds in the emotional tone you want Street Vibe to copy — hyped, soft, deadpan, or warm. Stay close to the mic, one clear voice, minimal background noise. Say anything that feels natural; how it sounds matters more than the words.`;

type Props = {
  /** Fires after the clip is saved to localStorage (base64). */
  onCalibrated?: () => void;
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

export function VoiceCalibration({ onCalibrated, className = "" }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(0);
  const stoppedRef = useRef(false);

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
      }, MAX_RECORD_MS);
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
    if (durationMs < 400) {
      cleanupStream();
      mediaRecorderRef.current = null;
      setError("Too short — hold a few seconds with clear emotion.");
      setPhase("error");
      return;
    }

    rec.onstop = () => {
      cleanupStream();
      mediaRecorderRef.current = null;
      const mime = rec.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mime });
      chunksRef.current = [];

      if (blob.size < 400) {
        setError("Clip too small — try again with a louder take.");
        setPhase("error");
        return;
      }

      void saveLocal(blob);
    };

    rec.stop();
    setPhase("idle");
  };

  const saveLocal = async (blob: Blob) => {
    setPhase("saving");
    setError(null);
    try {
      const b64 = await blobToBase64(blob);
      setStoredVoiceReferenceAudioBase64(b64);
      setSaved(true);
      setPhase("done");
      onCalibrated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save clip");
      setPhase("error");
    }
  };

  const fmtTime = (ms: number) => {
    const s = Math.min(ms / 1000, MAX_RECORD_MS / 1000);
    return `${s.toFixed(1)}s`;
  };

  return (
    <div className={`flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left ${className}`}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">Voice calibration</p>
      <p className="max-h-28 overflow-y-auto text-[11px] leading-relaxed text-white/70">{VOICE_CALIBRATION_SCRIPT}</p>

      <div className="flex flex-wrap items-center gap-2">
        {phase !== "recording" && phase !== "saving" ? (
          <button
            type="button"
            onClick={() => void startRecording()}
            className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/90 transition hover:bg-white/15"
          >
            {saved ? "Record again" : "Start recording"}
          </button>
        ) : null}

        {phase === "recording" ? (
          <>
            <span className="font-mono text-[11px] text-emerald-400/90">
              {fmtTime(elapsedMs)} / {(MAX_RECORD_MS / 1000).toFixed(0)}s
            </span>
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-[11px] font-medium text-red-200 transition hover:bg-red-500/25"
            >
              Stop
            </button>
          </>
        ) : null}

        {phase === "saving" ? <span className="text-[11px] text-white/50">Saving…</span> : null}

        {phase === "done" && saved ? (
          <span className="text-[11px] text-emerald-400/90">Saved locally — use “My voice” to hear it in TTS.</span>
        ) : null}
      </div>

      {error ? <p className="text-[11px] text-red-400/90">{error}</p> : null}
    </div>
  );
}
