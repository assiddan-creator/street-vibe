"use client";

import { useEffect, useRef } from "react";
import { lerp } from "./portalGeometry";

/**
 * Standalone eased cursor for the portal intro.
 *
 * A crisp dot tracks the real pointer 1:1 while a ring lags behind it on a
 * frame-rate-independent lerp, so the two never look glued together. Elements
 * marked `data-magnetic` (optionally with `data-cursor-label`) pull the ring
 * toward their centre and grow it — the "magnetic" hover cue.
 *
 * Disabled entirely on touch devices and when the user asks for reduced motion,
 * in which case the native cursor is left alone.
 */
export function CustomCursor({ accent = "#4ade80" }: { accent?: string }) {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(hover: none)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!dot || !ring) return;

    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let ringX = pointerX;
    let ringY = pointerY;
    let pullX = 0;
    let pullY = 0;
    let hovering = false;
    let last = performance.now();
    let raf = 0;

    let magnetics: HTMLElement[] = [];
    const refreshTargets = () => {
      magnetics = Array.from(document.querySelectorAll<HTMLElement>("[data-magnetic]"));
    };
    refreshTargets();

    const MAGNET_RADIUS = 150;

    const onMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;

      let nearest: HTMLElement | null = null;
      let nearestDist = MAGNET_RADIUS;
      for (const el of magnetics) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        const dx = rect.left + rect.width / 2 - pointerX;
        const dy = rect.top + rect.height / 2 - pointerY;
        const dist = Math.hypot(dx, dy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = el;
        }
      }

      if (nearest) {
        const rect = nearest.getBoundingClientRect();
        const strength = (1 - nearestDist / MAGNET_RADIUS) * 0.4;
        pullX = (rect.left + rect.width / 2 - pointerX) * strength;
        pullY = (rect.top + rect.height / 2 - pointerY) * strength;
        hovering = true;
        if (label) label.textContent = nearest.dataset.cursorLabel ?? "";
      } else {
        pullX = 0;
        pullY = 0;
        hovering = false;
        if (label) label.textContent = "";
      }
    };

    const onLeave = () => {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };
    const onEnter = () => {
      dot.style.opacity = "1";
      ring.style.opacity = "1";
    };

    const observer = new MutationObserver(refreshTargets);
    observer.observe(document.body, { childList: true, subtree: true });

    const loop = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      const k = 1 - Math.exp(-dt / 70);
      ringX = lerp(ringX, pointerX + pullX, k);
      ringY = lerp(ringY, pointerY + pullY, k);

      dot.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${
        hovering ? 1.8 : 1
      })`;

      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerenter", onEnter);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerenter", onEnter);
      observer.disconnect();
    };
  }, [accent]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[130] hidden [@media(hover:hover)]:block">
      <div
        ref={dotRef}
        className="fixed left-0 top-0 h-1.5 w-1.5 rounded-full bg-white transition-opacity duration-200"
        style={{ opacity: 0 }}
      />
      <div
        ref={ringRef}
        className="fixed left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border transition-opacity duration-200"
        style={{ opacity: 0, borderColor: accent, boxShadow: `0 0 18px ${accent}55` }}
      >
        <span
          ref={labelRef}
          className="whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.14em] text-white/85"
        />
      </div>
    </div>
  );
}
