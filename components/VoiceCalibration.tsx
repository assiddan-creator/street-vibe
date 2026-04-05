"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { setStoredCustomVoiceId } from "@/lib/customVoicePreference";

/** ~60s at moderate pace — user can stop early after ~45s if needed. */
export const VOICE_CALIBRATION_SCRIPT = `Take your time and read this out loud in a natural voice, as if you were leaving a voice note to a friend. Keep a steady rhythm for about one minute.

I'm calibrating Street Vibe so the app can match how I actually sound. This is a neutral sample: some days I'm low‑energy, some days I'm animated, but it's still me. I mix casual phrasing with clear sentences. I might pause, breathe, or rephrase — that's normal speech, not a script.

I'll describe a simple scene so the tone stays varied. Imagine walking through your neighborhood at dusk: shop lights, traffic hum, someone laughing in the distance. You're not performing for a crowd; you're just talking. If you stumble on a word, keep going. Consistency matters more than perfection.

When you're done reading, stop the recording. Thank you — that sample helps the voice model learn your cadence, not just your accent.`;

type Props = {
  /** Called after clone succeeds and id is stored in localStorage. */
  onCalibrated?: (voiceId: string) => void;
  className?: string;
};

type Phase = "idle" | "recording" | "uploading" | "done" | "error";

export function VoiceCalibration({ onCalibrated, className = "" }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopTick();
      cleanupStream();
      mediaRecorderRef.current?.stop();
    };
  }, [cleanupStream, stopTick]);

  const pickMime = (): string | undefined => {
    if (typeof MediaRecorder === "undefined") return undefined;
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return undefined;
  };

  const startRecording = async () => {
    setError(null);
    setVoiceId(null);
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

      rec.start(250);
      setPhase("recording");
      startTimeRef.current = Date.now();
      setElapsedMs(0);
      stopTick();
      tickRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Microphone access denied");
      setPhase("error");
    }
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === "inactive") return;

    stopTick();

    rec.onstop = () => {
      cleanupStream();
      mediaRecorderRef.current = null;
      const mime = rec.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mime });
      chunksRef.current = [];

      if (blob.size < 8000) {
        setError("Recording too short — speak for at least a few seconds.");
        setPhase("error");
        return;
      }

      void uploadBlob(blob);
    };

    rec.stop();
    setPhase("idle");
  };

  const uploadBlob = async (blob: Blob) => {
    setPhase("uploading");
    setError(null);
    try {
      const fd = new FormData();
      const ext = blob.type.includes("webm")
        ? "webm"
        : blob.type.includes("mp4")
          ? "m4a"
          : blob.type.includes("ogg")
            ? "ogg"
            : "webm";
      fd.append("file", blob, `calibration.${ext}`);
      fd.append("name", `streetvibe-user-${Date.now()}`);

      const res = await fetch("/api/voice/clone", { method: "POST", body: fd });
      const data = (await res.json()) as { voice_id?: string; error?: string; details?: string };

      if (!res.ok || !data.voice_id) {
        const msg = data.error || data.details || "Clone failed";
        throw new Error(typeof msg === "string" ? msg : "Clone failed");
      }

      setStoredCustomVoiceId(data.voice_id);
      setVoiceId(data.voice_id);
      setPhase("done");
      onCalibrated?.(data.voice_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setPhase("error");
    }
  };

  const fmtTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left ${className}`}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">Voice calibration</p>
      <p className="max-h-32 overflow-y-auto text-[11px] leading-relaxed text-white/70">{VOICE_CALIBRATION_SCRIPT}</p>

      <div className="flex flex-wrap items-center gap-2">
        {phase !== "recording" && phase !== "uploading" ? (
          <button
            type="button"
            onClick={() => void startRecording()}
            className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/90 transition hover:bg-white/15"
          >
            {voiceId ? "Record again" : "Start recording"}
          </button>
        ) : null}

        {phase === "recording" ? (
          <>
            <span className="font-mono text-[11px] text-emerald-400/90">{fmtTime(elapsedMs)}</span>
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-[11px] font-medium text-red-200 transition hover:bg-red-500/25"
            >
              Stop & upload
            </button>
          </>
        ) : null}

        {phase === "uploading" ? (
          <span className="text-[11px] text-white/50">Uploading sample…</span>
        ) : null}

        {phase === "done" && voiceId ? (
          <span className="text-[11px] text-emerald-400/90">Saved — your cloned voice is ready.</span>
        ) : null}
      </div>

      {error ? <p className="text-[11px] text-red-400/90">{error}</p> : null}
    </div>
  );
}
