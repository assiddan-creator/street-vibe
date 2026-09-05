import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(150deg, #10231a 0%, #0b0d10 60%)",
          color: "#2fd07f",
          fontSize: 300,
          fontWeight: 800,
          letterSpacing: -12,
          fontFamily: "sans-serif",
        }}
      >
        SV
      </div>
    ),
    size
  );
}
