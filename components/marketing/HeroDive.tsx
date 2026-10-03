"use client";

/* eslint-disable @next/next/no-img-element -- static still for reduced motion; next/image adds nothing here. */

import { useEffect, useRef, useState } from "react";

const VIDEO_DESKTOP = "/video/telaviv-dive.mp4";
const VIDEO_MOBILE = "/video/telaviv-dive-mobile.mp4";
const POSTER = "/video/telaviv-dive-start.jpg";
const STILL = "/video/telaviv-dive-end.jpg";

/**
 * Landing hero backdrop: a ~3.6s dive from above the clouds down to the Tel Aviv beachfront,
 * played once (muted, no loop) so it rests on the last frame. Reduced motion, Save-Data or a
 * blocked autoplay show the final frame as a still instead.
 */
export function HeroDive() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduced || saveData) {
      video.pause();
      setStill(true);
      return;
    }
    // React does not render the `muted` attribute, and iOS only autoplays muted video.
    video.muted = true;
    video.play().catch(() => setStill(true));
  }, []);

  if (still) {
    return <img src={STILL} alt="" className="absolute inset-0 h-full w-full object-cover" />;
  }

  return (
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
    >
      <source src={VIDEO_MOBILE} type="video/mp4" media="(max-width: 640px)" />
      <source src={VIDEO_DESKTOP} type="video/mp4" />
    </video>
  );
}
