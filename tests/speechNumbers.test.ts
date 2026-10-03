/**
 * Numbers for speech, pronunciation aliases / dictionary locators, and the
 * spoken-style prompt rules.
 *
 *     npm test
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { speakNumbers } from "../lib/speechNumbers";
import { prepareSpeechText as p } from "../lib/prepareSpeechText";
import { applyPronunciationAliases, pronunciationLocatorsFor, PRONUNCIATION_ALIASES, PRONUNCIATION_DICTIONARY_LOCATORS } from "../lib/pronunciationDictionary";
import { SPOKEN_STYLE_RULE, STANDARD_PUNCTUATION_RULE, CHAT_AUTHENTICITY_RULE } from "../lib/spokenStyleRules";

describe("numbers as said, per language (through prepareSpeechText)", () => {
  const CASES: [dialect: string, input: string, spoken: string][] = [
    // English (US): bucks, times, counts
    ["New York Brooklyn", "lend me $20 till friday, meet at 8pm", "lend me twenty bucks till friday, meet at eight PM"],
    ["New York Brooklyn", "it's $1,200 for 2 nights, 8:30pm check in", "it's one thousand two hundred bucks for two nights, eight thirty PM check in"],
    ["New York Brooklyn", "see you 9:05am", "see you nine oh five AM"],
    ["New York Brooklyn", "it's $1 bro", "it's one buck bro"],
    // English (UK / Jamaica)
    ["London Roadman", "bruv it's £15 and £1 for the bag, 3 of us", "bruv it's fifteen quid and one quid for the bag, three of us"],
    ["London Roadman", "that's $50 innit", "that's fifty dollars innit"],
    ["Jamaican Patois", "gimme $500 an mi soon come at 7pm", "gimme five hundred dollars an mi soon come at seven PM"],
    // Spanish
    ["Spanish Madrid", "cuesta 21€ y quedamos a las 10pm", "cuesta veintiún euros y quedamos a las diez de la noche"],
    ["Spanish Madrid", "son 1€ y a la 1pm", "son un euro y a la una de la tarde"],
    ["Mexico City Barrio", "por 3 chelas a las 9pm", "por tres chelas a las nueve de la noche"],
    ["Mexico City Barrio", "son $200", "son $200"], // $ in Mexico: pesos or dollars — ambiguous, untouched
    // French
    ["Paris Banlieue", "c'est 20€ et on se capte à 20h30", "c'est vingt euros et on se capte à vingt heures trente"],
    ["Paris Banlieue", "71€ ou 80€ pour 21 personnes", "soixante et onze euros ou quatre-vingts euros pour 21 personnes"], // un/une unknown
    ["Paris Banlieue", "on est 3 potes", "on est trois potes"],
    ["Spanish Madrid", "1 cerveza y 3 tapas", "1 cerveza y tres tapas"], // uno/una unknown
    // Portuguese (BR)
    ["Rio Favela", "custa R$50, bora às 21h", "custa cinquenta reais, bora às vinte e uma horas"],
    ["Rio Favela", "R$1 e 2 cervejas às 2h", "um real e 2 cervejas às duas horas"], // count gender unknown -> digits
    ["Rio Favela", "somos 5 amigos", "somos cinco amigos"],
    // Digits stay, currency symbol becomes the word
    ["Israeli Street", "זה 50₪ ונפגשים ב-20:00", "זה 50 שקל ונפגשים ב-20:00"],
    ["Arabic Egyptian", "ب 100 E£ بس", "ب 100 جنيه بس"],
    ["Russian Street", "это 21₽, 22₽ и 25₽", "это 21 рубль, 22 рубля и 25 рублей"],
    ["Russian Street", "11₽ и 111₽", "11 рублей и 111 рублей"],
    ["Tokyo Gyaru", "¥500だよ、3人で行こ", "500円だよ、3人で行こ"],
  ];
  for (const [dialect, input, spoken] of CASES) {
    test(`${dialect}: ${JSON.stringify(input)}`, () => assert.equal(p(input, dialect), spoken));
  }
});

describe("numbers left alone (phones, codes, ambiguous)", () => {
  const UNTOUCHED: [string, string][] = [
    ["New York Brooklyn", "call me 917-555-0142 or 054 1234567"],
    ["New York Brooklyn", "code 4471, 24/7, v2.5, 1.5 hrs, 3:2"],
    ["New York Brooklyn", "year 2026, room 007, 100%, #1, @3am"],
    ["New York Brooklyn", "$2.50 or $10,000,000"],
    ["London Roadman", "bus 73 to platform 9 and room 12 please"],
    ["London Roadman", "+44 20 7946 0958"],
    ["Spanish Madrid", "somos 4"], // bare number: the voice reads digits fine
    ["Paris Banlieue", "on est 3"],
    ["Israeli Street", "054-1234567"],
  ];
  for (const [dialect, text] of UNTOUCHED) {
    test(`${dialect}: ${JSON.stringify(text)}`, () => assert.equal(p(text, dialect), text));
  }

  test("no language -> numbers untouched", () => {
    assert.equal(speakNumbers("$20 at 8pm", undefined), "$20 at 8pm");
  });
});

describe("pronunciation aliases + ElevenLabs dictionaries (ready, empty)", () => {
  test("ships empty: no aliases and no dictionary locators for any city", () => {
    assert.deepEqual(PRONUNCIATION_ALIASES, {});
    assert.deepEqual(PRONUNCIATION_DICTIONARY_LOCATORS, {});
    assert.deepEqual(pronunciationLocatorsFor("London Roadman"), []);
  });

  test("with an entry: whole words only, case-insensitive, keeps an initial capital", () => {
    const aliases = { "London Roadman": { mandem: "man-dem", "Croydon": "Croy-dun" } };
    assert.equal(applyPronunciationAliases("Mandem in Croydon, mandems", "London Roadman", aliases), "Man-dem in Croy-dun, mandems");
    assert.equal(applyPronunciationAliases("mandem", "Paris Banlieue", aliases), "mandem"); // other city untouched
  });

  test("locators: per city, at most 3", () => {
    const locs = { "Tokyo Gyaru": [1, 2, 3, 4].map((i) => ({ pronunciation_dictionary_id: `d${i}` })) };
    assert.equal(pronunciationLocatorsFor("Tokyo Gyaru", locs).length, 3);
    assert.deepEqual(pronunciationLocatorsFor(undefined, locs), []);
  });
});

describe("translate prompt: spoken style rules", () => {
  const route = readFileSync(join(__dirname, "..", "app", "api", "translate", "route.ts"), "utf8");

  test("slang prompt includes SPOKEN STYLE; standard prompt includes the punctuation rule", () => {
    assert.match(route, /\$\{SPOKEN_STYLE_RULE\}/);
    assert.match(route, /\$\{STANDARD_PUNCTUATION_RULE\}/);
  });

  test("the old 'NO commas' rule is gone (direct address now gets its comma)", () => {
    assert.ok(!route.includes("NO commas unless absolutely necessary"));
    assert.match(route, /const noAIRule = CHAT_AUTHENTICITY_RULE/);
    assert.match(CHAT_AUTHENTICITY_RULE, /comma after a direct address/);
  });

  test("rules cover every requested point", () => {
    for (const needle of ["gonna", "wah gwaan", "cê tá", "Bruv, that's mad", 'ONE "!" or "?"', '"..." or "—"', "No emoji", "hashtags", "ALL-CAPS", "¿ ¡", "niqqud"]) {
      assert.ok(SPOKEN_STYLE_RULE.includes(needle), needle);
    }
    for (const needle of ['ONE "!" or "?"', "No emoji", "niqqud"]) assert.ok(STANDARD_PUNCTUATION_RULE.includes(needle), needle);
  });

  test("Spanish Madrid no longer allows emoji", () => {
    assert.ok(!route.includes("No emoji unless the source already contains emoji"));
  });
});
