import type { OnboardingAge, OnboardingGender } from "@/lib/onboardingStorage";

const AGES: OnboardingAge[] = ["13-17", "18-24", "25-34", "35+"];
const GENDERS: OnboardingGender[] = ["woman", "man", "non-binary", "prefer-not"];

/** Server-side: only allow known enum values; ignore anything else. */
export function parseOnboardingAge(v: unknown): OnboardingAge | undefined {
  return typeof v === "string" && AGES.includes(v as OnboardingAge) ? (v as OnboardingAge) : undefined;
}

export function parseOnboardingGender(v: unknown): OnboardingGender | undefined {
  return typeof v === "string" && GENDERS.includes(v as OnboardingGender) ? (v as OnboardingGender) : undefined;
}
