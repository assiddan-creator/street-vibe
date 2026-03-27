/**
 * MiniMax / Replicate-only: nudge speed & pitch from onboarding age & gender.
 * Other engines must not import this.
 */
export function applyMinimaxAgeGenderAdjustments(params: {
  speed: number;
  pitch: number;
  age?: string;
  gender?: string;
}): { speed: number; pitch: number } {
  let { speed, pitch } = params;
  const age = params.age;
  const gender = params.gender;

  if (age === "13-17") {
    speed += 0.04;
    pitch += 0.5;
  } else if (age === "25-34") {
    speed -= 0.03;
    pitch -= 0.25;
  } else if (age === "35+") {
    speed -= 0.06;
    pitch -= 0.75;
  }

  if (gender === "woman") pitch += 0.5;
  else if (gender === "man") pitch -= 0.5;

  speed = Math.min(1.35, Math.max(0.5, speed));
  pitch = Math.min(5, Math.max(-5, Math.round(pitch * 2) / 2));
  return { speed, pitch };
}
