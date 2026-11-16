/**
 * Landing globe: a night-side Earth of dotted continents that the page's one line travels.
 * Loaded lazily (three.js stays out of the first paint) and driven from outside through
 * `GlobeFrame`: the page owns scroll, this module only draws what it is told.
 *
 * Colors are passed to the shaders as plain sRGB numbers and written out untouched, so a
 * flag hex on the page and the same hex on the globe match.
 */
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Group,
  LinearFilter,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Quaternion,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
} from "three";

export type GlobeCity = {
  lat: number;
  lon: number;
  /** Three display colors, nearest ring first. */
  colors: [string, string, string];
  /** Short greeting set on the orbiting ring. */
  label: string;
};

export type GlobeFrame = {
  /** 0 = horizon pose (hero and outro), 1 = touring pose. */
  pose: number;
  /** Fractional stop along the route, 0..cities-1. */
  pos: number;
  /** Stop the wave belongs to, or -1 when no single city is active (hero, outro). */
  active: number;
  /** City whose flag tints the atmosphere. */
  palette: number;
  /** Smoothed pointer, -1..1. */
  px: number;
  py: number;
};

export type GlobeHandle = {
  render: (frame: GlobeFrame, dt: number, time: number) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
};

const MAX_CITIES = 11;
const FOV = 22;
const CAM_Z = 10;
const DEG = Math.PI / 180;

function rgb(hex: string): Vector3 {
  const n = parseInt(hex.slice(1), 16);
  return new Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function onSphere(lat: number, lon: number, r = 1): Vector3 {
  const la = lat * DEG;
  const lo = lon * DEG;
  return new Vector3(Math.cos(la) * Math.sin(lo) * r, Math.sin(la) * r, Math.cos(la) * Math.cos(lo) * r);
}

/** Rotation that brings a place to face the camera with north up. */
function facing(lat: number, lon: number): Quaternion {
  return new Quaternion().setFromEuler(new Euler(lat * DEG, -lon * DEG, 0, "XYZ"));
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ------------------------------------------------------------------ shaders */

const CITY_UNIFORMS = /* glsl */ `
uniform vec3 uCity[${MAX_CITIES}];
uniform vec3 uColA[${MAX_CITIES}];
uniform vec3 uColB[${MAX_CITIES}];
uniform vec3 uColC[${MAX_CITIES}];
uniform float uStr[${MAX_CITIES}];
uniform float uRad[${MAX_CITIES}];
uniform float uCrest[${MAX_CITIES}];
`;

const DOTS_VERT = /* glsl */ `
attribute float aRand;
${CITY_UNIFORMS}
uniform float uTime;
uniform float uProj;
uniform float uSize;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 n = normalize(position);
  vec3 col = vec3(0.36, 0.40, 0.50);
  float lit = 0.0;
  for (int i = 0; i < ${MAX_CITIES}; i++) {
    float d = acos(clamp(dot(n, uCity[i]), -1.0, 1.0));
    float r = max(uRad[i], 0.001);
    float t = d / r;
    // The flag as three concentric bands around the city.
    vec3 band = mix(uColA[i], uColB[i], smoothstep(0.30, 0.38, t));
    band = mix(band, uColC[i], smoothstep(0.62, 0.70, t));
    float inside = 1.0 - smoothstep(0.86, 1.0, t);
    float crest = exp(-pow((t - 0.95) / 0.07, 2.0)) * uCrest[i];
    float s = clamp(uStr[i] * inside + crest, 0.0, 1.0);
    col = mix(col, band, s);
    lit = max(lit, s + crest * 0.8);
  }
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 vn = normalize(normalMatrix * n);
  float face = dot(vn, normalize(-mv.xyz));
  float twinkle = 0.72 + 0.28 * sin(uTime * (0.8 + aRand * 1.6) + aRand * 40.0);
  vColor = col * (0.78 + lit * 0.75);
  vAlpha = smoothstep(0.02, 0.38, face) * mix(0.62 * twinkle, 1.0, clamp(lit, 0.0, 1.0));
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uProj * (0.8 + 0.4 * aRand) * (1.0 + lit * 0.9) / -mv.z;
}`;

const DOTS_FRAG = /* glsl */ `
precision highp float;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.32, d) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
}`;

const VIEW_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vL;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  vL = position;
  gl_Position = projectionMatrix * mv;
}`;

const CORE_FRAG = /* glsl */ `
precision highp float;
varying vec3 vN;
varying vec3 vV;
uniform vec3 uTintA;
uniform vec3 uTintB;
void main() {
  vec3 n = normalize(vN);
  float f = pow(1.0 - max(dot(n, normalize(vV)), 0.0), 2.4);
  vec3 base = vec3(0.016, 0.020, 0.034);
  vec3 rim = mix(uTintB, uTintA, smoothstep(-0.5, 0.7, n.y + n.x * 0.4));
  float key = pow(max(dot(n, normalize(vec3(-0.5, 0.7, 0.6))), 0.0), 3.0) * 0.035;
  // Not fully opaque: the giant city name behind the planet stays readable through it.
  gl_FragColor = vec4(base + key + rim * f * 0.42, 0.72 + f * 0.28);
}`;

const ATMO_FRAG = /* glsl */ `
precision highp float;
varying vec3 vN;
varying vec3 vV;
uniform vec3 uTintA;
uniform vec3 uTintB;
uniform float uEdge;
void main() {
  // Back faces: 0 at the outer edge of the shell, uEdge where it meets the globe's limb.
  float d = max(dot(normalize(vN), -normalize(vV)), 0.0);
  float i = pow(clamp(d / uEdge, 0.0, 1.0), 2.3);
  vec3 col = mix(uTintB, uTintA, smoothstep(-0.6, 0.6, vN.y + vN.x * 0.5));
  gl_FragColor = vec4(col, i * 0.85);
}`;

const MARK_VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aIdx;
uniform float uAct[${MAX_CITIES}];
uniform float uProj;
uniform float uTime;
varying vec3 vColor;
varying float vAct;
varying float vFace;
void main() {
  float act = 0.0;
  for (int i = 0; i < ${MAX_CITIES}; i++) { if (float(i) == aIdx) act = uAct[i]; }
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 vn = normalize(normalMatrix * normalize(position));
  vFace = smoothstep(0.0, 0.3, dot(vn, normalize(-mv.xyz)));
  vColor = aColor;
  vAct = act;
  float pulse = 1.0 + 0.12 * sin(uTime * 2.4 + aIdx);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uProj * (0.05 + 0.07 * act) * pulse / -mv.z;
}`;

const MARK_FRAG = /* glsl */ `
precision highp float;
varying vec3 vColor;
varying float vAct;
varying float vFace;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float core = smoothstep(0.13, 0.07, d);
  float halo = exp(-d * d * 22.0) * (0.55 + 0.45 * vAct);
  float a = max(core, halo) * vFace;
  if (a < 0.01) discard;
  gl_FragColor = vec4(mix(vColor, vec3(1.0), core), a);
}`;

const UV_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const ARC_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uDraw;
uniform float uLive;
uniform vec3 uColor;
void main() {
  float on = step(vUv.x, uDraw);
  float head = exp(-max(uDraw - vUv.x, 0.0) / 0.10) * uLive;
  float a = on * (0.20 + head * 0.8);
  if (a < 0.01) discard;
  gl_FragColor = vec4(mix(uColor, vec3(1.0), head * 0.7), a);
}`;

const BEAM_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uColor;
uniform float uGrow;
void main() {
  float a = pow(1.0 - vUv.y, 1.6) * uGrow;
  gl_FragColor = vec4(mix(vec3(1.0), uColor, smoothstep(0.0, 0.5, vUv.y)), a);
}`;

const PULSE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uColor;
uniform float uTime;
uniform float uGrow;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float a = 0.0;
  for (int k = 0; k < 2; k++) {
    float w = fract(uTime * 0.42 + float(k) * 0.5);
    a += exp(-pow((r - w) / 0.03, 2.0)) * (1.0 - w);
  }
  a *= uGrow * step(r, 1.0);
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}`;

const RING_VERT = /* glsl */ `
uniform float uBand;
uniform float uRepeat;
varying vec2 vUv;
void main() {
  vUv = vec2(uv.x * uRepeat, uv.y);
  vec3 p = position * (1.0 + uv.y * uBand);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const RING_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uAlpha;
void main() {
  float a = texture2D(uMap, vUv).a * uAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}`;

const STAR_VERT = /* glsl */ `
attribute float aRand;
uniform float uTime;
uniform float uDpr;
varying float vA;
void main() {
  vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.4 + aRand) + aRand * 60.0));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = (0.9 + aRand * 1.5) * uDpr;
}`;

const STAR_FRAG = /* glsl */ `
precision highp float;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, d) * vA * 0.75;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vec3(0.82, 0.86, 1.0), a);
}`;

/* -------------------------------------------------------------------- build */

/** Greetings set end to end on a strip that wraps exactly, so the ring has no seam. */
function ringTexture(labels: string[], fontFamily: string): CanvasTexture {
  const W = 4096;
  const H = 72;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const font = `800 44px ${fontFamily}, "Arial Black", system-ui, sans-serif`;
  ctx.font = font;
  const gap = 46;
  const dot = 12;
  const widths = labels.map((l) => ctx.measureText(l).width);
  const total = widths.reduce((sum, w) => sum + w + gap * 2 + dot, 0);
  ctx.setTransform(W / total, 0, 0, 1, 0, 0);
  ctx.font = font;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  let x = gap;
  labels.forEach((label, i) => {
    ctx.fillText(label, x, H / 2 + 2);
    x += widths[i] + gap;
    ctx.beginPath();
    ctx.arc(x + dot / 2, H / 2, dot / 2, 0, Math.PI * 2);
    ctx.fill();
    x += dot + gap;
  });
  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Unit circle with u running along it, so text follows the curve. Both edges sit on the circle;
 * the vertex shader pushes the outer edge out by the band width, which changes with the pose.
 */
function ringGeometry(): BufferGeometry {
  const SEG = 256;
  const pos = new Float32Array((SEG + 1) * 2 * 3);
  const uv = new Float32Array((SEG + 1) * 2 * 2);
  const idx: number[] = [];
  for (let i = 0; i <= SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    pos.set([c, s, 0, c, s, 0], i * 6);
    // u falls as the angle grows, so at the top of the circle the text reads left to right.
    const u = 1 - i / SEG;
    uv.set([u, 0, u, 1], i * 4);
    if (i < SEG) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("uv", new BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

export async function createGlobe(
  canvas: HTMLCanvasElement,
  cities: GlobeCity[],
  fontFamily: string,
): Promise<GlobeHandle> {
  const count = Math.min(cities.length, MAX_CITIES);
  const land = new Int16Array(await (await fetch("/landing/land.bin")).arrayBuffer());

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 200);
  camera.position.set(0, 0, CAM_Z);

  const root = new Group();
  const globe = new Group();
  root.add(globe);
  scene.add(root);

  /* --- per-city uniform arrays, shared by the dots and the markers --- */
  const pad = <T,>(make: (i: number) => T) => Array.from({ length: MAX_CITIES }, (_, i) => make(Math.min(i, count - 1)));
  const cityVec = pad((i) => onSphere(cities[i].lat, cities[i].lon));
  const colA = pad((i) => rgb(cities[i].colors[0]));
  const colB = pad((i) => rgb(cities[i].colors[1]));
  const colC = pad((i) => rgb(cities[i].colors[2]));
  const str = new Float32Array(MAX_CITIES);
  const rad = new Float32Array(MAX_CITIES).fill(0.2);
  const crest = new Float32Array(MAX_CITIES);
  const act = new Float32Array(MAX_CITIES);
  const tintA = { value: colA[0].clone() };
  const tintB = { value: colB[0].clone() };
  const uTime = { value: 0 };
  const uProj = { value: 1 };

  /* --- core: the opaque night side, also what hides the far hemisphere --- */
  const core = new Mesh(
    new SphereGeometry(1, 96, 64),
    new ShaderMaterial({ vertexShader: VIEW_VERT, fragmentShader: CORE_FRAG, uniforms: { uTintA: tintA, uTintB: tintB } }),
  );
  globe.add(core);

  /* --- atmosphere: a shell lit from behind in the active flag --- */
  const ATMO_R = 1.2;
  const atmo = new Mesh(
    new SphereGeometry(ATMO_R, 64, 48),
    new ShaderMaterial({
      vertexShader: VIEW_VERT,
      fragmentShader: ATMO_FRAG,
      uniforms: { uTintA: tintA, uTintB: tintB, uEdge: { value: Math.sqrt(1 - 1 / (ATMO_R * ATMO_R)) } },
      side: BackSide,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  atmo.renderOrder = 1;
  root.add(atmo);

  /* --- continents --- */
  const n = land.length / 2;
  const dotPos = new Float32Array(n * 3);
  const dotRand = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = onSphere(land[i * 2] / 100, land[i * 2 + 1] / 100, 1.003);
    dotPos.set([p.x, p.y, p.z], i * 3);
    // Cheap stable hash: no Math.random, so the globe looks the same on every visit.
    dotRand[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    if (dotRand[i] < 0) dotRand[i] += 1;
  }
  const dotsGeo = new BufferGeometry();
  dotsGeo.setAttribute("position", new BufferAttribute(dotPos, 3));
  dotsGeo.setAttribute("aRand", new BufferAttribute(dotRand, 1));
  const dotsMat = new ShaderMaterial({
    vertexShader: DOTS_VERT,
    fragmentShader: DOTS_FRAG,
    uniforms: {
      uCity: { value: cityVec },
      uColA: { value: colA },
      uColB: { value: colB },
      uColC: { value: colC },
      uStr: { value: str },
      uRad: { value: rad },
      uCrest: { value: crest },
      uTime,
      uProj,
      uSize: { value: 0.0125 },
    },
    transparent: true,
    depthWrite: false,
  });
  const dots = new Points(dotsGeo, dotsMat);
  dots.renderOrder = 2;
  globe.add(dots);

  /* --- route: one arc per hop, drawn as the line travels --- */
  const arcs: { mat: ShaderMaterial }[] = [];
  for (let i = 0; i < count - 1; i++) {
    const a = cityVec[i];
    const b = cityVec[i + 1];
    const angle = a.angleTo(b);
    const lift = 0.05 + 0.32 * (angle / Math.PI);
    const pts: Vector3[] = [];
    for (let k = 0; k <= 32; k++) {
      const t = k / 32;
      const p = a.clone().lerp(b, t).normalize();
      // lerp + normalize bunches points near the ends on long hops; fine for a smooth tube.
      pts.push(p.multiplyScalar(1.004 + Math.sin(Math.PI * t) * lift));
    }
    const mat = new ShaderMaterial({
      vertexShader: UV_VERT,
      fragmentShader: ARC_FRAG,
      uniforms: { uDraw: { value: 0 }, uLive: { value: 0 }, uColor: { value: colA[i + 1] } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const mesh = new Mesh(new TubeGeometry(new CatmullRomCurve3(pts), 96, 0.0034, 6, false), mat);
    mesh.renderOrder = 3;
    globe.add(mesh);
    arcs.push({ mat });
  }

  /* --- city markers --- */
  const markPos = new Float32Array(count * 3);
  const markCol = new Float32Array(count * 3);
  const markIdx = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const p = cityVec[i].clone().multiplyScalar(1.008);
    markPos.set([p.x, p.y, p.z], i * 3);
    markCol.set([colA[i].x, colA[i].y, colA[i].z], i * 3);
    markIdx[i] = i;
  }
  const markGeo = new BufferGeometry();
  markGeo.setAttribute("position", new BufferAttribute(markPos, 3));
  markGeo.setAttribute("aColor", new BufferAttribute(markCol, 3));
  markGeo.setAttribute("aIdx", new BufferAttribute(markIdx, 1));
  const marks = new Points(
    markGeo,
    new ShaderMaterial({
      vertexShader: MARK_VERT,
      fragmentShader: MARK_FRAG,
      uniforms: { uAct: { value: act }, uProj, uTime },
      transparent: true,
      depthWrite: false,
    }),
  );
  marks.renderOrder = 4;
  globe.add(marks);

  /* --- the active city's beam and pulse --- */
  const beamColor = { value: colA[0].clone() };
  const grow = { value: 0 };
  const beamGeo = new CylinderGeometry(0.0022, 0.008, 1, 8, 1, true);
  beamGeo.translate(0, 0.5, 0);
  const beam = new Mesh(
    beamGeo,
    new ShaderMaterial({
      vertexShader: UV_VERT,
      fragmentShader: BEAM_FRAG,
      uniforms: { uColor: beamColor, uGrow: grow },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    }),
  );
  beam.renderOrder = 5;
  globe.add(beam);
  const pulse = new Mesh(
    new PlaneGeometry(0.46, 0.46),
    new ShaderMaterial({
      vertexShader: UV_VERT,
      fragmentShader: PULSE_FRAG,
      uniforms: { uColor: beamColor, uTime, uGrow: grow },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    }),
  );
  pulse.renderOrder = 5;
  globe.add(pulse);
  let beamCity = -1;
  const UP = new Vector3(0, 1, 0);
  const OUT = new Vector3(0, 0, 1);

  /* --- ring of greetings --- */
  // The strip is 4096 x 72, so one lap of it is undistorted when the band is this wide.
  const RING_BAND = (Math.PI * 2 * 72) / 4096;
  const ringAlpha = { value: 0 };
  const ringBand = { value: RING_BAND };
  const ringRepeat = { value: 1 };
  let ringFade = 0;
  const ringMat = new ShaderMaterial({
    vertexShader: RING_VERT,
    fragmentShader: RING_FRAG,
    uniforms: {
      uMap: { value: null as CanvasTexture | null },
      uColor: { value: new Vector3(0.95, 0.95, 0.93) },
      uAlpha: ringAlpha,
      uBand: ringBand,
      uRepeat: ringRepeat,
    },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
  const ring = new Mesh(ringGeometry(), ringMat);
  ring.renderOrder = 6;
  ring.visible = false;
  root.add(ring);
  // The strip is drawn once the display font is usable; until then the ring stays hidden.
  const fontReady = typeof document !== "undefined" && document.fonts?.load ? document.fonts.load(`800 44px ${fontFamily}`) : Promise.resolve();
  let disposed = false;
  fontReady
    .catch(() => undefined)
    .then(() => {
      if (disposed) return;
      ringMat.uniforms.uMap.value = ringTexture(
        cities.map((c) => c.label),
        fontFamily,
      );
      ring.visible = true;
    });

  /* --- stars --- */
  const STARS = 900;
  const starPos = new Float32Array(STARS * 3);
  const starRand = new Float32Array(STARS);
  for (let i = 0; i < STARS; i++) {
    const h1 = Math.abs((Math.sin(i * 78.233) * 43758.5453) % 1);
    const h2 = Math.abs((Math.sin(i * 39.425) * 24634.6345) % 1);
    const h3 = Math.abs((Math.sin(i * 11.135) * 96321.9127) % 1);
    starPos.set([(h1 - 0.5) * 60, (h2 - 0.5) * 34, -30 - h3 * 60], i * 3);
    starRand[i] = h3;
  }
  const starGeo = new BufferGeometry();
  starGeo.setAttribute("position", new BufferAttribute(starPos, 3));
  starGeo.setAttribute("aRand", new BufferAttribute(starRand, 1));
  const uDpr = { value: 1 };
  const stars = new Points(
    starGeo,
    new ShaderMaterial({
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      uniforms: { uTime, uDpr },
      transparent: true,
      depthWrite: false,
    }),
  );
  stars.renderOrder = 0;
  scene.add(stars);

  /* --- poses --- */
  const tourQ = cities.slice(0, count).map((c) => facing(c.lat, c.lon));
  const heroQ = new Quaternion();
  const targetQ = new Quaternion();
  const stepQ = new Quaternion();
  const offsetQ = new Quaternion();
  const euler = new Euler();
  const heroPosV = new Vector3();
  const tourPosV = new Vector3();
  let heroR = 4;
  let tourR = 1.2;
  let mobile = false;
  let started = false;

  /** Center height that puts the apparent top of an off-axis sphere at `topY` (in the z = 0 plane). */
  function centerForTop(r: number, topY: number): number {
    let lo = topY - r * 1.5;
    let hi = topY - r * 0.5;
    for (let i = 0; i < 28; i++) {
      const cy = (lo + hi) / 2;
      const gamma = Math.asin(Math.min(0.999, r / Math.hypot(cy, CAM_Z)));
      const alpha = Math.atan2(-cy, CAM_Z);
      const top = CAM_Z * Math.tan(gamma - alpha);
      if (top > topY) hi = cy;
      else lo = cy;
    }
    return (lo + hi) / 2;
  }

  function resize(w: number, h: number) {
    if (w < 2 || h < 2) return;
    // Same breakpoint as the stylesheet, so the globe and the copy change layout together.
    mobile = w < 760;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const halfH = Math.tan((FOV * DEG) / 2) * CAM_Z;
    const halfW = halfH * camera.aspect;
    uProj.value = (h * dpr) / (2 * Math.tan((FOV * DEG) / 2));
    uDpr.value = dpr;
    // Horizon: a planet wide enough to cross the frame, its top a little under the middle.
    heroR = mobile ? Math.max(halfW * 2.3, halfH * 1.1) : Math.max(halfW * 1.16, halfH * 1.5);
    heroPosV.set(0, centerForTop(heroR, -halfH * (mobile ? 0.2 : 0.34)), 0);
    // Tour: the whole globe, right of the copy on wide screens and above it on phones.
    if (mobile) {
      tourR = Math.min(halfW * 0.74, halfH * 0.3);
      tourPosV.set(0, halfH * 0.22, 0);
    } else {
      tourR = Math.min(halfH * 0.56, halfW * 0.36);
      tourPosV.set(halfW * 0.3, -halfH * 0.02, 0);
    }
  }

  function render(frame: GlobeFrame, dt: number, time: number) {
    uTime.value = time;
    const pose = smooth(0, 1, frame.pose);
    const k = 1 - Math.exp(-dt * 5.5);

    /* pose: horizon <-> tour */
    const r = heroR + (tourR - heroR) * pose;
    root.position.lerpVectors(heroPosV, tourPosV, pose);
    root.scale.setScalar(r);
    root.rotation.set(frame.py * 0.05 * pose, frame.px * 0.09 * pose, 0);

    /* orientation */
    // Starts over Europe and North Africa (six of the eleven cities) and drifts east.
    euler.set(-0.62, (-14 - time * 2) * DEG, 0, "XYZ");
    heroQ.setFromEuler(euler);
    const i0 = Math.max(0, Math.min(count - 1, Math.floor(frame.pos)));
    const i1 = Math.min(count - 1, i0 + 1);
    stepQ.slerpQuaternions(tourQ[i0], tourQ[i1], frame.pos - i0);
    // Sit the city a little toward the copy instead of dead center.
    euler.set(mobile ? 0.1 : -0.06, mobile ? 0 : -0.3, 0, "XYZ");
    offsetQ.setFromEuler(euler);
    stepQ.premultiply(offsetQ);
    targetQ.slerpQuaternions(heroQ, stepQ, pose);
    if (!started) {
      globe.quaternion.copy(targetQ);
      started = true;
    } else {
      globe.quaternion.slerp(targetQ, k);
    }

    /* flag waves */
    for (let i = 0; i < count; i++) {
      const on = frame.active === i;
      const targetRad = frame.active < 0 ? 0.3 : on ? 0.96 : 0.1;
      const targetStr = frame.active < 0 ? 0.9 : on ? 1 : 0.5;
      const before = rad[i];
      rad[i] += (targetRad - rad[i]) * (1 - Math.exp(-dt * (on ? 2.4 : 4)));
      str[i] += (targetStr - str[i]) * k;
      const speed = Math.abs(rad[i] - before) / Math.max(dt, 0.001);
      crest[i] += (Math.min(1, speed * 1.6) - crest[i]) * k;
      act[i] += ((on ? 1 : frame.active < 0 ? 0.35 : 0) - act[i]) * k;
    }
    for (let i = count; i < MAX_CITIES; i++) {
      str[i] = 0;
      crest[i] = 0;
    }

    /* atmosphere tint */
    const p = Math.max(0, Math.min(count - 1, frame.palette));
    tintA.value.lerp(colA[p], k * 0.6);
    tintB.value.lerp(colC[p].equals(colA[p]) ? colB[p] : colC[p], k * 0.6);

    /* beam + pulse on the active city */
    if (frame.active >= 0 && frame.active !== beamCity) {
      beamCity = frame.active;
      grow.value = 0;
      const v = cityVec[beamCity];
      beam.position.copy(v);
      beam.quaternion.setFromUnitVectors(UP, v);
      pulse.position.copy(v).multiplyScalar(1.006);
      pulse.quaternion.setFromUnitVectors(OUT, v);
      beamColor.value.copy(colA[beamCity]);
    }
    const settled = frame.active >= 0 && Math.abs(frame.pos - frame.active) < 0.2 ? 1 : 0;
    grow.value += (settled * pose - grow.value) * (1 - Math.exp(-dt * 3));
    beam.scale.set(1, 0.34 * grow.value + 0.0001, 1);

    /* route */
    for (let i = 0; i < arcs.length; i++) {
      const d = Math.max(0, Math.min(1, frame.pos - i));
      arcs[i].mat.uniforms.uDraw.value = d * pose;
      arcs[i].mat.uniforms.uLive.value = d > 0.001 && d < 0.999 ? 1 : 0;
    }

    /* ring: hugs the limb of the planet in either pose */
    const dist = Math.hypot(root.position.x, root.position.y, CAM_Z);
    const limb = 1 / Math.sqrt(Math.max(0.05, 1 - (r / dist) * (r / dist)));
    // The horizon is several times the size of the touring globe, so the strip laps it more
    // times there to keep the words a readable size. The swap happens while the ring is faded.
    const touring = pose > 0.5;
    const laps = touring ? 1 : mobile ? 2 : 4;
    ringRepeat.value = laps;
    ringBand.value = RING_BAND / laps;
    ring.scale.setScalar(limb * (touring ? 1.07 : 1.03));
    ring.rotation.z = time * 0.03;
    ringFade += ((ring.visible ? 1 : 0) - ringFade) * k * 0.5;
    ringAlpha.value = 0.92 * ringFade * smooth(0.04, 0.3, Math.abs(pose - 0.5));

    stars.position.set(-frame.px * 0.5, frame.py * 0.3, 0);
    renderer.render(scene, camera);
  }

  resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);

  return {
    render,
    resize,
    dispose() {
      disposed = true;
      scene.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as ShaderMaterial | undefined;
        mat?.dispose?.();
      });
      ringMat.uniforms.uMap.value?.dispose();
      renderer.dispose();
    },
  };
}

/** Used by the page to size hit areas and by tests to keep the two in step. */
export const GLOBE_MAX_CITIES = MAX_CITIES;
