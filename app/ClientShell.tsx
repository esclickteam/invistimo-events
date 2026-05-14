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
     ❌ דפים פנימיים / אחרי התחברות – בלי SupportBot
     שימי לב:
     לא משתמשים ב-pathname.startsWith("/seating")
     כי זה חוסם בטעות גם את /seating-explained
  ===================================================== */
  const isInternalPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/try/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/producer") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/client") ||
    pathname.startsWith("/guests") ||
    pathname === "/seating" ||
    pathname.startsWith("/seating/");

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

  /* =====================================================
     ✅ כל דף חיצוני לפני התחברות
     כל מה שלא פנימי / לא התחברות / לא הזמנה
  ===================================================== */
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
     🟡 Producer – Header כן, Footer לא, בלי SupportBot
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