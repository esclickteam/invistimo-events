"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  GA_MEASUREMENT_ID,
  analyticsAllowed,
  claimWebVitalReport,
  isGaMeasurementId,
  trackWebVital,
} from "@/lib/seo/analytics";
import type { MetricType } from "web-vitals";

const reported = new Set<string>();
let listening = false;

function reportFinalMetric(metric: MetricType) {
  if (!claimWebVitalReport(reported, metric.id)) return;
  trackWebVital({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    pagePath: metric.navigationURL || window.location.pathname || "/",
  });
}

/**
 * Sends each final LCP, INP, and CLS value once per page view.
 * The official library decides the value; this file does not sum shifts
 * or time a single event. Mobile and desktop stay GA4's device category.
 */
export default function WebVitalsReporter() {
  const pathname = usePathname() || "/";
  const enabled = isGaMeasurementId(GA_MEASUREMENT_ID) && analyticsAllowed(pathname);

  useEffect(() => {
    if (!enabled || listening) return;
    listening = true;
    const options = { reportAllChanges: false } as const;
    void import("web-vitals").then(({ onCLS, onINP, onLCP }) => {
      onLCP(reportFinalMetric, options);
      onINP(reportFinalMetric, options);
      onCLS(reportFinalMetric, options);
    });
  }, [enabled]);

  return null;
}
