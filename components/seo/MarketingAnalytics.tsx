"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import WebVitalsReporter from "@/components/seo/WebVitalsReporter";
import { CONSENT_CHANGED_EVENT } from "@/lib/consent/policy";
import { hasAnalyticsConsent } from "@/lib/consent/storage";
import {
  GA_MEASUREMENT_ID,
  aiTrafficLabel,
  analyticsAllowed,
  classifyPublicClick,
  isGaMeasurementId,
  trackPublicEvent,
} from "@/lib/seo/analytics";

function MarketingAnalyticsInner() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const seenAi = useRef("");
  const [analyticsOn, setAnalyticsOn] = useState(false);
  const enabled =
    analyticsOn && isGaMeasurementId(GA_MEASUREMENT_ID) && analyticsAllowed(pathname);

  useEffect(() => {
    const sync = () => setAnalyticsOn(hasAnalyticsConsent());
    sync();
    window.addEventListener(CONSENT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window.gtag !== "function") return;
    const search = searchParams?.toString() ? `?${searchParams.toString()}` : window.location.search || "";
    const source = aiTrafficLabel(document.referrer || "", search);
    if (!source || seenAi.current === `${source}:${pathname}`) return;
    seenAi.current = `${source}:${pathname}`;
    window.gtag("event", "ai_referral", { ai_source: source, page_path: pathname });
  }, [enabled, pathname, searchParams]);

  useEffect(() => {
    if (!enabled) return;

    const onClick = (event: MouseEvent) => {
      if (event.type === "auxclick" && event.button === 0) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.hasAttribute("data-conversion-tracked")) return;
      const decision = classifyPublicClick(link.getAttribute("href") || "", pathname, {
        packageId: link.getAttribute("data-package-id") || "",
        placement: link.getAttribute("data-placement") || "",
      });
      if (!decision) return;
      trackPublicEvent(decision.name, decision.params);
    };

    document.addEventListener("click", onClick);
    document.addEventListener("auxclick", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("auxclick", onClick);
    };
  }, [enabled, pathname]);

  if (!enabled) return null;
  return <WebVitalsReporter />;
}

export default function MarketingAnalytics() {
  return (
    <Suspense fallback={null}>
      <MarketingAnalyticsInner />
    </Suspense>
  );
}
