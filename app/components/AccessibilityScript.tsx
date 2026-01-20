"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

export default function AccessibilityScript() {
  const pathname = usePathname();

  const isInternal =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/producer") ||
    pathname.startsWith("/events");

  // 🔥 ניקוי אם נכנסנו לאזור פנימי
  useEffect(() => {
    if (!isInternal) return;

    const selectors = [
      'iframe[src*="userway"]',
      'iframe[title*="UserWay"]',
      'div.userway',
      '.uwy',
      '#userway-widget',
      'script[src*="userway"]',
      'style[id*="userway"]',
    ];

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => el.remove());
    });

    // @ts-ignore
    delete window.UserWay;
    // @ts-ignore
    delete window._userway_config;
  }, [isInternal]);

  // ❌ אזור מערכת – אין נגישות
  if (isInternal) {
    return null;
  }

  // ✅ רק באתר הציבורי
  return (
    <Script
      id="userway-widget"
      src="https://cdn.userway.org/widget.js"
      data-account="HnP2BQ1axC"
      strategy="afterInteractive"
    />
  );
}
