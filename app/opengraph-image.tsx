import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Street Vibe — talk like a local, not a tourist";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 80px",
          background:
            "radial-gradient(900px 500px at 15% 0%, rgba(47,208,127,0.22), rgba(0,0,0,0)), #0b0d10",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 34,
            letterSpacing: 8,
            color: "#2fd07f",
            fontWeight: 700,
          }}
        >
          STREET VIBE
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 76,
            lineHeight: 1.1,
            fontWeight: 800,
            color: "#f3f4f1",
            maxWidth: 900,
          }}
        >
          Talk like a local, not a tourist.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 34,
            color: "rgba(255,255,255,0.72)",
            maxWidth: 880,
          }}
        >
          Rewrite any message into 11 real street dialects — with an AI voice to match.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 56,
            fontSize: 26,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: 1,
          }}
        >
          Kingston · London · Brooklyn · Tel Aviv · CDMX · Cairo · Tokyo · Paris
        </div>
      </div>
    ),
    size
  );
}
