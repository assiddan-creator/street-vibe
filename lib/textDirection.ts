/**
 * Direction of a text the way `dir="auto"` resolves it: the first strong (letter) character wins.
 * Hebrew / Arabic-script letters -> "rtl"; any other letter -> "ltr"; no letters -> "ltr".
 */
export function textDirection(text: string): "rtl" | "ltr" {
  const first = text.match(/\p{L}/u)?.[0];
  if (!first) return "ltr";
  return /[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}]/u.test(first) ? "rtl" : "ltr";
}
