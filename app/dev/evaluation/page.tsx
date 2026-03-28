import { notFound } from "next/navigation";
import { EvalRunnerClient } from "./EvalRunnerClient";

export const dynamic = "force-dynamic";

/** Internal quality evaluation — not available in production builds. */
export default function DevEvaluationPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  return <EvalRunnerClient />;
}
