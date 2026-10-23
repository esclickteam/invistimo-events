"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  GA_MEASUREMENT_ID,
  analyticsAllowed,
  isGaMeasurementId,
  trackPublicEvent,
} from "@/lib/seo/analytics";

/**
 * Reports Core Web Vitals to GA4 when measurement is enabled on public pages.
 * Uses the Performance Observer API — no extra npm dependency.
 */
export default function WebVitalsReporter() {
  const pathname = usePathname() || "/";
  const enabled = isGaMeasurementId(GA_MEASUREMENT_ID) && analyticsAllowed(pathname);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("PerformanceObserver" in window)) {
      return;
    }

    const send = (name: string, value: number, rating: string) => {
      trackPublicEvent("web_vital", {
        metric_name: name,
        metric_value: String(Math.round(name === "CLS" ? value * 1000 : value)),
        metric_rating: rating,
        page_path: pathname,
      });
    };

    const rate = (name: string, value: number) => {
      if (name === "LCP") {
        if (value <= 2500) return "good";
        if (value <= 4000) return "needs-improvement";
        return "poor";
      }
      if (name === "INP") {
        if (value <= 200) return "good";
        if (value <= 500) return "needs-improvement";
        return "poor";
      }
      if (name === "CLS") {
        if (value <= 0.1) return "good";
        if (value <= 0.25) return "needs-improvement";
        return "poor";
      }
      return "unknown";
    };

    const observers: PerformanceObserver[] = [];

    try {
      const lcp = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        if (last) send("LCP", last.startTime, rate("LCP", last.startTime));
      });
      lcp.observe({ type: "largest-contentful-paint", buffered: true });
      observers.push(lcp);
    } catch {
      /* unsupported */
    }

    try {
      const cls = new PerformanceObserver((list) => {
        let value = 0;
        for (const entry of list.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput?: boolean }>) {
          if (!entry.hadRecentInput) value += entry.value;
        }
        send("CLS", value, rate("CLS", value));
      });
      cls.observe({ type: "layout-shift", buffered: true });
      observers.push(cls);
    } catch {
      /* unsupported */
    }

    try {
      const inp = new PerformanceObserver((list) => {
        const entries = list.getEntries() as Array<PerformanceEntry & { duration: number }>;
        const last = entries[entries.length - 1];
        if (last) send("INP", last.duration, rate("INP", last.duration));
      });
      inp.observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
      observers.push(inp);
    } catch {
      /* unsupported */
    }

    return () => {
      for (const observer of observers) observer.disconnect();
    };
  }, [enabled, pathname]);

  return null;
}
