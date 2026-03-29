import { notFound } from "next/navigation";
import { RuleBakeoffClient } from "./RuleBakeoffClient";

export const dynamic = "force-dynamic";

export default function DevRuleBakeoffPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  return <RuleBakeoffClient />;
}
