import { notFound } from "next/navigation";
import { SlangEngineCompareClient } from "./SlangEngineCompareClient";

export const dynamic = "force-dynamic";

/** Task 29–30 — raw slang engine compare + MiniMax capability wiring (dev only). */
export default function SlangEngineComparePage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  return <SlangEngineCompareClient />;
}
