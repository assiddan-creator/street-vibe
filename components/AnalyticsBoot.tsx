"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/analyticsEvents";

/**
 * Fires `app_opened` once per client mount for the active route (Text vs Speak).
 */
export function AnalyticsBoot() {
  const pathname = usePathname();
  const openedRef = useRef(false);

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    const mode = pathname === "/speak" ? "speak" : "text";
    trackAnalyticsEvent({ name: "app_opened", mode });
  }, [pathname]);

  return null;
}
