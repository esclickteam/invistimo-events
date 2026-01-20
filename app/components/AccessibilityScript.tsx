"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

export default function AccessibilityScript() {
  const pathname = usePathname();

  const isDashboard =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/producer");

  /* 🔥 ניקוי UserWay אם נכנסנו לדשבורד */
  useEffect(() => {
    if (!isDashboard) return;

    // הסרת iframe של UserWay
    const widget = document.querySelector(
      'iframe[src*="userway"], div#userway-widget'
    );
    if (widget) {
      widget.remove();
    }

    // ניקוי משתנים גלובליים
    // @ts-ignore
    delete window.UserWay;
  }, [isDashboard]);

  // ❌ בדשבורד – לא טוענים בכלל
  if (isDashboard) {
    return null;
  }

  // ✅ באתר הציבורי – כן טוענים
  return (
    <Script
      id="userway-widget"
      src="https://cdn.userway.org/widget.js"
      data-account="HnP2BQ1axC"
      strategy="afterInteractive"
    />
  );
}
