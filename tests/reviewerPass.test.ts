/**
 * Reviewer pass (2026-10): reader-language notes, "Someone new" tone cap,
 * reply meanings, chosen compare cities, readable history labels.
 *
 *     npm test
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { effectiveSlangLevel, readerNoteLanguage } from "../lib/readerLanguage";
import { cleanReplySuggestions, parseReplyJson } from "../lib/replySuggestions";
import { comparisonDialects } from "../lib/compareTranslations";
import { historyEntryLabel, type HistoryVaultEntry } from "../lib/historyVault";

describe("reader note language", () => {
  test('"I speak Hebrew" wins over an English browser', () => {
    assert.equal(readerNoteLanguage("he-IL", "en-US"), "Hebrew");
  });
  test("full browser tags are understood (he-IL used to fall back to English)", () => {
    assert.equal(readerNoteLanguage(undefined, "he-IL"), "Hebrew");
    assert.equal(readerNoteLanguage("ru-RU", "en"), "Russian");
  });
  test("English or unknown falls back to English", () => {
    assert.equal(readerNoteLanguage("en-US", "he"), "English");
    assert.equal(readerNoteLanguage(undefined, undefined), "English");
    assert.equal(readerNoteLanguage("", "zz-not-a-lang"), "English");
  });
});

describe('"Someone new" stays natural', () => {
  test("caps intensity at 1 only for the new-acquaintance recipient", () => {
    assert.equal(effectiveSlangLevel(3, "new"), 1);
    assert.equal(effectiveSlangLevel(2, "new"), 1);
    assert.equal(effectiveSlangLevel(1, "new"), 1);
    assert.equal(effectiveSlangLevel(3, "dm"), 3);
    assert.equal(effectiveSlangLevel(2, undefined), 2);
  });
});

describe("reply suggestions", () => {
  test("reads replies with meanings and the incoming meaning", () => {
    const r = parseReplyJson(
      '```json\n{"incoming_meaning":"שואל אם בא לך לצאת","replies":[{"text":"bora!","meaning":"יאללה!"},{"text":"hoje não dá","meaning":"היום לא מסתדר"},{"text":"onde?","meaning":"איפה?"}]}\n```'
    );
    assert.ok(r);
    assert.equal(r!.incomingMeaning, "שואל אם בא לך לצאת");
    assert.deepEqual(r!.replies.map((x) => x.text), ["bora!", "hoje não dá", "onde?"]);
    assert.equal(r!.replies[1].meaning, "היום לא מסתדר");
  });
  test("keeps at most 3 and drops empty replies", () => {
    const r = parseReplyJson('{"replies":[{"text":"a"},{"text":""},"b",{"text":"c"},{"text":"d"}]}');
    assert.deepEqual(r!.replies.map((x) => x.text), ["a", "b", "c"]);
  });
  test("falls back to plain lines when the model ignores JSON", () => {
    const r = parseReplyJson("1. yo bruv\n2) bet\n- say less");
    assert.deepEqual(r!.replies.map((x) => x.text), ["yo bruv", "bet", "say less"]);
    assert.equal(r!.incomingMeaning, "");
  });
  test("drops placeholders and reader-language leaks, keeps the rest", () => {
    const r = cleanReplySuggestions(
      {
        incomingMeaning: "x",
        replies: [
          { text: "Sou de [Sua Cidade], e tu?", meaning: "" },
          { text: "o Rio é שטח bom demais", meaning: "" },
          { text: "Coé! Tô amando o Rio", meaning: "ok" },
        ],
      },
      "Hebrew",
      "Portuguese (Brazil)"
    );
    assert.deepEqual(r!.replies.map((x) => x.text), ["Coé! Tô amando o Rio"]);
  });
  test("Hebrew replies for a Hebrew reader are not treated as leaks", () => {
    const r = cleanReplySuggestions({ incomingMeaning: "", replies: [{ text: "אחי בוא", meaning: "" }] }, "Hebrew", "Hebrew (Israeli street / spoken Hebrew)");
    assert.equal(r!.replies.length, 1);
  });
  test("nothing usable left is a failure", () => {
    assert.equal(cleanReplySuggestions({ incomingMeaning: "", replies: [{ text: "[x]", meaning: "" }] }, "English", "Spanish"), null);
  });
  test("empty output is a failure, not an empty list", () => {
    assert.equal(parseReplyJson("   "), null);
  });
});

describe("compare cities", () => {
  test("uses the user's picks after the main city", () => {
    assert.deepEqual(comparisonDialects("Rio Favela", ["Tokyo Gyaru", "Paris Banlieue"]), [
      "Rio Favela",
      "Tokyo Gyaru",
      "Paris Banlieue",
    ]);
  });
  test("a pick equal to the main city is replaced from the defaults", () => {
    const d = comparisonDialects("London Roadman", ["London Roadman", "Tokyo Gyaru"]);
    assert.equal(d.length, 3);
    assert.equal(new Set(d).size, 3);
    assert.deepEqual(d.slice(0, 2), ["London Roadman", "Tokyo Gyaru"]);
  });
});

describe("history labels", () => {
  const base: HistoryVaultEntry = {
    id: "x",
    createdAtMs: 0,
    sourceText: "hi",
    translatedSlang: "oi",
    nativeTransliteration: null,
    dialect: "Rio Favela",
    vibe: "new",
    slangLevel: 2,
    inputLanguage: "he-IL",
  };
  test("no internal ids — city, recipient and intensity in words", () => {
    assert.equal(historyEntryLabel(base), "Rio · Someone new · Street");
  });
  test("other modes are named; compare drops the single city", () => {
    assert.equal(historyEntryLabel({ ...base, kind: "reply" }), "Reply · Rio · Someone new · Street");
    assert.equal(historyEntryLabel({ ...base, kind: "compare" }), "Compare · Someone new · Street");
  });
  test("legacy vibes are still readable", () => {
    assert.equal(historyEntryLabel({ ...base, vibe: "angry", slangLevel: 3 }), "Rio · Angry · Heavy");
  });
});
