"use client";

import { useEffect, useRef, useState } from "react";
import { canShareAudio, downloadAudio, prepareAudioFile } from "@/lib/audioShare";
import { TtsRequestError, ttsFailureMessage } from "@/lib/ttsErrors";

/** Mounted per result/voice so a late preparation can never share a different result. */
export function AudioShareButton({ prepare, city, disabled, onPreparing }: {
  prepare: () => Promise<string | null>;
  city: string;
  disabled: boolean;
  onPreparing: (value: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);
  const locked = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; onPreparing(false); };
  }, [onPreparing]);

  const act = async () => {
    if (locked.current || disabled) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      if (!file) {
        onPreparing(true);
        const url = await prepare();
        if (!active.current) return;
        if (!url) throw new Error("The basic browser voice cannot be shared. Choose a generated voice.");
        const ready = await prepareAudioFile(url, city);
        if (active.current) setFile(ready);
        // A second click preserves user activation for the native share sheet.
      } else if (canShareAudio(file)) {
        await navigator.share({ files: [file] });
      } else {
        downloadAudio(file);
      }
    } catch (e) {
      if (active.current && !(e instanceof Error && e.name === "AbortError")) {
        setError(file ? "Couldn't share the audio. Try again or download the file." : e instanceof TtsRequestError ? ttsFailureMessage(e) : "Couldn't prepare the audio file. Please try again.");
      }
    } finally {
      locked.current = false;
      if (active.current) { setBusy(false); onPreparing(false); }
    }
  };

  return <div className="mt-2 flex flex-col gap-2">
    <button type="button" onClick={() => void act()} disabled={disabled || busy}
      className="rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-sm font-medium text-white disabled:opacity-45">
      {busy ? "Preparing / sharing audio…" : file ? canShareAudio(file) ? "Share audio" : "Download audio" : "Prepare audio to share"}
    </button>
    {file ? <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-white/70">
      <span role="status">Audio ready.</span>
      <button type="button" disabled={busy} onClick={() => downloadAudio(file)} className="underline disabled:opacity-45">Save audio file</button>
    </div> : <p className="text-center text-xs text-white/60">Uses your selected voice. Creating new audio may use your voice allowance.</p>}
    {error ? <p role="alert" className="text-center text-xs text-red-400">{error}</p> : null}
  </div>;
}
