"use client";

/* eslint-disable @next/next/no-img-element -- static still over the video; next/image adds nothing here. */

import { useEffect, useRef, useState } from "react";

const VIDEO_DESKTOP = "/video/telaviv-dive.mp4";
const VIDEO_MOBILE = "/video/telaviv-dive-mobile.mp4";
const POSTER = "/video/telaviv-dive-start.jpg";
const STILL = "/video/telaviv-dive-end.jpg";

type DiveState = "auto" | "idle" | "playing" | "ended";

/**
 * Landing hero backdrop: a ~3.6s dive from above the clouds down to the Tel Aviv beachfront,
 * played once (muted, no loop) so it rests on the last frame, with a Replay button.
 * Reduced motion (e.g. Windows "Animation effects" off), Save-Data or a blocked autoplay
 * (iOS Low Power Mode) show the final frame with a "Watch the dive" button instead.
 */
export function HeroDive() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<DiveState>("auto");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduced || saveData) {
      video.pause();
      setState("idle");
      return;
    }
    // React does not render the `muted` attribute, and iOS only autoplays muted video.
    video.muted = true;
    video.play().catch(() => setState("idle"));
  }, []);

  const play = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.currentTime = 0;
    video.play().catch(() => setState("idle"));
  };

  return (
    <>
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        poster={POSTER}
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        disablePictureInPicture
        onPlaying={() => setState("playing")}
        onEnded={() => setState("ended")}
      >
        <source src={VIDEO_MOBILE} type="video/mp4" media="(max-width: 640px)" />
        <source src={VIDEO_DESKTOP} type="video/mp4" />
      </video>
      {state === "idle" && <img src={STILL} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      {(state === "idle" || state === "ended") && (
        <button
          type="button"
          onClick={play}
          className="absolute right-4 top-20 z-10 flex items-center gap-2 rounded-full border border-white/30 bg-black/35 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/55 sm:right-6 sm:top-24"
        >
          <span aria-hidden="true">{state === "idle" ? "▶" : "↻"}</span>
          {state === "idle" ? "Watch the dive" : "Replay"}
        </button>
      )}
    </>
  );
}
