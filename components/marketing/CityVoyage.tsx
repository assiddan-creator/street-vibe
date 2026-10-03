"use client";

/* eslint-disable @next/next/no-img-element -- the background must use the exact same srcset as the
   canvas portal images (see loadCityImage) so the hand-off after a travel is pixel-identical. */

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { CITY_SCENES, cityImageSrcSet, cityImageUrl } from "@/lib/landingCities";
import s from "./CityVoyage.module.css";

/**
 * Landing hero: a "voyage" between the app's street-dialect cities, adapted from the MotionSites
 * "Space Voyage" concept. A full-size canvas paints a tilting rounded window (fake 3D) through
 * which the NEXT city's art is visible, screen-locked in cover mode. Clicking the window grows it
 * to fill the hero, then the page commits to that city and a new window opens on the one after.
 */

const N = CITY_SCENES.length;
const FOCAL = 850;
/** Base dim of the shade layer — must match `.shade` in the CSS module. */
const DIM = 0.3;
const PRELOAD_MIN_MS = 1500;
const PRELOAD_MAX_MS = 6000;

const loadedImages = new Map<string, HTMLImageElement>();
const imageRequests = new Map<string, Promise<HTMLImageElement>>();

/** Same `srcset` + `sizes` as the background <img>, so the browser picks (and caches) the same file. */
function loadCityImage(src: string): Promise<HTMLImageElement> {
  let request = imageRequests.get(src);
  if (!request) {
    request = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.sizes = "100vw";
      img.srcset = cityImageSrcSet(src);
      img.src = cityImageUrl(src, 1080);
      img.onload = () => {
        loadedImages.set(src, img);
        resolve(img);
      };
      img.onerror = () => {
        imageRequests.delete(src);
        reject(new Error(`Failed to load ${src}`));
      };
    });
    imageRequests.set(src, request);
  }
  return request;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

type Engine = {
  index: number;
  portalIndex: number;
  busy: boolean;
  reduced: boolean;
  preloaded: boolean;
  shown: number;
  expansion: number;
  maskScale: number;
  rotX: number;
  rotY: number;
  targetX: number;
  targetY: number;
  /** Image shown in the window while it grows to fill the hero. */
  transition: HTMLImageElement | null;
  /** Full-hero image held under the mask until the new background <img> has painted. */
  frozen: HTMLImageElement | null;
  pointerX: number;
  pointerY: number;
  cursorX: number;
  cursorY: number;
};

/** `note` = the small line next to the hero CTA; " · " splits it onto two lines. */
export function CityVoyage({ note }: { note: string }) {
  const [index, setIndex] = useState(0);
  const [introDone, setIntroDone] = useState(false);

  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const portalRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLImageElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const travelRef = useRef<(to?: number) => void>(() => {});
  const engine = useRef<Engine>({
    index: 0,
    portalIndex: 1 % N,
    busy: true,
    reduced: false,
    preloaded: false,
    shown: 0,
    expansion: 0,
    maskScale: 0,
    rotX: 0,
    rotY: 0,
    targetX: 0,
    targetY: 0,
    transition: null,
    frozen: null,
    pointerX: 0,
    pointerY: 0,
    cursorX: 0,
    cursorY: 0,
  });

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const portal = portalRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !portal || !ctx) return;

    const E = engine.current;
    E.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let disposed = false;
    let raf = 0;
    let last = performance.now();
    let visible = true;
    let W = 0;
    let H = 0;
    let radius = 90;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const retrigger = (el: Element, cls: string) => {
      el.classList.remove(cls);
      void (el as HTMLElement).offsetWidth;
      el.classList.add(cls);
    };

    const animateValue = (set: (v: number) => void, ms: number) =>
      new Promise<void>((resolve) => {
        if (E.reduced || ms <= 0) {
          set(1);
          resolve();
          return;
        }
        const start = performance.now();
        const step = (t: number) => {
          if (disposed) return resolve();
          const p = Math.min(1, (t - start) / ms);
          set(easeInOutCubic(p));
          if (p < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });

    const resize = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      W = root.clientWidth;
      H = root.clientHeight;
      canvas.width = Math.round(W * d);
      canvas.height = Math.round(H * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      radius = parseFloat(getComputedStyle(portal).borderTopLeftRadius) || 90;
    };

    const drawCover = (img: HTMLImageElement, zoom: number) => {
      const mw = img.naturalWidth;
      const mh = img.naturalHeight;
      if (!mw || !mh) return;
      const scale = Math.max(W / mw, H / mh) * zoom;
      const w = mw * scale;
      const h = mh * scale;
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    };

    const drawShade = (alpha: number) => {
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgba(0,0,0,${DIM})`;
      ctx.fillRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "rgba(0,0,0,0.35)");
      g.addColorStop(0.22, "rgba(0,0,0,0)");
      g.addColorStop(0.45, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.9)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    };

    /** Rounded rect sampled along its corner arcs, rotated in fake 3D and projected. */
    const tracePortal = (cx: number, cy: number, w: number, h: number, r: number, rx: number, ry: number) => {
      const rr = Math.max(0, Math.min(r, w / 2, h / 2));
      const corners: [number, number, number, number][] = [
        [w / 2 - rr, -h / 2 + rr, -Math.PI / 2, 0],
        [w / 2 - rr, h / 2 - rr, 0, Math.PI / 2],
        [-w / 2 + rr, h / 2 - rr, Math.PI / 2, Math.PI],
        [-w / 2 + rr, -h / 2 + rr, Math.PI, Math.PI * 1.5],
      ];
      const ax = (rx * Math.PI) / 180;
      const ay = (ry * Math.PI) / 180;
      const cosX = Math.cos(ax);
      const sinX = Math.sin(ax);
      const cosY = Math.cos(ay);
      const sinY = Math.sin(ay);
      ctx.beginPath();
      let first = true;
      for (const [ox, oy, a0, a1] of corners) {
        for (let i = 0; i <= 10; i++) {
          const a = a0 + ((a1 - a0) * i) / 10;
          const x = ox + Math.cos(a) * rr;
          const y = oy + Math.sin(a) * rr;
          const z = x * sinY - y * sinX;
          const p = FOCAL / (FOCAL + z);
          const sx = cx + x * cosY * p;
          const sy = cy + y * cosX * p;
          if (first) {
            ctx.moveTo(sx, sy);
            first = false;
          } else ctx.lineTo(sx, sy);
        }
      }
      ctx.closePath();
    };

    const cursor = cursorRef.current;
    const countEl = countRef.current;
    const preloadStart = performance.now();
    let preloadCount = 0;

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(40, t - last);
      last = t;

      if (cursor) {
        E.cursorX += (E.pointerX - E.cursorX) * 0.2;
        E.cursorY += (E.pointerY - E.cursorY) * 0.2;
        cursor.style.transform = `translate3d(${E.cursorX}px,${E.cursorY}px,0)`;
      }

      if (!E.preloaded) {
        const elapsed = t - preloadStart;
        const timeP = E.reduced ? 1 : Math.min(1, elapsed / PRELOAD_MIN_MS);
        const loadP = elapsed > PRELOAD_MAX_MS ? 1 : preloadCount / 2;
        const target = Math.min(timeP, loadP) * 100;
        E.shown = E.reduced ? target : E.shown + (target - E.shown) * Math.min(1, dt * 0.012);
        if (countEl) countEl.textContent = String(Math.round(E.shown));
        if (target >= 100 && E.shown > 99.4) finishPreload();
      }

      if (!visible) return;

      E.rotX += (E.targetX - E.rotX) * Math.min(1, dt * 0.009);
      E.rotY += (E.targetY - E.rotY) * Math.min(1, dt * 0.009);

      ctx.clearRect(0, 0, W, H);
      if (E.frozen) {
        drawCover(E.frozen, 1);
        drawShade(1);
      }

      const hero = root.getBoundingClientRect();
      const pr = portal.getBoundingClientRect();
      const e = E.expansion;
      const rcx = pr.left - hero.left + pr.width / 2;
      const rcy = pr.top - hero.top + pr.height / 2;
      const cx = rcx + (W / 2 - rcx) * e;
      const cy = rcy + (H / 2 - rcy) * e;
      const scale = e ? 1 : E.maskScale;
      const w = (pr.width + (W - pr.width) * e) * scale;
      const h = (pr.height + (H - pr.height) * e) * scale;
      if (w <= 1 || h <= 1) return;

      tracePortal(cx, cy, w, h, radius * (1 - e) * scale, E.rotX * (1 - e), E.rotY * (1 - e));
      ctx.save();
      ctx.clip();
      ctx.fillStyle = "#030303";
      ctx.fillRect(0, 0, W, H);
      const scene = CITY_SCENES[E.portalIndex];
      const img = E.transition ?? loadedImages.get(scene.image);
      if (img) drawCover(img, 1 + 0.18 * (1 - e));
      drawShade(e);
      ctx.restore();
      if (e < 1) {
        ctx.save();
        ctx.globalAlpha = 0.8 * (1 - e) * scale;
        ctx.strokeStyle = scene.primary;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
    };

    const revealMask = () => {
      retrigger(root, s.maskRevealing);
      E.maskScale = 0;
      return animateValue((v) => {
        E.maskScale = v;
      }, 1050);
    };
    const revealContent = () => retrigger(root, s.contentRevealing);

    const finishPreload = async () => {
      if (E.preloaded) return;
      E.preloaded = true;
      if (countEl) countEl.textContent = "100";
      root.classList.add(s.preloadComplete);
      setIntroDone(true);
      root.classList.add(s.introReady);
      const mask = revealMask();
      timers.push(setTimeout(revealContent, E.reduced ? 0 : 350));
      await mask;
      E.busy = false;
    };

    const travel = async (target?: number) => {
      if (E.busy || disposed) return;
      const from = E.index;
      const to = target ?? (from + 1) % N;
      if (to === from) return;
      E.busy = true;
      E.targetX = 0;
      E.targetY = 0;
      try {
        root.classList.add(s.isLoading);
        const img = await withTimeout(loadCityImage(CITY_SCENES[to].image), 5000);
        E.portalIndex = to;
        E.transition = img;
        E.maskScale = 1;
        root.classList.remove(s.isLoading, s.contentRevealing, s.maskRevealing);
        root.classList.add(s.isTransitioning);
        await animateValue((v) => {
          E.expansion = v;
        }, 1100);

        // Commit: hold the full-hero image while React swaps the background underneath.
        E.frozen = img;
        E.index = to;
        flushSync(() => setIndex(to));
        const bg = bgRef.current;
        if (bg) await withTimeout(bg.decode(), 1500).catch(() => {});
        await nextFrame();
        await nextFrame();

        const after = (to + 1) % N;
        E.transition = null;
        E.frozen = null;
        E.expansion = 0;
        E.maskScale = 0;
        E.portalIndex = after;
        void loadCityImage(CITY_SCENES[after].image).catch(() => {});
        root.classList.remove(s.isTransitioning);
        if (listRef.current) retrigger(listRef.current, s.isSwitching);
        const mask = revealMask();
        timers.push(setTimeout(revealContent, E.reduced ? 0 : 100));
        await mask;
      } catch {
        E.transition = null;
        E.frozen = null;
        E.expansion = 0;
        E.maskScale = 1;
        E.portalIndex = (E.index + 1) % N;
        root.classList.remove(s.isLoading, s.isTransitioning);
        retrigger(root, s.maskRevealing);
        revealContent();
      } finally {
        E.busy = false;
      }
    };
    travelRef.current = (to?: number) => void travel(to);

    const onPointerMove = (ev: PointerEvent) => {
      E.pointerX = ev.clientX;
      E.pointerY = ev.clientY;
      cursor?.classList.add(s.isVisible);
      if (ev.pointerType !== "mouse" || E.busy || E.reduced) return;
      const hero = root.getBoundingClientRect();
      E.targetY = ((ev.clientX - hero.left) / hero.width - 0.5) * 37.4;
      E.targetX = ((ev.clientY - hero.top) / hero.height - 0.5) * -33;
    };
    const onPointerLeave = () => {
      E.targetX = 0;
      E.targetY = 0;
      cursor?.classList.remove(s.isVisible);
    };
    const onPortalEnter = () => cursor?.classList.add(s.isEnter);
    const onPortalLeave = () => cursor?.classList.remove(s.isEnter);

    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerleave", onPointerLeave);
    portal.addEventListener("pointerenter", onPortalEnter);
    portal.addEventListener("pointerleave", onPortalLeave);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    visibilityObserver.observe(root);

    resize();
    for (const i of [E.index, E.portalIndex]) {
      loadCityImage(CITY_SCENES[i].image)
        .catch(() => {})
        .finally(() => {
          preloadCount++;
        });
    }
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      portal.removeEventListener("pointerenter", onPortalEnter);
      portal.removeEventListener("pointerleave", onPortalLeave);
      travelRef.current = () => {};
    };
  }, []);

  const scene = CITY_SCENES[index];
  const nextIndex = (index + 1) % N;
  const next = CITY_SCENES[nextIndex];
  const themeVars = {
    "--c-primary": scene.primary,
    "--c-secondary": scene.secondary,
    "--c-tertiary": scene.tertiary,
    "--c-next": next.primary,
  } as CSSProperties;

  return (
    <section ref={rootRef} className={s.experience} style={themeVars} aria-label="Street Vibe cities">
      <noscript
        dangerouslySetInnerHTML={{
          __html:
            "<style>[data-sv-reveal]{opacity:1!important}[data-sv-preloader]{display:none!important}" +
            "[data-sv-logo]{left:var(--gutter)!important;top:calc(var(--top) + 21px)!important;font-size:22px!important;transform:translate(0,-50%)!important}</style>",
        }}
      />

      <img
        ref={bgRef}
        key={scene.dialect}
        className={`${s.bg} ${introDone ? "" : s.approach}`}
        src={cityImageUrl(scene.image, 1080)}
        srcSet={cityImageSrcSet(scene.image)}
        sizes="100vw"
        alt=""
        decoding="async"
      />
      <div className={s.shade} aria-hidden="true" />

      <div className={s.preloader} data-sv-preloader aria-hidden="true" />
      <span className={s.logo} data-sv-logo>
        Street Vibe
      </span>
      <div className={s.count} data-sv-preloader aria-hidden="true">
        <span ref={countRef} className={s.countValue}>
          0
        </span>
        <span className={s.percent}>%</span>
      </div>

      <canvas ref={canvasRef} className={s.portalCanvas} aria-hidden="true" />

      <header className={`${s.chrome} ${s.header}`} data-sv-reveal>
        <nav className={s.nav} aria-label="Primary">
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <Link href="/app" className={s.menu}>
          Open the app
        </Link>
      </header>

      <nav ref={listRef} className={`${s.chrome} ${s.list}`} aria-label="Cities" data-sv-reveal>
        {CITY_SCENES.map((c, i) => (
          <button
            key={c.dialect}
            type="button"
            className={`${s.listItem} ${i === index ? s.active : ""}`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => travelRef.current(i)}
          >
            {c.city}
          </button>
        ))}
      </nav>

      <div className={`${s.chrome} ${s.portalWrap}`}>
        <div className={s.heading} data-sv-reveal>
          <span>Next:</span>
          <span>
            [{pad(nextIndex + 1)}]<strong>{next.city}</strong>
          </span>
        </div>
        <button
          ref={portalRef}
          type="button"
          className={s.portal}
          aria-label={`Travel to ${next.city}`}
          onClick={() => travelRef.current()}
        />
      </div>

      <div className={`${s.chrome} ${s.content}`}>
        <div className={s.titleBlock}>
          <h1 className={s.tagline} data-sv-reveal>
            Talk like a local, not a tourist.
          </h1>
          <p
            className={s.title}
            style={{ "--len": scene.city.length } as CSSProperties}
            aria-live="polite"
            data-sv-reveal
          >
            {scene.city}
          </p>
        </div>
        <div className={s.facts}>
          <dl>
            <div className={s.fact} data-sv-reveal>
              <dt>Dialect</dt>
              <dd>{scene.dialect}</dd>
            </div>
            <div className={s.fact} data-sv-reveal>
              <dt>Tourist</dt>
              <dd className={s.tourist} dir="auto">
                {scene.tourist}
              </dd>
            </div>
            <div className={s.fact} data-sv-reveal>
              <dt>Local</dt>
              <dd className={s.local} dir="auto">
                {scene.local}
              </dd>
            </div>
          </dl>
          <div className={s.cta} data-sv-reveal>
            <Link href="/app" className={s.ctaButton}>
              Open the app
            </Link>
            <span className={s.ctaNote}>
              {note.split(" · ").map((part) => (
                <span key={part} className="block">
                  {part}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>

      <div className={s.loading} aria-hidden="true">
        Finding the next city…
      </div>
      <div ref={cursorRef} className={s.cursor} aria-hidden="true">
        <span className={s.cursorOrbit} />
        <span className={s.cursorDot} />
        <span className={s.cursorLabel}>Travel</span>
      </div>
    </section>
  );
}
