/**
 * Short, casual phrases a first-time user can tap to try the app instantly.
 * Keyed by the primary subtag of the input (source) language; English is the fallback.
 */
export const EXAMPLE_INPUTS: Record<string, string[]> = {
  he: ["אחי בוא נצא הערב", "מגיע עוד חצי שעה", "לא מאמין שפספסת את זה"],
  en: ["bro let's link up tonight", "running 10 mins late, my bad", "this weather is unreal"],
  ru: ["бро, давай сегодня выйдем", "опоздаю минут на 10", "не верю, что ты это пропустил"],
  ar: ["يلا نطلع الليلة", "هوصل بعد نص ساعة", "مش مصدق إنك فوّتّها"],
  es: ["tío, salimos esta noche", "llego en media hora", "no me creo que te lo perdieras"],
};

export function exampleInputsFor(bcp47: string | undefined): string[] {
  const base = (bcp47 || "en").split("-")[0].toLowerCase();
  return EXAMPLE_INPUTS[base] ?? EXAMPLE_INPUTS.en;
}
