"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

import Header from "./components/Header";
import Footer from "./components/Footer";
import LayoutShell from "./components/LayoutShell";
import SupportBotButton from "./components/SupportBotButton";
import SupportBotGate from "./components/SupportBotGate";

export default function ClientShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isAdmin = pathname.startsWith("/admin");

  const isProducer =
    pathname.startsWith("/producer") ||
    pathname.startsWith("/events/production");

  /* =====================================================
     🪑 עמודי הושבה – בלי Header/Footer של האתר
     משאיר רק את ה-toolbar הפנימי של ההושבה
  ===================================================== */
  const isSeatingWorkspace =
    pathname === "/dashboard/seating" ||
    pathname.startsWith("/dashboard/seating/") ||
    pathname === "/try/dashboard/seating" ||
    pathname.startsWith("/try/dashboard/seating/") ||
    pathname === "/venues/dashboard/seating" ||
    pathname.startsWith("/venues/dashboard/seating/") ||
    pathname === "/seating" ||
    pathname.startsWith("/seating/");

  if (isSeatingWorkspace) {
    return <>{children}</>;
  }

  /* =====================================================
     ❌ דפים פנימיים / אחרי התחברות – בלי SupportBot
  ===================================================== */
  const isInternalPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/try/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/producer") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/client") ||
    pathname.startsWith("/guests");

  /* =====================================================
     ❌ דפי התחברות / הרשמה – בלי SupportBot
  ===================================================== */
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  /* =====================================================
     ❌ דפי הזמנות / RSVP / תודה – בלי SupportBot
  ===================================================== */
  const isInvitationPublicPage =
    pathname === "/thank-you" ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/rsvp/") ||
    pathname.startsWith("/invitation/");

  const showSupportBot =
    !isInternalPage &&
    !isAuthPage &&
    !isInvitationPublicPage;

  /* =====================================================
     🔴 Admin – בלי Header / Footer בכלל
  ===================================================== */
  if (isAdmin) {
    return <>{children}</>;
  }

  /* =====================================================
     🟡 Producer – Header כן, Footer לא
  ===================================================== */
  if (isProducer) {
    return (
      <LayoutShell header={<Header />} footer={null}>
        {children}
      </LayoutShell>
    );
  }

  /* =====================================================
     🟢 אתר רגיל
  ===================================================== */
  return (
    <>
      <LayoutShell header={<Header />} footer={<Footer />}>
        {children}
      </LayoutShell>

      {showSupportBot && (
        <SupportBotGate>
          <SupportBotButton />
        </SupportBotGate>
      )}
    </>
  );
}