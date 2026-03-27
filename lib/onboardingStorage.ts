const STORAGE_KEY = "streetvibe_onboarding_v1";

export type OnboardingVibe = "street" | "chill" | "bold" | "playful" | "global";
export type OnboardingAge = "13-17" | "18-24" | "25-34" | "35+";
export type OnboardingGender = "woman" | "man" | "non-binary" | "prefer-not";

export type OnboardingAnswers = {
  vibe: OnboardingVibe;
  age: OnboardingAge;
  gender: OnboardingGender;
  completedAt: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidAnswers(data: unknown): data is OnboardingAnswers {
  if (!isRecord(data)) return false;
  const vibes: OnboardingVibe[] = ["street", "chill", "bold", "playful", "global"];
  const ages: OnboardingAge[] = ["13-17", "18-24", "25-34", "35+"];
  const genders: OnboardingGender[] = ["woman", "man", "non-binary", "prefer-not"];
  return (
    typeof data.completedAt === "string" &&
    vibes.includes(data.vibe as OnboardingVibe) &&
    ages.includes(data.age as OnboardingAge) &&
    genders.includes(data.gender as OnboardingGender)
  );
}

export function hasOnboardingAnswers(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as unknown;
    return isValidAnswers(parsed);
  } catch {
    return false;
  }
}

export function getOnboardingAnswers(): OnboardingAnswers | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isValidAnswers(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveOnboardingAnswers(answers: Omit<OnboardingAnswers, "completedAt">): void {
  if (typeof window === "undefined") return;
  const payload: OnboardingAnswers = {
    ...answers,
    completedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
