"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CORNER_STEPS,
  PORTAL_FOCAL,
  PORTAL_RADIUS,
  clamp,
  drawCoverMedia,
  easeInOutCubic,
  lerp,
  pathFromPoints,
  projectPolygon,
  sampleRoundedRect,
  withAlpha,
} from "./portalGeometry";
import { CustomCursor } from "./CustomCursor";
import { PORTAL_VIBES, type PortalVibe } from "@/lib/portalVibes";

/** Total length of the zoom-through transition. */
const EXPAND_MS = 1100;
/** Pointer tilt limits, in degrees (from the design spec). */
const TILT_Y_MAX = 37.4;
const TILT_X_MAX = -33;
/** Idle auto-advance between destinations. */
const AUTOPLAY_MS = 6200;
/** Crossfade length after a destination switch. */
const SWITCH_FADE_MS = 420;
/** Colour the screen fades to as the portal swallows the viewport. */
const APP_BG = "#0b0d0f";

type PortalState = {
  rotX: number;
  rotY: number;
  pointerX: number;
  pointerY: number;
  expand: number;
  expandStart: number;
  expanding: boolean;
  entered: boolean;
  lastT: number;
  switchT: number;
  reduced: boolean;
  canHover: boolean;
};

export function CinematicPortal({
  vibes = PORTAL_VIBES,
  onEnter,
  onSkip,
}: {
  vibes?: PortalVibe[];
  onEnter: () => void;
  onSkip?: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [index, setIndex] = useState(0);
  const [expanding, setExpanding] = useState(false);

  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;
  const indexRef = useRef(index);
  indexRef.current = index;
  const vibesRef = useRef(vibes);
  vibesRef.current = vibes;

  const state = useRef<PortalState>({
    rotX: -6,
    rotY: 9,
    pointerX: 0.5,
    pointerY: 0.5,
    expand: 0,
    expandStart: 0,
    expanding: false,
    entered: false,
    lastT: 0,
    switchT: 1,
    reduced: false,
    canHover: true,
  });

  // Keep the destination media (image + optional hidden video) in sync.
  useEffect(() => {
    const vibe = vibesRef.current[index];
    if (!vibe) return;
    state.current.switchT = 0;

    if (!imageRef.current) {
      imageRef.current = new Image();
      imageRef.current.crossOrigin = "anonymous";
      imageRef.current.decoding = "async";
    }
    imageRef.current.src = vibe.poster;

    const video = videoRef.current;
    if (video) {
      if (vibe.video) {
        if (video.getAttribute("src") !== vibe.video) {
          video.src = vibe.video;
          video.load();
        }
        void video.play().catch(() => undefined);
      } else {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    }

    // Warm the next poster so switches stay smooth.
    const next = vibesRef.current[(index + 1) % vibesRef.current.length];
    if (next) {
      const preload = new Image();
      preload.crossOrigin = "anonymous";
      preload.src = next.poster;
    }
  }, [index]);

  // Auto-advance destinations while the user is still deciding.
  useEffect(() => {
    if (expanding || state.current.reduced || vibes.length < 2) return;
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % vibes.length);
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [index, expanding, vibes.length]);

  // Lock scrolling (no scrollbars during the intro) and restore on unmount.
  useEffect(() => {
    const html = document.documentElement;
    const { overflow: prevHtml } = html.style;
    const { overflow: prevBody } = document.body.style;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  const enter = useCallback(() => {
    const s = state.current;
    if (s.expanding || s.entered) return;
    s.expanding = true;
    setExpanding(true);
    if (s.reduced) {
      s.entered = true;
      onEnterRef.current();
      return;
    }
    s.expandStart = performance.now();
  }, []);

  // Canvas render loop: geometry, media sampling, pointer easing, transition.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = state.current;
    s.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    s.canHover = window.matchMedia("(hover: hover)").matches;

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;

    const frame = (now: number) => {
      const dt = clamp(now - (s.lastT || now), 0, 50);
      s.lastT = now;

      const cw = canvas.width / dpr;
      const ch = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      const vibesNow = vibesRef.current;
      const vibe = vibesNow[indexRef.current] ?? vibesNow[0];

      // ---- easing ------------------------------------------------------
      s.switchT = clamp(s.switchT + dt / SWITCH_FADE_MS, 0, 1);
      const ease = 1 - Math.exp(-dt / 90); // frame-rate-independent lerp

      if (s.expanding) {
        const p = clamp((now - s.expandStart) / EXPAND_MS, 0, 1);
        s.expand = s.reduced ? 1 : easeInOutCubic(p);
        s.rotX = lerp(s.rotX, 0, s.expand);
        s.rotY = lerp(s.rotY, 0, s.expand);
        if (p >= 1 && !s.entered) {
          s.entered = true;
          onEnterRef.current();
        }
      } else if (s.reduced) {
        s.rotX = 0;
        s.rotY = 0;
      } else {
        const ambX = Math.sin(now / 2600) * 3.4;
        const ambY = Math.cos(now / 3100) * 2.6;
        const targetX = (s.pointerY - 0.5) * TILT_X_MAX + ambX;
        const targetY = (s.pointerX - 0.5) * TILT_Y_MAX + ambY;
        s.rotX = lerp(s.rotX, targetX, ease);
        s.rotY = lerp(s.rotY, targetY, ease);
      }

      // ---- media sampling (screen-locked cover) ------------------------
      const video = videoRef.current;
      const image = imageRef.current;
      let media: HTMLVideoElement | HTMLImageElement | null = null;
      let mw = 0;
      let mh = 0;
      if (vibe?.video && video && video.readyState >= 2 && video.videoWidth > 0) {
        media = video;
        mw = video.videoWidth;
        mh = video.videoHeight;
      } else if (image && image.complete && image.naturalWidth > 0) {
        media = image;
        mw = image.naturalWidth;
        mh = image.naturalHeight;
      }

      const tiltN = { x: s.rotX / TILT_X_MAX, y: s.rotY / TILT_Y_MAX };
      const alpha = s.switchT;

      // ---- background layer -------------------------------------------
      ctx.fillStyle = "#050607";
      ctx.fillRect(0, 0, cw, ch);
      drawCoverMedia(
        ctx,
        media,
        mw,
        mh,
        -60 + tiltN.y * 26,
        -60 + tiltN.x * 26,
        cw + 120,
        ch + 120,
        0.42 * alpha,
      );

      // ---- portal window ----------------------------------------------
      const baseW = Math.min(cw * 0.86, 1180);
      const baseH = clamp(baseW * 0.54, 240, ch * 0.78);
      const rect = sampleRoundedRect(
        cw / 2,
        ch / 2,
        lerp(baseW, cw * 1.4, s.expand),
        lerp(baseH, ch * 1.4, s.expand),
        lerp(PORTAL_RADIUS, 0, s.expand),
        CORNER_STEPS,
      );
      const polygon = projectPolygon(rect, s.rotX, s.rotY, cw / 2, ch / 2, PORTAL_FOCAL);

      const glow = vibe?.accent ?? "#4ade80";

      ctx.save();
      pathFromPoints(ctx, polygon);
      ctx.clip();

      // Interior base so the window reads even before the image decodes.
      const base = ctx.createLinearGradient(0, ch / 2 - baseH / 2, 0, ch / 2 + baseH / 2);
      base.addColorStop(0, "rgba(255,255,255,0.06)");
      base.addColorStop(1, "rgba(255,255,255,0.01)");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, cw, ch);

      drawCoverMedia(
        ctx,
        media,
        mw,
        mh,
        -110 + tiltN.y * 62,
        -110 + tiltN.x * 62,
        cw + 220,
        ch + 220,
        alpha,
      );

      const shade = ctx.createLinearGradient(0, 0, 0, ch);
      shade.addColorStop(0, "rgba(0,0,0,0.5)");
      shade.addColorStop(0.42, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();

      // ---- rim + transition flash -------------------------------------
      ctx.save();
      pathFromPoints(ctx, polygon);
      ctx.lineWidth = lerp(1.6, 0, s.expand);
      ctx.strokeStyle = withAlpha(glow, 0.8 * (1 - s.expand));
      ctx.shadowColor = withAlpha(glow, 0.9);
      ctx.shadowBlur = 28;
      ctx.stroke();
      ctx.restore();

      if (s.expand > 0.7) {
        const fade = clamp((s.expand - 0.7) / 0.3, 0, 1);
        ctx.fillStyle = withAlpha(APP_BG, fade);
        ctx.fillRect(0, 0, cw, ch);
      }

      raf = window.requestAnimationFrame(frame);
    };

    raf = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const s = state.current;
    if (s.reduced || !s.canHover || s.expanding) return;
    s.pointerX = event.clientX / window.innerWidth;
    s.pointerY = event.clientY / window.innerHeight;
  };

  const onActivate = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-portal-control]")) return;
    enter();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      enter();
    }
  };

  const vibe = vibes[index];

  return (
    <div
      ref={wrapRef}
      role="button"
      tabIndex={0}
      aria-label="Enter Street Vibe"
      onClick={onActivate}
      onKeyDown={onKeyDown}
      onPointerMove={onPointerMove}
      className="fixed inset-0 z-[120] touch-none select-none overflow-hidden bg-[#050607] text-white outline-none [@media(hover:hover)]:cursor-none"
    >
      <video
        ref={videoRef}
        aria-hidden
        muted
        loop
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <div
        className={`pointer-events-none absolute inset-0 flex flex-col px-5 py-6 transition-opacity duration-500 sm:px-9 sm:py-8 ${
          expanding ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="font-heading text-[15px] font-extrabold tracking-tight text-white/90 sm:text-[17px]">
            Street&nbsp;Vibe
          </span>
          {onSkip ? (
            <button
              type="button"
              data-portal-control
              data-magnetic
              data-cursor-label="Skip"
              onClick={(event) => {
                event.stopPropagation();
                onSkip();
              }}
              className="pointer-events-auto rounded-full border border-white/20 px-3.5 py-1.5 text-[12px] font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              Skip intro
            </button>
          ) : null}
        </div>

        <div className="mt-6 max-w-2xl self-center text-center sm:mt-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">
            {vibe?.city}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold leading-[1.02] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.8)] sm:text-5xl">
            {vibe?.title}
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-white/65 sm:text-[16px]">
            {vibe?.tagline}
          </p>
          <p
            dir={vibe?.sampleDir}
            className="mt-3 text-[15px] font-semibold text-white/85 sm:text-[17px]"
          >
            {vibe?.sample}
          </p>
        </div>

        <div className="flex-1" />

        <div className="flex flex-col items-center gap-4">
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
            {vibes.map((v, i) => (
              <button
                key={v.id}
                type="button"
                data-portal-control
                data-magnetic
                data-cursor-label={v.title}
                aria-pressed={i === index}
                onClick={(event) => {
                  event.stopPropagation();
                  setIndex(i);
                }}
                className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                  i === index
                    ? "border-transparent text-black"
                    : "border-white/20 text-white/65 hover:bg-white/10 hover:text-white"
                }`}
                style={i === index ? { backgroundColor: v.accent } : undefined}
              >
                {v.title}
              </button>
            ))}
          </div>

          <button
            type="button"
            data-magnetic
            data-cursor-label="Enter"
            onClick={(event) => {
              event.stopPropagation();
              enter();
            }}
            className="pointer-events-auto rounded-full px-6 py-3 text-[15px] font-bold text-black transition-transform hover:scale-[1.03]"
            style={{ backgroundColor: vibe?.accent ?? "#4ade80" }}
          >
            Step through the portal
          </button>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
            {(vibe?.stats ?? []).map((stat) => (
              <div key={stat.label} className="text-center">
                <span className="font-heading text-[15px] font-bold text-white">{stat.value}</span>
                <span className="ml-1.5 text-[11px] uppercase tracking-[0.14em] text-white/45">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[11px] uppercase tracking-[0.2em] text-white/35">
            Move to look around · click to step through
          </p>
        </div>
      </div>

      <CustomCursor accent={vibe?.accent ?? "#4ade80"} />
    </div>
  );
}
