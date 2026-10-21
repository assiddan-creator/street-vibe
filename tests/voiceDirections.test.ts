/**
 * Per-recipient voice directions.
 *
 *     npm test
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { AUDIENCE_DIRECTIONS, directionFor, withDirection } from "../lib/voiceDirections";
import { VIBE_SEGMENTS } from "../lib/slangSegmentControls";

describe("voice directions", () => {
  test("every recipient in the picker has a direction", () => {
    for (const { value } of VIBE_SEGMENTS) assert.ok(AUDIENCE_DIRECTIONS[value], value);
  });

  test("directions are single bracketed notes", () => {
    for (const d of Object.values(AUDIENCE_DIRECTIONS)) assert.match(d, /^\[[^\[\]]+\]$/);
  });

  test("v4 models get the direction before the line", () => {
    assert.equal(
      withDirection("  yo bruv  ", "flirt", "eleven_v4_turbo"),
      `${AUDIENCE_DIRECTIONS.flirt} yo bruv`
    );
    assert.ok(withDirection("hi", "dm", "eleven_v4").startsWith(AUDIENCE_DIRECTIONS.dm));
  });

  test("v3 / v2 models are sent the plain line", () => {
    assert.equal(withDirection(" hi ", "flirt", "eleven_v3_conversational"), "hi");
    assert.equal(withDirection("hi", "dm", "eleven_multilingual_v2"), "hi");
  });

  test("unknown, legacy or missing context sends the plain line", () => {
    for (const ctx of [undefined, "", "angry", "stoned", "Flirt"]) {
      assert.equal(directionFor(ctx), undefined, String(ctx));
      assert.equal(withDirection("hi", ctx, "eleven_v4_turbo"), "hi");
    }
  });
});
