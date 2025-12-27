"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type LayoutShellProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
};

export default function LayoutShell({
  children,
  header,
  footer,
}: LayoutShellProps) {
  const pathname = usePathname();

  /* =========================================================
     זיהוי אזורים
  ========================================================= */

  // ❌ דפים ציבוריים – בלי Header ובלי Footer
  const hideHeaderAndFooter =
    pathname === "/thank-you" ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/rsvp/") ||
    pathname.startsWith("/invitation/");

  // ❌ דשבורד (אמיתי + דמו) – בלי Header ובלי Footer של האתר
  const isDashboard =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/try/dashboard");

  // ❌ עורך הזמנות – בלי Footer בלבד
  const hideFooterOnly =
    pathname === "/dashboard/create-invite" ||
    pathname.startsWith("/dashboard/create-invite/") ||
    pathname === "/dashboard/edit-invite" ||
    pathname.startsWith("/dashboard/edit-invite/");

  /* =========================================================
     Render
  ========================================================= */

  const shouldHideHeader = hideHeaderAndFooter || isDashboard;
  const shouldHideFooter =
    hideHeaderAndFooter || hideFooterOnly || isDashboard;

  return (
    <>
      {/* Header של האתר */}
      {!shouldHideHeader && header}

      <main
        className={`min-h-screen ${
          !shouldHideHeader && header ? "pt-[64px]" : ""
        }`}
      >
        {children}
      </main>

      {/* Footer של האתר */}
      {!shouldHideFooter && footer}
    </>
  );
}
