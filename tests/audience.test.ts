/**
 * "Who's it for?" recipient picker.
 *
 *     npm test
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DEFAULT_AUDIENCE, VIBE_SEGMENTS, isAudienceValue } from "../lib/slangSegmentControls";

describe("recipient options", () => {
  test("offers Friend, Match, Group and Someone new — in that order", () => {
    assert.deepEqual(
      VIBE_SEGMENTS.map((s) => s.value),
      ["dm", "flirt", "group", "new"]
    );
  });

  test("the default recipient is a friend", () => {
    assert.equal(DEFAULT_AUDIENCE, "dm");
  });

  test("isAudienceValue accepts only offered options", () => {
    for (const s of VIBE_SEGMENTS) assert.equal(isAudienceValue(s.value), true);
    for (const bad of ["stoned", "angry", "", null, undefined, 3, "DM"]) {
      assert.equal(isAudienceValue(bad), false, String(bad));
    }
  });

  test("every offered recipient has its own instruction in the translate prompt", () => {
    // Guards against adding a picker option the server silently treats as
    // "default" because nobody wrote its instruction.
    const route = readFileSync(join(__dirname, "..", "app", "api", "translate", "route.ts"), "utf8");
    const block = route.slice(route.indexOf("const CONTEXT_INSTRUCTIONS"));
    for (const { value } of VIBE_SEGMENTS) {
      assert.match(block, new RegExp(`\\n\\s*${value}:`), `missing CONTEXT_INSTRUCTIONS.${value}`);
    }
  });
});
