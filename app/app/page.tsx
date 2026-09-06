import type { Metadata } from "next";
import { TranslatorView } from "@/components/TranslatorView";

// The tool itself. The marketing site lives at "/"; this route is the app and
// is kept out of the index so "/" stays the canonical page.
export const metadata: Metadata = {
  title: "Open the app",
  robots: { index: false, follow: true },
};

export default function AppPage() {
  return <TranslatorView />;
}
