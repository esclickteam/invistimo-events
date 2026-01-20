"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type LayoutShellProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode | null;
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

  // ❌ דשבורדים – בלי Header/Footer של האתר
  const isDashboard =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/try/dashboard");

  // ❌ אזור מפיק – בלי Header/Footer של האתר
  const isProducer =
    pathname.startsWith("/producer") ||
    pathname.startsWith("/events/production");

  // ❌ עורך הזמנות – בלי Footer בלבד
  const hideFooterOnly =
    pathname === "/dashboard/create-invite" ||
    pathname.startsWith("/dashboard/create-invite/") ||
    pathname === "/dashboard/edit-invite" ||
    pathname.startsWith("/dashboard/edit-invite/");

  /* =========================================================
     החלטות תצוגה
  ========================================================= */
  const shouldHideHeader =
    hideHeaderAndFooter || isDashboard || isProducer;

  const shouldHideFooter =
    hideHeaderAndFooter || hideFooterOnly || isDashboard || isProducer;

  /* =========================================================
     Render
  ========================================================= */
  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER */}
      {!shouldHideHeader && header && (
        <div className="shrink-0">{header}</div>
      )}

      {/* CONTENT */}
      <main
        className={`flex-1 ${
          !shouldHideHeader && header ? "pt-[64px]" : ""
        }`}
      >
        {children}
      </main>

      {/* FOOTER */}
      {!shouldHideFooter && footer && (
        <div className="shrink-0">{footer}</div>
      )}
    </div>
  );
}
