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

  // Official UserWay bottom-left (position 7) before the widget boots.
  useEffect(() => {
    if (isInternal) return;
    const w = window as Window & { _userway_config?: Record<string, unknown> };
    w._userway_config = {
      ...(w._userway_config || {}),
      account: "HnP2BQ1axC",
      position: 7,
    };
  }, [isInternal]);

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
      data-position="7"
      // After LCP: avoid competing with hero image bandwidth on first paint.
      strategy="lazyOnload"
    />
  );
}
