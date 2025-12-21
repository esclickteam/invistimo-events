"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

export default function AccessibilityScript() {
  const pathname = usePathname();

  // ❌ לא בדשבורד
  if (pathname.startsWith("/dashboard")) {
    return null;
  }

  return (
    <Script
      src="https://cdn.userway.org/widget.js"
      data-account="HnP2BQ1axC"
      strategy="afterInteractive"
    />
  );
}
