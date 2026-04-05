"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getStoredCustomVoiceId,
  getUseClonedVoicePreference,
  setUseClonedVoicePreference,
} from "@/lib/customVoicePreference";

type Props = {
  accent: string;
  /** Increment when a new voice id is stored so “has sample” updates in-session. */
  voiceRefreshSignal?: number;
  className?: string;
};

export function VoiceModeToggle({ accent, voiceRefreshSignal = 0, className = "" }: Props) {
  const [useCloned, setUseCloned] = useState(false);
  const [hasVoiceId, setHasVoiceId] = useState(false);

  const refresh = useCallback(() => {
    setUseCloned(getUseClonedVoicePreference());
    setHasVoiceId(Boolean(getStoredCustomVoiceId()));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, voiceRefreshSignal]);

  const toggle = (next: boolean) => {
    setUseClonedVoicePreference(next);
    setUseCloned(next);
  };

  return (
    <div
      className={`flex w-full flex-col gap-1 rounded-lg border border-white/[0.06] bg-white/[0.04] px-2 py-1.5 ${className}`}
    >
      <p className="text-[8px] font-medium uppercase tracking-wider text-white/40">TTS voice</p>
      <div
        className="flex rounded-full border border-white/10 bg-black/20 p-0.5"
        role="group"
        aria-label="Text-to-speech voice source"
      >
        <button
          type="button"
          onClick={() => toggle(false)}
          className={`flex-1 rounded-full px-2 py-1 text-[9px] font-medium transition ${
            !useCloned ? "text-white" : "text-white/45 hover:text-white/65"
          }`}
          style={
            !useCloned
              ? {
                  backgroundColor: `${accent}28`,
                  boxShadow: `inset 0 1px 0 ${accent}44`,
                }
              : undefined
          }
        >
          Standard
        </button>
        <button
          type="button"
          onClick={() => toggle(true)}
          className={`flex-1 rounded-full px-2 py-1 text-[9px] font-medium transition ${
            useCloned ? "text-white" : "text-white/45 hover:text-white/65"
          }`}
          style={
            useCloned
              ? {
                  backgroundColor: `${accent}28`,
                  boxShadow: `inset 0 1px 0 ${accent}44`,
                }
              : undefined
          }
        >
          My voice
        </button>
      </div>
      {useCloned && !hasVoiceId ? (
        <p className="text-[8px] leading-snug text-amber-400/80">Record a sample below to enable cloning.</p>
      ) : null}
    </div>
  );
}
