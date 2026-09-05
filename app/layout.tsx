import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Inter, Manrope, Space_Grotesk } from "next/font/google";
import { AnalyticsBoot } from "@/components/AnalyticsBoot";
import { CityThemeProvider } from "@/components/theme/CityThemeProvider";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-label",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://street-vibe.vercel.app";
const DESCRIPTION =
  "Say it, then send it the way a 22-year-old from Kingston, London or Tel Aviv actually would — 11 street dialects with an AI voice to match.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Street Vibe — talk like the city",
    template: "%s · Street Vibe",
  },
  description: DESCRIPTION,
  applicationName: "Street Vibe",
  keywords: [
    "street slang",
    "dialect translator",
    "Jamaican Patois",
    "London roadman",
    "AI voice",
    "text to speech",
    "language learning",
  ],
  authors: [{ name: "Street Vibe" }],
  category: "lifestyle",
  openGraph: {
    type: "website",
    siteName: "Street Vibe",
    title: "Street Vibe — talk like the city",
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Street Vibe — talk like the city",
    description: DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: "Street Vibe",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0d0f11",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${manrope.variable} ${inter.variable} min-h-[100dvh] font-sans antialiased`}
      >
        <CityThemeProvider>
          <AnalyticsBoot />
          {children}
        </CityThemeProvider>
      </body>
    </html>
  );
}
