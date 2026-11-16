"use client";

import { useEffect } from "react";
import type { GlobeFrame, GlobeHandle } from "./globeScene";

/** What the motion layer needs from each stop. The page keeps the full records. */
export type ExperienceStop = {
  city: string;
  lat: number;
  lon: number;
  hello: string;
  display: [string, string, string];
  field: string;
  ink: string;
};

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * The landing page's one driver. A single value (how far the line has travelled) feeds every
 * concept-bearing visual: the globe's pose and flag wave, the giant city name, the active stop,
 * and the page's flag variables. One requestAnimationFrame loop; nothing else listens to scroll.
 *
 * Without motion (reduced motion, no JS) the page is the static layout in `app/landing.css`:
 * every stop listed, nothing pinned. The globe is an enhancement on top: if WebGL or the
 * network says no, the motion layout still works with the CSS horizon and the type.
 */
export function LandingExperience({ stops }: { stops: ExperienceStop[] }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-lv-root]");
    if (!root) return;
    const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
    const qa = <T extends HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

    /* Section reveals work with or without motion. */
    const revealEls = qa("[data-lv-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    revealEls.forEach((el) => io.observe(el));

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const voyage = q("[data-lv-voyage]");
    const stage = q("[data-lv-stage]");
    const hero = q("[data-lv-hero]");
    const outro = q("[data-lv-outro]");
    const stageHost = q("[data-lv-host='stage']");
    const outroHost = q("[data-lv-host='outro']");
    if (reduced || !voyage || !stage || !hero || !outro || !stageHost || !outroHost) {
      return () => io.disconnect();
    }

    const N = stops.length;
    const stopEls = qa("[data-lv-stop]");
    const gotoEls = qa<HTMLButtonElement>("[data-lv-goto]");
    const countEl = q("[data-lv-count]");
    const nextEl = q("[data-lv-next]");
    const nameWrap = q("[data-lv-bigname]");
    const nameText = q("[data-lv-bigname-text]");
    const nameMeasure = q("[data-lv-measure]");

    root.classList.add("lv-motion");

    // The canvas moves between two hosts (the pinned stage and the closing section), so it is
    // created here and never handed to React.
    const canvas = document.createElement("canvas");
    canvas.className = "lv-canvas";
    canvas.setAttribute("aria-hidden", "true");
    stageHost.appendChild(canvas);

    let disposed = false;
    let handle: GlobeHandle | null = null;
    let lenis: { raf: (t: number) => void; destroy: () => void; scrollTo: (y: number, o?: object) => void } | null = null;
    let host: "stage" | "outro" = "stage";
    let index = -1;
    let palette = -1;
    let nameTimer = 0;
    let stopPx = 1;
    let heroH = 1;
    let vh = window.innerHeight;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const frame: GlobeFrame = { pose: 0, pos: 0, active: -1, palette: 0, px: 0, py: 0 };

    /* Smooth scroll for wheel and keyboard; touch keeps the platform's own scrolling. */
    import("lenis")
      .then(({ default: Lenis }) => {
        if (disposed) return;
        lenis = new Lenis({ autoRaf: false, lerp: 0.11, anchors: true });
      })
      .catch(() => undefined);

    function fitName() {
      if (!nameText || !nameMeasure || !nameWrap) return;
      nameMeasure.textContent = nameText.textContent;
      const w100 = nameMeasure.getBoundingClientRect().width || 1;
      const narrow = window.innerWidth < 760;
      const avail = nameWrap.clientWidth;
      const maxH = vh * (narrow ? 0.17 : 0.33);
      nameText.style.fontSize = `${Math.min((avail / w100) * 100, maxH / 0.74)}px`;
    }

    function setIndex(i: number) {
      if (i === index) return;
      const first = index < 0;
      index = i;
      stopEls.forEach((el, k) => {
        el.toggleAttribute("data-active", k === i);
        el.toggleAttribute("data-past", k < i);
      });
      gotoEls.forEach((el, k) => {
        if (k === i) el.setAttribute("aria-current", "true");
        else el.removeAttribute("aria-current");
      });
      if (countEl) countEl.textContent = String(i + 1).padStart(2, "0");
      if (nextEl) nextEl.textContent = stops[i + 1] ? `Next stop: ${stops[i + 1].city}` : "Last stop. Your turn.";
      if (nameWrap && nameText) {
        window.clearTimeout(nameTimer);
        const swap = () => {
          nameText.textContent = stops[i].city;
          fitName();
          nameWrap.classList.remove("is-out");
        };
        if (first) swap();
        else {
          nameWrap.classList.add("is-out");
          nameTimer = window.setTimeout(swap, 190);
        }
      }
    }

    function setPalette(p: number) {
      if (p === palette) return;
      palette = p;
      const s = stops[p];
      root!.style.setProperty("--g1", s.display[0]);
      root!.style.setProperty("--g2", s.display[1]);
      root!.style.setProperty("--g3", s.display[2]);
      root!.style.setProperty("--field", s.field);
      root!.style.setProperty("--field-ink", s.ink);
    }

    function measure() {
      vh = window.innerHeight;
      heroH = hero!.offsetHeight;
      stopPx = Math.max(1, (voyage!.offsetHeight - stage!.offsetHeight - heroH) / N);
      fitName();
      if (handle) {
        const h = host === "stage" ? stageHost! : outroHost!;
        handle.resize(h.clientWidth, h.clientHeight);
      }
    }

    function moveCanvas(to: "stage" | "outro") {
      if (to === host) return;
      host = to;
      const h = to === "stage" ? stageHost! : outroHost!;
      h.appendChild(canvas);
      handle?.resize(h.clientWidth, h.clientHeight);
    }

    const t0 = performance.now();
    let last = t0;
    let raf = 0;
    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const time = (now - t0) / 1000;
      lenis?.raf(now);

      const vr = voyage!.getBoundingClientRect();
      const or = outro!.getBoundingClientRect();
      const scrolled = -vr.top;
      const heroP = clamp(scrolled / heroH);
      const raw = clamp((scrolled - heroH) / stopPx - 0.5, 0, N - 1);
      const whole = Math.floor(raw);
      const pos = whole + smooth(0.18, 0.82, raw - whole);
      const voyageOn = vr.bottom > 0;
      const outroOn = or.top < vh * 1.15 && !voyageOn;
      const inTour = voyageOn && heroP > 0.6;
      const cycle = Math.floor(time / 2.6) % N;

      setIndex(Math.round(raw));
      setPalette(inTour ? index : cycle);
      moveCanvas(outroOn ? "outro" : "stage");

      const arrive = smooth(0.5, 1, heroP);
      stage!.style.setProperty("--arrive", arrive.toFixed(3));
      stage!.toggleAttribute("data-on", arrive > 0.01);
      stage!.toggleAttribute("data-live", arrive > 0.85);

      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      if (handle && (voyageOn || or.top < vh * 1.15)) {
        frame.pose = outroOn ? 0 : heroP;
        frame.pos = pos;
        frame.active = inTour ? index : -1;
        frame.palette = palette;
        frame.px = pointer.x;
        frame.py = pointer.y;
        handle.render(frame, dt, time);
      }
    }

    const onPointer = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    let lastW = window.innerWidth;
    let lastH = window.innerHeight;
    const onResize = () => {
      // Phones resize the viewport every time the URL bar slides; that is not a layout change.
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w === lastW && Math.abs(h - lastH) < 140) return;
      lastW = w;
      lastH = h;
      measure();
    };
    const onGoto = (e: Event) => {
      const i = Number((e.currentTarget as HTMLElement).dataset.lvGoto);
      const y = window.scrollY + voyage!.getBoundingClientRect().top + heroH + (i + 0.5) * stopPx;
      if (lenis) lenis.scrollTo(y, { duration: 1.1 });
      else window.scrollTo({ top: y, behavior: "smooth" });
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("resize", onResize);
    gotoEls.forEach((el) => el.addEventListener("click", onGoto));
    measure();
    document.fonts?.ready.then(() => !disposed && fitName()).catch(() => undefined);
    raf = requestAnimationFrame(tick);

    /* The globe: after first paint, and only where it will run well. */
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    let webgl = false;
    try {
      webgl = !!document.createElement("canvas").getContext("webgl2");
    } catch {
      webgl = false;
    }
    if (webgl && !saveData) {
      const family = getComputedStyle(root).getPropertyValue("--font-archivo").split(",")[0].trim() || "sans-serif";
      import("./globeScene")
        .then(({ createGlobe }) =>
          createGlobe(
            canvas,
            stops.map((s) => ({ lat: s.lat, lon: s.lon, colors: s.display, label: s.hello.toLocaleUpperCase() })),
            family,
          ),
        )
        .then((h) => {
          if (disposed) {
            h.dispose();
            return;
          }
          handle = h;
          measure();
          root.classList.add("lv-gl");
        })
        .catch(() => undefined);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(nameTimer);
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
      gotoEls.forEach((el) => el.removeEventListener("click", onGoto));
      lenis?.destroy();
      handle?.dispose();
      canvas.remove();
      root.classList.remove("lv-motion", "lv-gl");
    };
  }, [stops]);

  return null;
}
