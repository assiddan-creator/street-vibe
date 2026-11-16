/**
 * Landing tour stops: one per street dialect, each with a place on the globe, flag colors
 * and a local line that stays readable on its bubble.
 *
 *     npm test
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { DIALECTS } from "../lib/dialects";
import { CITY_STOPS, TOURIST_LINE, contrast, liftForNight } from "../lib/landingCities";

test("every street dialect is a stop, exactly once", () => {
  const street = DIALECTS.filter((d) => d.group === "street").map((d) => d.value);
  assert.deepEqual([...CITY_STOPS.map((c) => c.dialect)].sort(), [...street].sort());
  assert.equal(new Set(CITY_STOPS.map((c) => c.city)).size, CITY_STOPS.length);
});

test("city names come from the app's dialect labels", () => {
  for (const c of CITY_STOPS) {
    assert.equal(c.city, DIALECTS.find((d) => d.value === c.dialect)?.label, c.dialect);
  }
});

test("every stop sits on the globe and says something other than the plain line", () => {
  for (const c of CITY_STOPS) {
    assert.ok(c.lat >= -90 && c.lat <= 90, `${c.city} lat`);
    assert.ok(c.lon >= -180 && c.lon <= 180, `${c.city} lon`);
    assert.ok(c.local.trim().length > 0, `${c.city} local line`);
    assert.notEqual(c.local, TOURIST_LINE, c.city);
  }
});

test("glow, field and ink are official flag colors", () => {
  for (const c of CITY_STOPS) {
    const flag = c.flagColors.map((x) => x.toUpperCase());
    for (const color of [...c.glow, c.field]) assert.ok(flag.includes(color.toUpperCase()), `${c.city} ${color}`);
    if (c.fieldInk) assert.ok(flag.includes(c.fieldInk.toUpperCase()), `${c.city} ink ${c.fieldInk}`);
  }
});

test("text on the flag field passes AA (4.5:1): the local bubble and the Pro plan use it", () => {
  for (const c of CITY_STOPS) {
    assert.ok(contrast(c.field, c.ink) >= 4.5, `${c.city}: ${contrast(c.field, c.ink).toFixed(2)}`);
  }
});

test("display colors are bright enough to glow on the night ground", () => {
  for (const c of CITY_STOPS) {
    for (const color of c.display) {
      assert.match(color, /^#[0-9A-F]{6}$/, `${c.city} ${color}`);
      assert.ok(contrast(color, "#06070B") >= 2.4, `${c.city} ${color}: ${contrast(color, "#06070B").toFixed(2)}`);
    }
  }
});

test("liftForNight only touches colors too dark to read", () => {
  assert.equal(liftForNight("#FED100"), "#FED100");
  assert.equal(liftForNight("#FFFFFF"), "#FFFFFF");
  assert.notEqual(liftForNight("#000091"), "#000091");
  assert.notEqual(liftForNight("#012169"), "#012169");
});
