// Builds public/landing/land.bin: the dotted continents for the landing globe.
//
//   node scripts/landing-land-dots.mjs <path-to>/land-110m.json
//
// Input is the `land-110m.json` TopoJSON from the `world-atlas` npm package (Natural Earth,
// public domain). Output is a flat Int16 array of [lat * 100, lon * 100] pairs: points of an
// even Fibonacci lattice on the sphere that fall on land.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const SAMPLES = 46000;
const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/landing-land-dots.mjs <land-110m.json>");
  process.exit(1);
}

const topo = JSON.parse(readFileSync(src, "utf8"));
const { scale, translate } = topo.transform;

// Decode the delta-encoded, quantized arcs into [lon, lat] rings.
const arcs = topo.arcs.map((arc) => {
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
});

function ringFromArcs(indexes) {
  const ring = [];
  for (const i of indexes) {
    const pts = i >= 0 ? arcs[i] : [...arcs[~i]].reverse();
    for (let k = ring.length ? 1 : 0; k < pts.length; k++) ring.push(pts[k]);
  }
  return ring;
}

/** Each polygon: { rings: [outer, ...holes], bbox }. */
const polygons = [];
for (const geom of topo.objects.land.geometries) {
  const polys = geom.type === "Polygon" ? [geom.arcs] : geom.arcs;
  for (const poly of polys) {
    const rings = poly.map(ringFromArcs);
    let minX = 180;
    let maxX = -180;
    let minY = 90;
    let maxY = -90;
    for (const [x, y] of rings[0]) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    polygons.push({ rings, bbox: [minX, minY, maxX, maxY] });
  }
}

function inRing(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function isLand(lon, lat) {
  for (const { rings, bbox } of polygons) {
    if (lon < bbox[0] || lon > bbox[2] || lat < bbox[1] || lat > bbox[3]) continue;
    if (!inRing(rings[0], lon, lat)) continue;
    let hole = false;
    for (let h = 1; h < rings.length; h++) {
      if (inRing(rings[h], lon, lat)) {
        hole = true;
        break;
      }
    }
    if (!hole) return true;
  }
  return false;
}

const out = [];
const golden = Math.PI * (3 - Math.sqrt(5));
for (let i = 0; i < SAMPLES; i++) {
  const y = 1 - (2 * (i + 0.5)) / SAMPLES;
  const lat = (Math.asin(y) * 180) / Math.PI;
  let lon = (((i * golden) % (2 * Math.PI)) * 180) / Math.PI;
  if (lon > 180) lon -= 360;
  if (lat < -62) continue; // drop Antarctica: it reads as a white cap and steals attention
  if (isLand(lon, lat)) out.push(Math.round(lat * 100), Math.round(lon * 100));
}

const dest = path.join(process.cwd(), "public", "landing", "land.bin");
mkdirSync(path.dirname(dest), { recursive: true });
writeFileSync(dest, Buffer.from(new Int16Array(out).buffer));
console.log(`${out.length / 2} land dots -> ${dest} (${out.length * 2} bytes)`);
