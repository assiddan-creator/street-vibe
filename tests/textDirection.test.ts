/**
 * First-strong-character direction (matches dir="auto"), used to place the input's clear button.
 *
 *     npm test
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { textDirection } from "../lib/textDirection";

test("Hebrew and Arabic are rtl", () => {
  assert.equal(textDirection("אחי בוא נצא הערב"), "rtl");
  assert.equal(textDirection("يلا نخرج الليلة"), "rtl");
});

test("English and other Latin/Cyrillic/CJK text is ltr", () => {
  assert.equal(textDirection("Bro, let's go out"), "ltr");
  assert.equal(textDirection("Го выпьем сегодня"), "ltr");
  assert.equal(textDirection("ねぇ今日飲まね"), "ltr");
});

test("mixed text follows the first strong character", () => {
  assert.equal(textDirection("Tel Aviv אחי"), "ltr");
  assert.equal(textDirection("אחי, Tel Aviv tonight?"), "rtl");
  assert.equal(textDirection("  123, !? אחי"), "rtl");
});

test("no letters defaults to ltr", () => {
  assert.equal(textDirection(""), "ltr");
  assert.equal(textDirection("123 !?"), "ltr");
});
