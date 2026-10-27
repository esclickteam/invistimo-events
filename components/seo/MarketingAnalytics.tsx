"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import {
  GA_MEASUREMENT_ID,
  aiTrafficLabel,
  analyticsAllowed,
  classifyPublicClick,
  contentGroup,
  isGaMeasurementId,
  trackPublicEvent,
} from "@/lib/seo/analytics";
import WebVitalsReporter from "@/components/seo/WebVitalsReporter";

function MarketingAnalyticsInner() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const enabled = isGaMeasurementId(GA_MEASUREMENT_ID) && analyticsAllowed(pathname);
  const firstView = useRef(true);
  const seenAi = useRef("");

  useEffect(() => {
    if (!enabled || typeof window.gtag !== "function") return;
    if (firstView.current) {
      firstView.current = false;
    } else {
      window.gtag("config", GA_MEASUREMENT_ID, {
        page_path: pathname,
        content_group: contentGroup(pathname),
      });
    }
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

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="invistimo-ga4" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true, content_group: '${contentGroup(pathname)}', send_page_view: true });
        `}
      </Script>
      <WebVitalsReporter />
    </>
  );
}

export default function MarketingAnalytics() {
  return (
    <Suspense fallback={null}>
      <MarketingAnalyticsInner />
    </Suspense>
  );
}
