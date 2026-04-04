"use client";

import { useId } from "react";

type GraffitiLogoProps = {
  /** Primary language / theme accent (fill) */
  accent: string;
  className?: string;
  /** When true, slightly smaller / calmer for idle hero state */
  compact?: boolean;
};

function outlineColorForAccent(accent: string): string {
  return `color-mix(in srgb, #03030a 80%, ${accent} 20%)`;
}

/**
 * Throw-up style wordmark: thick outline + bold fill (Neon Subterranean).
 * Outline is a dark mix keyed off the accent so it stays legible and urban.
 */
export function GraffitiLogo({ accent, className = "", compact = false }: GraffitiLogoProps) {
  const filterId = useId().replace(/:/g, "");
  const outline = outlineColorForAccent(accent);

  const h = compact ? 52 : 64;
  const vbW = 420;
  const fontSize = compact ? 38 : 46;
  const y = compact ? 40 : 48;

  return (
    <svg
      role="img"
      aria-label="StreetVibe"
      className={`max-w-full select-none ${className}`}
      viewBox={`0 0 ${vbW} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>StreetVibe</title>
      <defs>
        <filter id={`graffiti-glow-${filterId}`} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Shadow layer (depth, subterranean) */}
      <text
        x={vbW / 2}
        y={y + 3}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(0,0,0,0.62)"
        style={{
          fontFamily: "'Permanent Marker', cursive",
          fontSize,
          letterSpacing: "0.05em",
        }}
      >
        STREETVIBE
      </text>
      {/* Fill + thick outline: stroke drawn first, fill on top */}
      <text
        x={vbW / 2}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={accent}
        stroke={outline}
        strokeWidth={compact ? 10 : 12}
        strokeLinejoin="round"
        strokeLinecap="round"
        paintOrder="stroke fill"
        filter={`url(#graffiti-glow-${filterId})`}
        style={{
          fontFamily: "'Permanent Marker', cursive",
          fontSize,
          letterSpacing: "0.05em",
        }}
      >
        STREETVIBE
      </text>
    </svg>
  );
}
