import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Street Vibe — talk like the city",
    short_name: "Street Vibe",
    description:
      "Rewrite any message into 11 real street dialects, with an AI voice to match.",
    start_url: "/app",
    display: "standalone",
    background_color: "#0d0f11",
    theme_color: "#0d0f11",
    orientation: "portrait",
    categories: ["lifestyle", "education", "social"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
