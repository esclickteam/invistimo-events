"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

export default function AccessibilityScript() {
  const pathname = usePathname();

  // ❌ לא בדשבורד של מפיקים
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/producer")
  ) {
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
