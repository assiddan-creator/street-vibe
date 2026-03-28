import { notFound } from "next/navigation";
import { DevAnalyticsClient } from "./DevAnalyticsClient";

/** Ensure NODE_ENV is evaluated per request so production always 404s. */
export const dynamic = "force-dynamic";

/** Local-only analytics buffer inspector — omitted from production builds. */
export default function DevAnalyticsPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  return <DevAnalyticsClient />;
}
