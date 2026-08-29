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
    pathname.startsWith("/invitation/") ||
    pathname === "/w" ||
    pathname.startsWith("/w/") ||
    pathname === "/wedding-website" ||
    pathname.startsWith("/wedding-website/");

  // ❌ דשבורדים – בלי Header/Footer של האתר
  const isDashboard =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/try/dashboard");

  // ❌ אזור מפיק – בלי Header/Footer של האתר
  const isProducer =
    pathname.startsWith("/producer") ||
    pathname.startsWith("/events/production");

  // ❌ ניהול אולמות – בלי Header/Footer שיווקי (VenueAppHeader נפרד)
  const isVenues = pathname.startsWith("/venues");

  // ❌ עורך הזמנות – בלי Footer בלבד
  const hideFooterOnly =
    pathname === "/dashboard/create-invite" ||
    pathname.startsWith("/dashboard/create-invite/") ||
    pathname === "/dashboard/edit-invite" ||
    pathname.startsWith("/dashboard/edit-invite/");

  /* =========================================================
     החלטות תצוגה
  ========================================================= */
  // Venues keeps VenueAppHeader (passed from ClientShell) but never marketing Footer
  const shouldHideHeader =
    hideHeaderAndFooter || isDashboard || isProducer;

  const shouldHideFooter =
    hideHeaderAndFooter ||
    hideFooterOnly ||
    isDashboard ||
    isProducer ||
    isVenues;

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
