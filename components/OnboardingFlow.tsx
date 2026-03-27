"use client";

import { useMemo, useState } from "react";
import {
  type OnboardingAge,
  type OnboardingGender,
  type OnboardingVibe,
  saveOnboardingAnswers,
} from "@/lib/onboardingStorage";

const ACCENT = "#4ade80";

const VIBE_OPTIONS: { value: OnboardingVibe; label: string; hint: string }[] = [
  { value: "street", label: "Street", hint: "Raw slang & real talk" },
  { value: "chill", label: "Chill", hint: "Laid-back & smooth" },
  { value: "bold", label: "Bold", hint: "High energy & confident" },
  { value: "playful", label: "Playful", hint: "Witty & fun" },
  { value: "global", label: "Global mix", hint: "Blend of cultures" },
];

const AGE_OPTIONS: { value: OnboardingAge; label: string }[] = [
  { value: "13-17", label: "13–17" },
  { value: "18-24", label: "18–24" },
  { value: "25-34", label: "25–34" },
  { value: "35+", label: "35+" },
];

const GENDER_OPTIONS: { value: OnboardingGender; label: string }[] = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not", label: "Prefer not to say" },
];

type Props = {
  onComplete: () => void;
};

export function OnboardingFlow({ onComplete }: Props) {
  const [vibe, setVibe] = useState<OnboardingVibe | null>(null);
  const [age, setAge] = useState<OnboardingAge | null>(null);
  const [gender, setGender] = useState<OnboardingGender | null>(null);

  const canSubmit = useMemo(() => vibe !== null && age !== null && gender !== null, [vibe, age, gender]);

  const handleSubmit = () => {
    if (!canSubmit || !vibe || !age || !gender) return;
    saveOnboardingAnswers({ vibe, age, gender });
    onComplete();
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-y-auto bg-[#0a0a0a] px-4 pb-10 pt-8">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.12]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(74, 222, 128, 0.35), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(59, 130, 246, 0.12), transparent)",
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto w-full max-w-[min(100%,420px)] pb-4">
        <header className="mb-8 text-center">
          <p
            className="mb-1 text-2xl text-white"
            style={{ fontFamily: "'Permanent Marker', cursive", textShadow: `0 0 24px ${ACCENT}44` }}
          >
            StreetVibe
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Tune your experience</p>
        </header>

        <div className="onboarding-step-enter space-y-8">
          <section>
            <h2 className="mb-1 text-base font-semibold tracking-tight text-white">Target vibe</h2>
            <p className="mb-3 text-[13px] text-white/45">How should translations feel?</p>
            <div className="flex flex-col gap-2">
              {VIBE_OPTIONS.map((opt) => {
                const on = vibe === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVibe(opt.value)}
                    aria-pressed={on}
                    className="group flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-all duration-300 active:scale-[0.99]"
                    style={{
                      borderColor: on ? `${ACCENT}88` : "rgba(255,255,255,0.08)",
                      backgroundColor: on ? `${ACCENT}14` : "rgba(0,0,0,0.35)",
                      boxShadow: on ? `0 0 20px ${ACCENT}22` : undefined,
                    }}
                  >
                    <span className="text-[15px] font-semibold text-white">{opt.label}</span>
                    <span className="text-[12px] text-white/40">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-1 text-base font-semibold tracking-tight text-white">Age</h2>
            <p className="mb-3 text-[13px] text-white/45">Helps keep tone age-appropriate.</p>
            <div className="grid grid-cols-2 gap-2">
              {AGE_OPTIONS.map((opt) => {
                const on = age === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAge(opt.value)}
                    aria-pressed={on}
                    className="rounded-xl border px-3 py-3.5 text-center text-[14px] font-semibold transition-all duration-300 active:scale-[0.98]"
                    style={{
                      borderColor: on ? `${ACCENT}88` : "rgba(255,255,255,0.08)",
                      backgroundColor: on ? `${ACCENT}14` : "rgba(0,0,0,0.35)",
                      color: on ? ACCENT : "rgba(255,255,255,0.88)",
                      boxShadow: on ? `0 0 16px ${ACCENT}18` : undefined,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-1 text-base font-semibold tracking-tight text-white">Gender</h2>
            <p className="mb-3 text-[13px] text-white/45">Personalizes voice & phrasing. Optional to share.</p>
            <div className="flex flex-col gap-2">
              {GENDER_OPTIONS.map((opt) => {
                const on = gender === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGender(opt.value)}
                    aria-pressed={on}
                    className="rounded-xl border px-4 py-3.5 text-center text-[15px] font-semibold transition-all duration-300 active:scale-[0.98]"
                    style={{
                      borderColor: on ? `${ACCENT}88` : "rgba(255,255,255,0.08)",
                      backgroundColor: on ? `${ACCENT}14` : "rgba(0,0,0,0.35)",
                      color: on ? ACCENT : "rgba(255,255,255,0.88)",
                      boxShadow: on ? `0 0 20px ${ACCENT}22` : undefined,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="sticky bottom-0 z-20 mt-10 w-full rounded-xl py-3.5 text-sm font-bold transition-all duration-300 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: canSubmit ? `linear-gradient(135deg, ${ACCENT}, #22c55e)` : "rgba(255,255,255,0.12)",
            color: canSubmit ? "#0a0a0a" : "rgba(255,255,255,0.35)",
            boxShadow: canSubmit ? `0 4px 28px ${ACCENT}44` : undefined,
          }}
        >
          Enter StreetVibe
        </button>
      </div>
    </div>
  );
}
