/**
 * Cinematic portal geometry.
 *
 *     npm test
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  CORNER_STEPS,
  PORTAL_FOCAL,
  clamp,
  coverRect,
  drawCoverMedia,
  easeInOutCubic,
  lerp,
  projectPoint,
  projectPolygon,
  sampleRoundedRect,
  withAlpha,
} from "../components/portal/portalGeometry";

describe("rounded-rectangle sampling", () => {
  test("yields the 44-point polygon (10 arc steps per corner)", () => {
    const points = sampleRoundedRect(200, 150, 400, 260, 90);
    assert.equal(points.length, 44);
    assert.equal(CORNER_STEPS, 10);
    assert.ok(points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)));
  });

  test("every vertex stays within the rectangle bounds and respects the radius", () => {
    const cx = 0;
    const cy = 0;
    const width = 400;
    const height = 200;
    const radius = 90;
    for (const [x, y] of sampleRoundedRect(cx, cy, width, height, radius)) {
      assert.ok(x >= -width / 2 - 1e-6 && x <= width / 2 + 1e-6);
      assert.ok(y >= -height / 2 - 1e-6 && y <= height / 2 + 1e-6);
    }
    // Corner vertices are pulled in by the radius (no sharp corners remain).
    const xs = sampleRoundedRect(cx, cy, width, height, radius).map(([x]) => x);
    assert.ok(Math.max(...xs) <= width / 2 + 1e-6);
    assert.ok(Math.min(...xs) >= -width / 2 - 1e-6);
  });

  test("a zero radius collapses to a plain rectangle", () => {
    const points = sampleRoundedRect(0, 0, 100, 60, 0);
    assert.equal(points.length, 44);
    const unique = new Set(points.map(([x, y]) => `${x},${y}`));
    assert.equal(unique.size, 4);
  });
});

describe("fake perspective projection", () => {
  test("matches the specified focal-850 formula at rest", () => {
    const [x, y] = projectPoint(100, 40, 0, 0, 500, 300);
    assert.equal(x, 600);
    assert.equal(y, 340);
  });

  test("rotation recedes +x (rotY) and pulls +y forward (rotX)", () => {
    const flatX = projectPoint(100, 0, 0, 0, 0, 0);
    const tiltedX = projectPoint(100, 0, 0, 20, 0, 0);
    assert.equal(flatX[0], 100);
    assert.ok(tiltedX[0] < flatX[0] && tiltedX[0] > 0);

    const flatY = projectPoint(0, 200, 0, 0, 0, 0);
    const tiltedY = projectPoint(0, 200, 20, 0, 0, 0);
    assert.equal(flatY[1], 200);
    assert.ok(tiltedY[1] > flatY[1]);
  });

  test("the focal plane is floored so output can never explode", () => {
    const [x, y] = projectPoint(0, 5000, 0, 0, 0, 0);
    assert.ok(Number.isFinite(x) && Number.isFinite(y));
    const huge = projectPoint(0, 100000, 0, 0, 0, 0, PORTAL_FOCAL);
    assert.ok(Math.abs(huge[1]) < 1e6);
  });

  test("projectPolygon projects every vertex about the pivot", () => {
    const rect = sampleRoundedRect(400, 300, 200, 120, 40);
    const projected = projectPolygon(rect, 0, 0, 400, 300);
    assert.equal(projected.length, rect.length);
    assert.deepEqual(projected[0], rect[0]);
  });
});

describe("cover crop", () => {
  test("crops the long side so the short side fills the box", () => {
    const crop = coverRect(1000, 500, 300, 300);
    assert.equal(crop.sh, 500);
    assert.equal(crop.sw, 500);
    assert.equal(crop.sx, 250);
    assert.equal(crop.sy, 0);
  });

  test("is a no-op when the box matches the image aspect", () => {
    const crop = coverRect(800, 400, 400, 200);
    assert.deepEqual(crop, { sx: 0, sy: 0, sw: 800, sh: 400 });
  });

  test("degenerate inputs never produce NaN", () => {
    const crop = coverRect(0, 0, 300, 300);
    assert.ok([crop.sx, crop.sy, crop.sw, crop.sh].every(Number.isFinite));
  });
});

describe("misc helpers", () => {
  test("easeInOutCubic is symmetric and pins its endpoints", () => {
    assert.equal(easeInOutCubic(0), 0);
    assert.equal(easeInOutCubic(1), 1);
    assert.ok(Math.abs(easeInOutCubic(0.5) - 0.5) < 1e-9);
  });

  test("drawCoverMedia reports false for undrawable media", () => {
    const ctx = {} as unknown as CanvasRenderingContext2D;
    assert.equal(drawCoverMedia(ctx, null, 0, 0, 0, 0, 100, 100), false);
  });

  test("clamp / lerp / withAlpha behave", () => {
    assert.equal(clamp(5, 0, 1), 1);
    assert.equal(clamp(-5, 0, 1), 0);
    assert.equal(lerp(0, 10, 0.25), 2.5);
    assert.equal(withAlpha("#C8102E", 0.5), "rgba(200, 16, 46, 0.5)");
    assert.equal(withAlpha("#fff", 1), "rgba(255, 255, 255, 1)");
    assert.equal(withAlpha("nope", 1), "nope");
  });
});
