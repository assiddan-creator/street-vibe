import { STREETVIBE_DIALECT_REGISTRY, type StreetVibeDialectId } from "@/lib/dialectRegistry";

/** MiniMax `language_boost` per dialect — must match `app/api/tts/route.ts`. */
export const MINIMAX_LANGUAGE_BOOST_MAP: Record<string, string> = {
  ...Object.fromEntries(
    (Object.keys(STREETVIBE_DIALECT_REGISTRY) as StreetVibeDialectId[]).map((id) => [
      id,
      STREETVIBE_DIALECT_REGISTRY[id].minimax.languageBoost,
    ])
  ),
};

export function resolveMinimaxLanguageBoost(dialect: string): string {
  return MINIMAX_LANGUAGE_BOOST_MAP[dialect] ?? "Automatic";
}
