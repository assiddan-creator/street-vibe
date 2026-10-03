/**
 * Landing "city voyage" scenes: one per street dialect, each with a flag palette, art and example lines.
 *
 *     npm test
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { DIALECTS } from "../lib/dialects";
import { CITY_IMAGE_WIDTHS, CITY_SCENES, cityImageSrcSet } from "../lib/landingCities";

test("every street dialect has a scene, in app order", () => {
  const street = DIALECTS.filter((d) => d.group === "street");
  assert.deepEqual(
    CITY_SCENES.map((c) => c.dialect),
    street.map((d) => d.value),
  );
  assert.deepEqual(
    CITY_SCENES.map((c) => c.city),
    street.map((d) => d.label),
  );
});

test("every scene has art, a flag palette and tourist/local lines", () => {
  for (const c of CITY_SCENES) {
    assert.match(c.image, /^\/images\/.+\.jpeg$/, c.city);
    for (const color of [c.primary, c.secondary, c.tertiary]) assert.match(color, /^#[0-9A-F]{6}$/i, c.city);
    assert.ok(c.tourist.trim().length > 0, `${c.city} tourist line`);
    assert.ok(c.local.trim().length > 0, `${c.city} local line`);
    assert.notEqual(c.tourist, c.local, c.city);
  }
});

test("srcset only uses widths the Next image optimizer accepts", () => {
  const allowed = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
  for (const w of CITY_IMAGE_WIDTHS) assert.ok(allowed.includes(w), String(w));
  assert.equal(cityImageSrcSet("/images/japan.jpeg").split(", ").length, CITY_IMAGE_WIDTHS.length);
});
