/**
 * Pure geometry + drawing maths for the cinematic landing portal.
 *
 * No React, no DOM reads: every function is a plain number/CRT-in, value-out
 * helper so the 44-point rounded-rectangle sampling and the fake perspective
 * projection can be unit-tested in isolation (see tests/portalGeometry.test.ts).
 */

export type Point = readonly [number, number];

/** Fake-perspective focal length, in CSS pixels. */
export const PORTAL_FOCAL = 850;

/** Default corner radius of the portal window, in CSS pixels. */
export const PORTAL_RADIUS = 90;

/** Arc segments per corner. 10 segments -> 11 points -> 4 x 11 = 44 points. */
export const CORNER_STEPS = 10;

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Symmetric cubic ease. t in [0,1]. */
export function easeInOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Sample a rounded rectangle as a closed polygon.
 *
 * Each corner contributes `stepsPerCorner + 1` points traced clockwise
 * (top-right -> bottom-right -> bottom-left -> top-left), so the default
 * configuration yields exactly 44 points. A zero radius collapses each corner
 * onto its vertex and still traces a valid rectangle.
 */
export function sampleRoundedRect(
  cx: number,
  cy: number,
  width: number,
  height: number,
  radius: number = PORTAL_RADIUS,
  stepsPerCorner: number = CORNER_STEPS,
): Point[] {
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.max(0, Math.min(radius, Math.abs(hw), Math.abs(hh)));
  const halfPi = Math.PI / 2;

  const corners: { ox: number; oy: number; from: number }[] = [
    { ox: hw - r, oy: -hh + r, from: -halfPi }, // top-right
    { ox: hw - r, oy: hh - r, from: 0 }, // bottom-right
    { ox: -hw + r, oy: hh - r, from: halfPi }, // bottom-left
    { ox: -hw + r, oy: -hh + r, from: Math.PI }, // top-left
  ];

  const points: Point[] = [];
  for (const corner of corners) {
    for (let i = 0; i <= stepsPerCorner; i += 1) {
      const angle = corner.from + (halfPi * i) / stepsPerCorner;
      points.push([
        cx + corner.ox + Math.cos(angle) * r,
        cy + corner.oy + Math.sin(angle) * r,
      ]);
    }
  }
  return points;
}

/**
 * Fake perspective projection around a screen-space pivot.
 *
 * `x`/`y` are offsets from the pivot (cx, cy); the returned point is in screen
 * coordinates. The denominator is floored at 1 so a vertex pushed past the
 * focal plane can never blow up to Infinity.
 */
export function projectPoint(
  x: number,
  y: number,
  rotX: number,
  rotY: number,
  cx: number,
  cy: number,
  focal: number = PORTAL_FOCAL,
): Point {
  const ax = (rotX * Math.PI) / 180;
  const ay = (rotY * Math.PI) / 180;
  const xx = x * Math.cos(ay);
  const yy = y * Math.cos(ax);
  const z = x * Math.sin(ay) - y * Math.sin(ax);
  const p = focal / Math.max(1, focal + z);
  return [cx + xx * p, cy + yy * p];
}

/** Project every vertex of a polygon around a pivot. */
export function projectPolygon(
  points: readonly Point[],
  rotX: number,
  rotY: number,
  cx: number,
  cy: number,
  focal: number = PORTAL_FOCAL,
): Point[] {
  return points.map(([px, py]) => projectPoint(px - cx, py - cy, rotX, rotY, cx, cy, focal));
}

/** Trace a polygon onto a canvas 2D context (does not fill/stroke). */
export function pathFromPoints(ctx: CanvasRenderingContext2D, points: readonly Point[]): void {
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

/** Source crop that makes an image cover a destination box without distortion. */
export function coverRect(
  imageWidth: number,
  imageHeight: number,
  destWidth: number,
  destHeight: number,
): { sx: number; sy: number; sw: number; sh: number } {
  if (
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    !Number.isFinite(destWidth) ||
    !Number.isFinite(destHeight) ||
    imageWidth <= 0 ||
    imageHeight <= 0 ||
    destWidth <= 0 ||
    destHeight <= 0
  ) {
    return { sx: 0, sy: 0, sw: Math.max(0, imageWidth), sh: Math.max(0, imageHeight) };
  }
  const scale = Math.max(destWidth / imageWidth, destHeight / imageHeight);
  const sw = destWidth / scale;
  const sh = destHeight / scale;
  return { sx: (imageWidth - sw) / 2, sy: (imageHeight - sh) / 2, sw, sh };
}

/**
 * Screen-locked cover draw: paints `media` so it covers the (dx, dy, dw, dh)
 * box, cropping the overflow. Returns false when the media is not drawable yet.
 */
export function drawCoverMedia(
  ctx: CanvasRenderingContext2D,
  media: CanvasImageSource | null,
  mediaWidth: number,
  mediaHeight: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  alpha = 1,
): boolean {
  if (!media || mediaWidth <= 0 || mediaHeight <= 0 || dw <= 0 || dh <= 0) return false;
  const crop = coverRect(mediaWidth, mediaHeight, dw, dh);
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.drawImage(media, crop.sx, crop.sy, crop.sw, crop.sh, dx, dy, dw, dh);
  ctx.restore();
  return true;
}

/** `#RRGGBB` / `#RGB` -> `rgba(r, g, b, a)`. Returns the input on parse failure. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.trim().replace(/^#/, "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}
