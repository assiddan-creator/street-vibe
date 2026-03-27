/** MiniMax `language_boost` per dialect — must match `app/api/tts/route.ts`. */
export const MINIMAX_LANGUAGE_BOOST_MAP: Record<string, string> = {
  "London Roadman": "English",
  "Jamaican Patois": "English",
  "New York Brooklyn": "English",
  "Tokyo Gyaru": "Japanese",
  "Paris Banlieue": "French",
  "Russian Street": "Russian",
  "Mexico City Barrio": "Spanish",
  "Rio Favela": "Portuguese",
  "Israeli Street": "Hebrew",
};

export function resolveMinimaxLanguageBoost(dialect: string): string {
  return MINIMAX_LANGUAGE_BOOST_MAP[dialect] ?? "Automatic";
}
