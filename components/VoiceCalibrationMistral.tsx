"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TtsClientEngine } from "@/lib/ttsClient";
import {
  getMistralQuickPromptBase64,
  getMistralVoiceId,
  setMistralQuickPromptBase64,
  setMistralVoiceId,
} from "@/lib/customVoicePreference";

/** Target range for a stable Mistral Voice Profile (docs: longer clean samples help cross-lingual cloning). */
const MIN_PROFILE_MS = 30_000;
const MAX_PROFILE_MS = 60_000;

/** Fast zero-shot reference (Mistral docs: ~3–25s; product uses 5s). */
const QUICK_MS = 5_000;

export const VOICE_CALIBRATION_MISTRAL_SCRIPT = `Record 30–60 seconds of clear, expressive speech in a quiet space. Read naturally — varied sentences help the model lock your timbre and rhythm for stable cross-lingual TTS. Stop when you’re done, or recording ends automatically at ${MAX_PROFILE_MS / 1000} seconds.`;

const QUICK_SCRIPT = `Record exactly ${QUICK_MS / 1000} seconds of clear speech in a quiet space. Recording stops automatically — this clip is used only for fast zero-shot cloning (engine: Mistral Quick Clone).`;

type Props = {
  /** Drives 5s quick vs 30–60s persistent profile UI. */
  ttsEngine: TtsClientEngine;
  onVoiceProfileSaved?: () => void;
  className?: string;
};

type Phase = "idle" | "recording" | "uploading" | "done" | "error";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const d = r.result as string;
      const i = d.indexOf(",");
      resolve(i >= 0 ? d.slice(i + 1) : d);
    };
    r.onerror = () => reject(new Error("Could not read audio"));
    r.readAsDataURL(blob);
  });
}

export function VoiceCalibrationMistral({ ttsEngine, onVoiceProfileSaved, className = "" }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [voiceId, setVoiceIdState] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(0);
  const stoppedRef = useRef(false);

  const isBuiltin = ttsEngine === "mistral_builtin";
  const isQuick = ttsEngine === "mistral_quick";
  const isClone = ttsEngine === "mistral_clone";

  const isMistralUiEngine =
    ttsEngine === "mistral_quick" || ttsEngine === "mistral_clone" || ttsEngine === "mistral_builtin";

  useEffect(() => {
    const existing = getMistralVoiceId();
    if (existing) {
      setVoiceIdState(existing);
      setSaved(true);
    }
  }, []);

  useEffect(() => {
    if (isQuick && getMistralQuickPromptBase64()) {
      setSaved(true);
    }
  }, [isQuick, ttsEngine]);

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
    setVoiceIdState(null);
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

      rec.start(250);
      setPhase("recording");
      startTimeRef.current = Date.now();
      setElapsedMs(0);
      stopTick();
      tickRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 200);

      clearAutoStop();
      const maxMs = isQuick ? QUICK_MS : MAX_PROFILE_MS;
      autoStopRef.current = setTimeout(() => {
        if (isQuick) {
          void finalizeQuickRecording();
        } else {
          stopRecording();
        }
      }, maxMs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Microphone access denied");
      setPhase("error");
    }
  };

  const cancelRecording = () => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    clearAutoStop();
    stopTick();
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = () => {
        cleanupStream();
        mediaRecorderRef.current = null;
        chunksRef.current = [];
      };
      rec.stop();
    } else {
      cleanupStream();
    }
    setPhase("idle");
    setElapsedMs(0);
  };

  const finalizeQuickRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === "inactive") return;
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    clearAutoStop();
    stopTick();
    setPhase("uploading");

    rec.onstop = () => {
      void (async () => {
        cleanupStream();
        mediaRecorderRef.current = null;
        const mime = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];

        if (blob.size < 500) {
          setError("Clip too small — try again.");
          setPhase("error");
          return;
        }

        try {
          const b64 = await blobToBase64(blob);
          setMistralQuickPromptBase64(b64);
          setSaved(true);
          setPhase("done");
          onVoiceProfileSaved?.();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Save failed");
          setPhase("error");
        }
      })();
    };

    rec.stop();
  };

  const stopRecording = () => {
    if (stoppedRef.current) return;
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === "inactive") return;

    stoppedRef.current = true;
    clearAutoStop();
    stopTick();

    const durationMs = Date.now() - startTimeRef.current;
    if (durationMs < MIN_PROFILE_MS) {
      cleanupStream();
      mediaRecorderRef.current = null;
      setError(
        `Need at least ${MIN_PROFILE_MS / 1000}s of sample audio for a voice profile — keep going (${Math.ceil((MIN_PROFILE_MS - durationMs) / 1000)}s left).`
      );
      setPhase("error");
      return;
    }

    rec.onstop = () => {
      cleanupStream();
      mediaRecorderRef.current = null;
      const mime = rec.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mime });
      chunksRef.current = [];

      if (blob.size < 2000) {
        setError("Clip too small — try again with a louder take.");
        setPhase("error");
        return;
      }

      void uploadProfile(blob);
    };

    rec.stop();
    setPhase("idle");
  };

  const uploadProfile = async (blob: Blob) => {
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
      fd.append("file", blob, `voice-profile.${ext}`);
      fd.append("name", `streetvibe-profile-${Date.now()}`);

      const res = await fetch("/api/mistral-voice-profile", { method: "POST", body: fd });
      const data = (await res.json()) as { voice_id?: string; error?: string; details?: string };

      if (!res.ok || !data.voice_id) {
        const msg = data.error || data.details || "Voice profile creation failed";
        throw new Error(typeof msg === "string" ? msg : "Voice profile failed");
      }

      setMistralVoiceId(data.voice_id);
      setVoiceIdState(data.voice_id);
      setSaved(true);
      setPhase("done");
      onVoiceProfileSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setPhase("error");
    }
  };

  const fmtTime = (ms: number, capMs: number) => {
    const totalS = Math.floor(Math.min(ms / 1000, capMs / 1000));
    const m = Math.floor(totalS / 60);
    const s = totalS % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!isMistralUiEngine) {
    return null;
  }

  if (isBuiltin) {
    return (
      <div
        className={`flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left ${className}`}
      >
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">Mistral voice profile</p>
        <p className="text-[11px] leading-relaxed text-white/55">
          Built-in mode uses preset character voices — no microphone sample needed. Switch to Clone or Quick to record a
          sample.
        </p>
      </div>
    );
  }

  const scriptText = isQuick ? QUICK_SCRIPT : VOICE_CALIBRATION_MISTRAL_SCRIPT;
  const title = isQuick ? "Mistral quick clone (5s)" : "Mistral voice profile";

  return (
    <div className={`flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left ${className}`}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">{title}</p>
      <p className="max-h-32 overflow-y-auto text-[11px] leading-relaxed text-white/70">{scriptText}</p>

      <div className="flex flex-wrap items-center gap-2">
        {phase !== "recording" && phase !== "uploading" ? (
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
              {isQuick
                ? `${fmtTime(elapsedMs, QUICK_MS)} / ${QUICK_MS / 1000}s`
                : `${fmtTime(elapsedMs, MAX_PROFILE_MS)} / ${MAX_PROFILE_MS / 1000}s max`}
            </span>
            {isQuick ? (
              <button
                type="button"
                onClick={cancelRecording}
                className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/70 transition hover:bg-white/10"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                disabled={elapsedMs < MIN_PROFILE_MS}
                className="rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-[11px] font-medium text-red-200 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-35"
                title={
                  elapsedMs < MIN_PROFILE_MS
                    ? `Stop unlocks after ${MIN_PROFILE_MS / 1000}s`
                    : "Finish and upload"
                }
              >
                Stop &amp; upload
              </button>
            )}
          </>
        ) : null}

        {phase === "uploading" ? (
          <span className="text-[11px] text-white/50">
            {isQuick ? "Saving quick clip…" : "Creating voice profile…"}
          </span>
        ) : null}

        {phase === "done" && saved && isClone && voiceId ? (
          <span className="text-[11px] text-emerald-400/90">
            Profile saved — choose “Mistral Clone (My Voice)” in Voice engine to hear it.
          </span>
        ) : null}
        {phase === "done" && saved && isQuick ? (
          <span className="text-[11px] text-emerald-400/90">
            Quick clip saved — choose “Mistral Quick Clone (5s Vibe)” in Voice engine to hear it.
          </span>
        ) : null}
      </div>

      {error ? <p className="text-[11px] text-red-400/90">{error}</p> : null}
    </div>
  );
}
