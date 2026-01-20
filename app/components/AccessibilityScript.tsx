"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

export default function AccessibilityScript() {
  const pathname = usePathname();

  // ✅ רק עמודים ציבוריים
  const isPublicPage =
    pathname === "/" ||
    pathname.startsWith("/invitation") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/rsvp");

  // 🔥 ניקוי אם נכנסנו למערכת
  useEffect(() => {
    if (isPublicPage) return;

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
  }, [isPublicPage]);

  // ❌ כל מערכת פנימית – אין נגישות
  if (!isPublicPage) {
    return null;
  }

  // ✅ רק ציבורי
  return (
    <Script
      id="userway-widget"
      src="https://cdn.userway.org/widget.js"
      data-account="HnP2BQ1axC"
      strategy="afterInteractive"
    />
  );
}
