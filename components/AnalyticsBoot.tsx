"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ANALYTICS_EVENT_NAMES, ANALYTICS_MODE, trackAnalyticsEvent } from "@/lib/analyticsEvents";

/**
 * Fires `app_opened` once per client mount for the active route (Text vs Speak).
 */
export function AnalyticsBoot() {
  const pathname = usePathname();
  const openedRef = useRef(false);

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    const mode = pathname === "/speak" ? ANALYTICS_MODE.SPEAK : ANALYTICS_MODE.TEXT;
    trackAnalyticsEvent({ name: ANALYTICS_EVENT_NAMES.APP_OPENED, mode });
  }, [pathname]);

  return null;
}
