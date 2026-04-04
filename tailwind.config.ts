import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        label: ["var(--font-label)", "system-ui", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        themeGlow: "var(--theme-glow)",
        themeButton: "rgb(var(--theme-button-rgb) / <alpha-value>)",
        themeButtonBorder: "rgb(var(--theme-button-border-rgb) / <alpha-value>)",
      },
      boxShadow: {
        "glow-theme": "0 0 15px -1px var(--theme-glow)",
      },
    },
  },
  plugins: [],
};
export default config;
