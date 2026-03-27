"use client";

import { useCallback, useState } from "react";
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

type Step = 0 | 1 | 2;

type Props = {
  onComplete: () => void;
};

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [vibe, setVibe] = useState<OnboardingVibe | null>(null);
  const [age, setAge] = useState<OnboardingAge | null>(null);
  const [gender, setGender] = useState<OnboardingGender | null>(null);

  const goNext = useCallback(() => {
    if (step === 0 && vibe) setStep(1);
    else if (step === 1 && age) setStep(2);
    else if (step === 2 && gender) {
      saveOnboardingAnswers({ vibe: vibe!, age: age!, gender: gender! });
      onComplete();
    }
  }, [step, vibe, age, gender, onComplete]);

  const goBack = useCallback(() => {
    if (step > 0) setStep((s) => (s - 1) as Step);
  }, []);

  const canNext =
    (step === 0 && vibe !== null) || (step === 1 && age !== null) || (step === 2 && gender !== null);

  const titles = ["What’s your target vibe?", "How old are you?", "How do you identify?"];
  const subtitles = [
    "We’ll tune translations to match your style.",
    "Helps us keep tone age-appropriate.",
    "Optional — used only to personalize voice & copy.",
  ];

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[#0a0a0a] px-4 pb-8 pt-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(74, 222, 128, 0.35), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(59, 130, 246, 0.12), transparent)",
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[min(100%,400px)] flex-1 flex-col">
        <header className="mb-8 text-center">
          <p
            className="mb-1 text-2xl text-white"
            style={{ fontFamily: "'Permanent Marker', cursive", textShadow: `0 0 24px ${ACCENT}44` }}
          >
            StreetVibe
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Quick setup</p>
        </header>

        <div className="mb-6 flex justify-center gap-2" role="status" aria-label={`Step ${step + 1} of 3`}>
          {([0, 1, 2] as const).map((i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{
                width: step === i ? 28 : 8,
                backgroundColor: step >= i ? ACCENT : "rgba(255,255,255,0.12)",
                opacity: step >= i ? 1 : 0.5,
              }}
            />
          ))}
        </div>

        <div key={step} className="onboarding-step-enter flex flex-1 flex-col">
          <h1 className="mb-1 text-center text-lg font-semibold tracking-tight text-white">{titles[step]}</h1>
          <p className="mb-6 text-center text-[13px] leading-relaxed text-white/45">{subtitles[step]}</p>

          <div className="flex flex-1 flex-col gap-2">
            {step === 0 &&
              VIBE_OPTIONS.map((opt) => {
                const on = vibe === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVibe(opt.value)}
                    aria-pressed={on}
                    className="group flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-all duration-300 active:scale-[0.98]"
                    style={{
                      borderColor: on ? `${ACCENT}88` : "rgba(255,255,255,0.08)",
                      backgroundColor: on ? `${ACCENT}14` : "rgba(0,0,0,0.35)",
                      boxShadow: on ? `0 0 20px ${ACCENT}22` : undefined,
                    }}
                  >
                    <span className="text-[15px] font-semibold text-white">{opt.label}</span>
                    <span className="text-[12px] text-white/40 transition-colors group-hover:text-white/55">
                      {opt.hint}
                    </span>
                  </button>
                );
              })}

            {step === 1 &&
              AGE_OPTIONS.map((opt) => {
                const on = age === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAge(opt.value)}
                    aria-pressed={on}
                    className="rounded-xl border px-4 py-3.5 text-center text-[15px] font-semibold transition-all duration-300 active:scale-[0.98]"
                    style={{
                      borderColor: on ? `${ACCENT}88` : "rgba(255,255,255,0.08)",
                      backgroundColor: on ? `${ACCENT}14` : "rgba(0,0,0,0.35)",
                      color: on ? ACCENT : "rgba(255,255,255,0.85)",
                      boxShadow: on ? `0 0 20px ${ACCENT}22` : undefined,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}

            {step === 2 &&
              GENDER_OPTIONS.map((opt) => {
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
                      color: on ? ACCENT : "rgba(255,255,255,0.85)",
                      boxShadow: on ? `0 0 20px ${ACCENT}22` : undefined,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/10"
            >
              Back
            </button>
          ) : (
            <div className="w-[88px] shrink-0" aria-hidden />
          )}
          <button
            type="button"
            disabled={!canNext}
            onClick={goNext}
            className="min-w-0 flex-1 rounded-xl py-3.5 text-sm font-bold text-black transition-all duration-300 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: canNext ? `linear-gradient(135deg, ${ACCENT}, #22c55e)` : "rgba(255,255,255,0.15)",
              color: canNext ? "#0a0a0a" : "rgba(255,255,255,0.35)",
              boxShadow: canNext ? `0 4px 24px ${ACCENT}44` : undefined,
            }}
          >
            {step === 2 ? "Enter StreetVibe" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
