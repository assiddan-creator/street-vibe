/**
 * Cost bound for the unmetered read-aloud (transliterate) step.
 *
 *     npm test
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_TRANSLITERATE_LINE_CHARS,
  TRANSLITERATE_GUARD,
  lineWithinTransliterateLimit,
} from "../lib/transliterateLimits";

describe("transliterate limits", () => {
  test("accepts an ordinary translated line", () => {
    assert.equal(lineWithinTransliterateLimit("wagwan, bruv"), true);
  });

  test("rejects an empty line and one over the cap", () => {
    assert.equal(lineWithinTransliterateLimit(""), false);
    assert.equal(lineWithinTransliterateLimit("a".repeat(MAX_TRANSLITERATE_LINE_CHARS + 1)), false);
    assert.equal(lineWithinTransliterateLimit("a".repeat(MAX_TRANSLITERATE_LINE_CHARS)), true);
  });

  test("daily ceiling stays far below the old 60/min x 40 default", () => {
    assert.ok(TRANSLITERATE_GUARD.dailyLimit <= 200);
    assert.ok(TRANSLITERATE_GUARD.limit <= 20);
  });
});
