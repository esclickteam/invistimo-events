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
  // עמודי שיווק תחת `/rsvp` ו־`/rsvp/*` (חתונה, וואטסאפ, Save the Date וכו')
  // מציגים את ה־Header וה־Footer הראשיים לפני התחברות.
  // זרימות אורח נשארות תחת `/invite/` בלי Chrome שיווקי.
  // Live demos + published wedding sites stay chrome-free.
  // Marketing hub `/wedding-website` keeps the shared public Header/Footer.
  const hideHeaderAndFooter =
    pathname === "/thank-you" ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/invitation/") ||
    pathname === "/w" ||
    pathname.startsWith("/w/") ||
    pathname.startsWith("/wedding-website/") ||
    pathname === "/set-password" ||
    pathname.startsWith("/set-password/") ||
    pathname.startsWith("/check-in/pass") ||
    pathname.startsWith("/try/check-in/pass");

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

      {/* CONTENT — header is already in document flow (shrink-0), so no
          sticky/fixed offset padding. Extra pt-[64px] created a visible gap
          between Header and Hero on marketing pages. */}
      <main className="flex-1">{children}</main>

      {/* FOOTER */}
      {!shouldHideFooter && footer && (
        <div className="shrink-0">{footer}</div>
      )}
    </div>
  );
}
