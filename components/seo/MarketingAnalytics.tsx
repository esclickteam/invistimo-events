"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  GA_MEASUREMENT_ID,
  aiReferrerLabel,
  analyticsAllowed,
  isGaMeasurementId,
} from "@/lib/seo/analytics";

export default function MarketingAnalytics() {
  const pathname = usePathname() || "/";
  const enabled = isGaMeasurementId(GA_MEASUREMENT_ID) && analyticsAllowed(pathname);

  useEffect(() => {
    if (!enabled || typeof window.gtag !== "function") return;
    const source = aiReferrerLabel(document.referrer || "");
    if (!source) return;
    window.gtag("event", "ai_referral", { ai_source: source, page_path: pathname });
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
          gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
