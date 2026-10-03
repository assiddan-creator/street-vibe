/**
 * Numbers written the way they are said, for TTS only (display text never changes).
 *
 * Conservative by design: only clear money amounts, clock times and small
 * standalone counts. Anything that could be a phone number, code, year, price
 * with cents, range, version or ID is left exactly as written:
 *  - integers only, 0–9999, no leading zero (except "0" itself);
 *  - not touching another digit or any of + - / . : # @ (so 054-1234567,
 *    +44 20…, 24/7, 1.5, 3:2, #12 stay);
 *  - "$" in Mexico City is ambiguous (pesos vs dollars) and is left alone.
 *
 * Full number words: en, es, fr, pt. For he / ar / ru / ja the digits stay
 * (ElevenLabs reads digits natively and those languages inflect number words);
 * only a currency symbol becomes the currency word.
 */

type Lang = "en" | "es" | "fr" | "pt" | "he" | "ar" | "ru" | "ja";

const MAX = 9999;

// ---------------------------------------------------------------- English
const EN_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function en(n: number): string {
  if (n < 20) return EN_ONES[n];
  if (n < 100) return EN_TENS[Math.floor(n / 10)] + (n % 10 ? `-${EN_ONES[n % 10]}` : "");
  if (n < 1000) return `${EN_ONES[Math.floor(n / 100)]} hundred` + (n % 100 ? ` ${en(n % 100)}` : "");
  return `${en(Math.floor(n / 1000))} thousand` + (n % 1000 ? ` ${en(n % 1000)}` : "");
}

// ---------------------------------------------------------------- Spanish
const ES_ONES = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const ES_TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const ES_HUNDREDS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];
function es(n: number): string {
  if (n < 30) return ES_ONES[n];
  if (n < 100) return ES_TENS[Math.floor(n / 10)] + (n % 10 ? ` y ${ES_ONES[n % 10]}` : "");
  if (n === 100) return "cien";
  if (n < 1000) return ES_HUNDREDS[Math.floor(n / 100)] + (n % 100 ? ` ${es(n % 100)}` : "");
  const k = Math.floor(n / 1000);
  return (k === 1 ? "mil" : `${es(k)} mil`) + (n % 1000 ? ` ${es(n % 1000)}` : "");
}
/** Before a masculine noun: uno -> un, veintiuno -> veintiún ("veintiún euros"). */
const esBeforeNoun = (n: number) => es(n).replace(/veintiuno$/, "veintiún").replace(/(^|\s)uno$/, "$1un");

// ---------------------------------------------------------------- French
const FR_ONES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const FR_TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];
function fr(n: number): string {
  if (n < 20) return FR_ONES[n];
  if (n < 70) {
    const t = Math.floor(n / 10), u = n % 10;
    return FR_TENS[t] + (u === 1 ? " et un" : u ? `-${FR_ONES[u]}` : "");
  }
  if (n < 80) return n === 71 ? "soixante et onze" : `soixante-${FR_ONES[n - 60]}`;
  if (n < 100) return n === 80 ? "quatre-vingts" : `quatre-vingt-${FR_ONES[n - 80]}`;
  if (n < 1000) {
    const h = Math.floor(n / 100), r = n % 100;
    const head = h === 1 ? "cent" : `${FR_ONES[h]} cent${r ? "" : "s"}`;
    return head + (r ? ` ${fr(r)}` : "");
  }
  const k = Math.floor(n / 1000);
  return (k === 1 ? "mille" : `${fr(k)} mille`) + (n % 1000 ? ` ${fr(n % 1000)}` : "");
}

// ---------------------------------------------------------------- Portuguese (BR)
const PT_ONES = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const PT_TENS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const PT_HUNDREDS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
function pt(n: number): string {
  if (n < 20) return PT_ONES[n];
  if (n < 100) return PT_TENS[Math.floor(n / 10)] + (n % 10 ? ` e ${PT_ONES[n % 10]}` : "");
  if (n === 100) return "cem";
  if (n < 1000) return PT_HUNDREDS[Math.floor(n / 100)] + (n % 100 ? ` e ${pt(n % 100)}` : "");
  const k = Math.floor(n / 1000);
  const r = n % 1000;
  return (k === 1 ? "mil" : `${pt(k)} mil`) + (r ? (r < 100 || r % 100 === 0 ? ` e ${pt(r)}` : ` ${pt(r)}`) : "");
}

const WORDS: Partial<Record<Lang, (n: number) => string>> = { en, es, fr, pt };

// ---------------------------------------------------------------- helpers
/** A standalone integer: not glued to digits, letters or + - / . : # @ (phone numbers, codes, decimals, ranges). */
const SAFE_LEFT = "(?<![\\p{L}\\p{N}+\\-/.:#@,])";
const SAFE_RIGHT = "(?![\\p{N}\\-/.:#@%]|,\\d|\\p{L})";
const INT = "(0|[1-9]\\d{0,3}|[1-9]\\d?,\\d{3})"; // 0–9999, optional thousands comma
/** Japanese has no spaces: a word may follow the number directly ("¥500だよ"). */
const SAFE_RIGHT_CJK = "(?![\\p{N}\\-/.:#@%]|,\\d)";
/** Times / counts never start right after these (handles, hashtags, ranges, codes). */
const NOT_AFTER = "(?<![\\p{L}\\p{N}:@#+\\-/.,])";

/** A number after one of these words is a label (bus 73, room 12), not a count. */
const LABEL_WORDS = [
  "bus", "route", "line", "room", "gate", "platform", "flat", "apt", "apartment", "no", "number", "page", "chapter",
  "episode", "season", "level", "channel", "track", "bay", "unit", "seat", "row", "terminal", "exit", "floor", "door",
  "ruta", "línea", "linea", "sala", "puerta", "andén", "página", "capítulo", "piso", "asiento", "salida",
  "ligne", "salle", "porte", "quai", "chapitre", "étage", "siège", "sortie",
  "linha", "portão", "andar", "assento", "saída", "ônibus", "onibus",
];
const LABEL_BEFORE = new RegExp(`(?<![\\p{L}])(?:${LABEL_WORDS.join("|")})\\.?\\s+$`, "iu");

function parseInt0(raw: string): number | null {
  const n = Number(raw.replace(",", ""));
  return Number.isInteger(n) && n >= 0 && n <= MAX ? n : null;
}

function russianRubles(n: number): string {
  const d = n % 10, dd = n % 100;
  if (dd >= 11 && dd <= 14) return "рублей";
  if (d === 1) return "рубль";
  if (d >= 2 && d <= 4) return "рубля";
  return "рублей";
}

type Money = { symbol: string; spoken: (n: number) => string };

function moneyRules(lang: Lang, dialect: string | undefined): Money[] {
  switch (lang) {
    case "en": {
      const london = dialect === "London Roadman";
      const kingston = dialect === "Jamaican Patois";
      return [
        { symbol: "£", spoken: (n) => `${en(n)} quid` },
        { symbol: "€", spoken: (n) => `${en(n)} ${n === 1 ? "euro" : "euros"}` },
        { symbol: "$", spoken: (n) => (london || kingston ? `${en(n)} ${n === 1 ? "dollar" : "dollars"}` : `${en(n)} ${n === 1 ? "buck" : "bucks"}`) },
      ];
    }
    case "es": {
      const rules: Money[] = [{ symbol: "€", spoken: (n) => `${esBeforeNoun(n)} ${n === 1 ? "euro" : "euros"}` }];
      // "$" in Mexico is pesos or dollars — ambiguous, left alone. Madrid "$" = dollars.
      if (dialect !== "Mexico City Barrio") rules.push({ symbol: "$", spoken: (n) => `${esBeforeNoun(n)} ${n === 1 ? "dólar" : "dólares"}` });
      return rules;
    }
    case "fr":
      return [
        { symbol: "€", spoken: (n) => `${fr(n)} ${n === 1 ? "euro" : "euros"}` },
        { symbol: "$", spoken: (n) => `${fr(n)} ${n === 1 ? "dollar" : "dollars"}` },
      ];
    case "pt":
      return [
        { symbol: "R$", spoken: (n) => `${pt(n)} ${n === 1 ? "real" : "reais"}` },
        { symbol: "€", spoken: (n) => `${pt(n)} ${n === 1 ? "euro" : "euros"}` },
      ];
    case "he":
      return [{ symbol: "₪", spoken: (n) => `${n} שקל` }];
    case "ar":
      return [{ symbol: "E£", spoken: (n) => `${n} جنيه` }];
    case "ru":
      return [{ symbol: "₽", spoken: (n) => `${n} ${russianRubles(n)}` }];
    case "ja":
      return [{ symbol: "¥", spoken: (n) => `${n}円` }];
    default:
      return [];
  }
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function applyMoney(s: string, lang: Lang, dialect: string | undefined): string {
  // Longest symbol first so "R$" wins over "$".
  for (const m of moneyRules(lang, dialect).sort((a, b) => b.symbol.length - a.symbol.length)) {
    const sym = escapeRe(m.symbol);
    // "$20" / "€ 20" before the number, or "20€" / "20 €" after it.
    const right = lang === "ja" ? SAFE_RIGHT_CJK : SAFE_RIGHT;
    const before = new RegExp(`(?<![\\p{L}\\p{N}])${sym}\\s?${INT}${right}`, "gu");
    s = s.replace(before, (all, raw) => {
      const n = parseInt0(raw);
      return n === null ? all : m.spoken(n);
    });
    const after = new RegExp(`${SAFE_LEFT}${INT}\\s?${sym}(?![\\p{L}\\p{N}])`, "gu");
    s = s.replace(after, (all, raw) => {
      const n = parseInt0(raw);
      return n === null ? all : m.spoken(n);
    });
  }
  return s;
}

function applyTimes(s: string, lang: Lang): string {
  if (lang === "en") {
    // 8pm, 8 pm, 8:30pm, 8:30 PM -> "eight PM", "eight thirty PM"
    return s.replace(/(?<![\p{L}\p{N}:@#+\-/.])(1[0-2]|[1-9])(?::([0-5]\d))?\s?([ap])\.?m\.?(?![\p{L}\p{N}])/giu, (_a, h, m, ap) => {
      const mins = m ? (m === "00" ? "" : ` ${Number(m) < 10 ? `oh ${en(Number(m))}` : en(Number(m))}`) : "";
      return `${en(Number(h))}${mins} ${ap.toUpperCase()}M`;
    });
  }
  if (lang === "fr") {
    // 20h, 20h30 -> "vingt heures", "vingt heures trente"
    return s.replace(/(?<![\p{L}\p{N}:@#+\-/.])([01]?\d|2[0-3])h([0-5]\d)?(?![\p{L}\p{N}])/gu, (_a, h, m) => {
      const hh = Number(h);
      return `${fr(hh)} ${hh === 1 ? "heure" : "heures"}${m && m !== "00" ? ` ${fr(Number(m))}` : ""}`;
    });
  }
  if (lang === "pt") {
    return s.replace(/(?<![\p{L}\p{N}:@#+\-/.])([01]?\d|2[0-3])h([0-5]\d)?(?![\p{L}\p{N}])/gu, (_a, h, m) => {
      const hh = Number(h);
      // Hours are feminine: uma / duas, vinte e uma / vinte e duas.
      const hw = pt(hh).replace(/(^|\s)um$/, "$1uma").replace(/(^|\s)dois$/, "$1duas");
      return `${hw} ${hh === 1 ? "hora" : "horas"}${m && m !== "00" ? ` e ${pt(Number(m))}` : ""}`;
    });
  }
  if (lang === "es") {
    // 8pm / 8am -> "ocho de la noche/tarde/mañana"
    return s.replace(/(?<![\p{L}\p{N}:@#+\-/.])(1[0-2]|[1-9])\s?([ap])\.?m\.?(?![\p{L}\p{N}])/giu, (_a, h, ap, offset: number, whole: string) => {
      const hh = Number(h);
      const part = ap.toLowerCase() === "a" ? "de la mañana" : hh === 12 || hh < 7 ? "de la tarde" : "de la noche";
      const hour = hh === 1 ? "una" : es(hh);
      // "a las 9pm" already has the article: don't say "las las".
      const hasArticle = /(?:^|\s)las?\s+$/iu.test(whole.slice(0, offset));
      return `${hasArticle ? hour : `${hh === 1 ? "la" : "las"} ${hour}`} ${part}`;
    });
  }
  return s;
}

function applyCounts(s: string, lang: Lang): string {
  const w = WORDS[lang];
  if (!w) return s;
  // A count is followed by a word ("2 nights", "3 of us"). A bare number ("somos 4")
  // stays as digits; the voice reads it correctly anyway.
  return s.replace(new RegExp(`${NOT_AFTER}${INT}(?=\\s+\\p{L})`, "gu"), (all, raw, offset: number, whole: string) => {
    if (raw.includes(",")) return all; // "1,200" without a currency: could be a list or a code
    if (LABEL_BEFORE.test(whole.slice(0, offset))) return all; // bus 73, room 12
    const n = parseInt0(raw);
    if (n === null || n > 100) return all;
    // The noun's gender is unknown: keep digits where the word changes with gender
    // (es uno/una, fr un/une, pt um/uma, dois/duas).
    if ((lang === "es" || lang === "fr") && n % 10 === 1 && n !== 11) return all;
    if (lang === "pt" && (n % 10 === 1 || n % 10 === 2) && n !== 11 && n !== 12) return all;
    return w(n);
  });
}

export function speakNumbers(text: string, lang: string | undefined, dialect?: string): string {
  if (!lang || !/\d/.test(text)) return text;
  const L = lang as Lang;
  let s = applyMoney(text, L, dialect);
  s = applyTimes(s, L);
  s = applyCounts(s, L);
  return s;
}
