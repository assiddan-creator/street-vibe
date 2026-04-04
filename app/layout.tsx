import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Street Vibe",
  description: "Street-smart translation and voice — Next.js App Router",
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
