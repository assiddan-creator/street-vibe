/**
 * Kingston / Jamaican Patois speech-only prosody normalization.
 *
 *     npm test
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  JAMAICAN_PATOIS_DIALECT_ID,
  normalizeJamaicanPatoisForSpeech,
} from "../lib/jamaicanPatoisSpeechNormalize";
import { addSpeechPunctuation, resolveSpeechLanguage } from "../lib/speechPunctuation";

describe("the real reported example", () => {
  test("Yow bredda wan gwaan yu waan step out tonight -> natural chunking", () => {
    const input = "Yow bredda wan gwaan yu waan step out tonight";
    const got = normalizeJamaicanPatoisForSpeech(input, JAMAICAN_PATOIS_DIALECT_ID);
    assert.equal(got, "Yow bredda, wah gwaan? Yuh waan step out tonight?");
  });
});

describe("a longer Kingston sentence", () => {
  test("Bredda mi nuh see yuh long time man mek wi link today an catch up", () => {
    const input = "Bredda mi nuh see yuh long time man mek wi link today an catch up";
    const got = normalizeJamaicanPatoisForSpeech(input, JAMAICAN_PATOIS_DIALECT_ID);
    assert.equal(
      got,
      "Bredda, mi nuh see yuh long time, man. Mek wi link today an catch up"
    );
    // The three natural chunks are all present: opening address, an aside
    // before "man", and a fresh capitalized sentence after it.
    assert.ok(got.startsWith("Bredda,"));
    assert.ok(got.includes("long time, man."));
    assert.ok(got.includes(". Mek wi link"));
  });
});

describe("already-punctuated input is left alone", () => {
  const cases = [
    "Yow bredda, wah gwaan? Yuh waan step out tonight?",
    "Bredda, mi nuh see yuh long time, man. Mek wi link today an catch up.",
    "Wah gwaan?",
    "Bro, yuh good?",
  ];
  for (const input of cases) {
    test(`unchanged: ${JSON.stringify(input)}`, () => {
      assert.equal(normalizeJamaicanPatoisForSpeech(input, JAMAICAN_PATOIS_DIALECT_ID), input);
    });
  }
});

describe("no extra punctuation needed", () => {
  const cases = [
    "Mi jus a chill inna di yard right now.",
    "Everyting criss today.",
    "Mi deh yah.",
  ];
  for (const input of cases) {
    test(`stays as-is: ${JSON.stringify(input)}`, () => {
      assert.equal(normalizeJamaicanPatoisForSpeech(input, JAMAICAN_PATOIS_DIALECT_ID), input);
    });
  }
});

describe("spelling normalization is narrow and safe", () => {
  test("wan gwaan -> wah gwaan at a clause start (also a recognized question stem)", () => {
    // "wah gwaan" is itself a self-contained question stem (see the question
    // detection tests below), so at a clause start it also gets punctuated —
    // this only asserts the spelling landed correctly.
    const got = normalizeJamaicanPatoisForSpeech("Wan gwaan today", JAMAICAN_PATOIS_DIALECT_ID);
    assert.ok(got.startsWith("Wah gwaan"), got);
  });

  test("wan gwaan -> wah gwaan mid-sentence, case preserved, no stray question mark", () => {
    // Mid-sentence (not a clause start), so the question-stem rule does not
    // apply — this isolates the spelling normalization on its own.
    assert.equal(
      normalizeJamaicanPatoisForSpeech("mi know sey wan gwaan a bother yuh", JAMAICAN_PATOIS_DIALECT_ID),
      "mi know sey wah gwaan a bother yuh"
    );
  });

  test("standalone yu -> yuh, but yuh itself is left alone", () => {
    const got = normalizeJamaicanPatoisForSpeech("Mi si yu an yuh sista", JAMAICAN_PATOIS_DIALECT_ID);
    assert.ok(got.includes("si yuh an"), got);
    assert.ok(got.includes("yuh sista"), got);
    // Never double-normalized into "yuhh".
    assert.ok(!got.includes("yuhh"));
  });

  test("does not touch 'you' or words merely containing yu", () => {
    const got = normalizeJamaicanPatoisForSpeech("you and yute deh deh", JAMAICAN_PATOIS_DIALECT_ID);
    assert.ok(got.includes("you and yute"), got);
  });
});

describe("question detection is selective, not universal", () => {
  test("wah gwaan mid-sentence still gets a question mark, but plain statements don't", () => {
    const questionish = normalizeJamaicanPatoisForSpeech("Wah gwaan bredda", JAMAICAN_PATOIS_DIALECT_ID);
    assert.ok(questionish.includes("Wah gwaan?"), questionish);

    const statement = normalizeJamaicanPatoisForSpeech(
      "Mi did deh a road all day",
      JAMAICAN_PATOIS_DIALECT_ID
    );
    assert.equal(statement, "Mi did deh a road all day");
    assert.ok(!statement.includes("?"));
  });

  test("yuh waan opens a trailing question only when the clause runs to the end", () => {
    const got = normalizeJamaicanPatoisForSpeech("Yuh waan some food", JAMAICAN_PATOIS_DIALECT_ID);
    assert.equal(got, "Yuh waan some food?");
  });

  test("not every phrase becomes a question", () => {
    const got = normalizeJamaicanPatoisForSpeech(
      "Mi waan some food an a drink",
      JAMAICAN_PATOIS_DIALECT_ID
    );
    // "waan" alone (without the "yuh" lead-in) is not a recognized stem.
    assert.equal(got, "Mi waan some food an a drink");
  });
});

describe("display text is never touched", () => {
  test("the input string reference is not mutated", () => {
    const original = "Yow bredda wan gwaan yu waan step out tonight";
    const snapshot = original;
    normalizeJamaicanPatoisForSpeech(original, JAMAICAN_PATOIS_DIALECT_ID);
    assert.equal(original, snapshot, "the caller's original string must be untouched");
  });

  test("calling it twice on the same original never compounds punctuation", () => {
    const original = "Yow bredda wan gwaan yu waan step out tonight";
    const once = normalizeJamaicanPatoisForSpeech(original, JAMAICAN_PATOIS_DIALECT_ID);
    const twice = normalizeJamaicanPatoisForSpeech(once, JAMAICAN_PATOIS_DIALECT_ID);
    assert.equal(twice, once);
  });
});

describe("other dialects never receive Kingston normalization", () => {
  const input = "Yow bredda wan gwaan yu waan step out tonight";

  for (const dialect of ["London Roadman", "New York Brooklyn", "Israeli Street", "Arabic Egyptian", "Spanish Madrid", undefined]) {
    test(`${dialect ?? "(undefined)"} is returned unchanged`, () => {
      assert.equal(normalizeJamaicanPatoisForSpeech(input, dialect), input);
    });
  }

  test("Kingston is isolated out of the shared generic marker map", () => {
    // The generic English-marker layer no longer touches Jamaican Patois at
    // all — Kingston's speech text is owned entirely by this module.
    assert.equal(resolveSpeechLanguage("Jamaican Patois"), undefined);
    assert.equal(addSpeechPunctuation(input, "Jamaican Patois"), input);
  });

  test("London Roadman's own generic punctuation is unaffected by the Kingston change", () => {
    // Regression guard: removing Kingston from DIALECT_LANGUAGE must not
    // touch the shared "en" marker set that London/Brooklyn still use.
    const got = addSpeechPunctuation("yo bro what's good", "London Roadman");
    assert.equal(got, "yo, bro, what's good");
  });
});
