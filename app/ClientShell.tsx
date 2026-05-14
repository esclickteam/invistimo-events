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

  // 🟢 מפיק / הפקה – בלי Footer ובלי SupportBot
  const isProducer =
    pathname.startsWith("/producer") ||
    pathname.startsWith("/events/production");

  // 🔴 דפים פנימיים של המערכת – בלי SupportBot חיצוני
  const isDashboard =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/client") ||
    pathname.startsWith("/guests") ||
    pathname.startsWith("/seating");

  // 🔐 דפי התחברות / הרשמה – בלי SupportBot
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  // ✅ רק דפים חיצוניים לפני התחברות
  const isExternalPublicPage =
    pathname === "/" ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/features") ||
    pathname.startsWith("/solutions") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/seating-explained") ||
    pathname.startsWith("/how-it-works");

  const showSupportBot =
    isExternalPublicPage &&
    !isAdmin &&
    !isProducer &&
    !isDashboard &&
    !isAuthPage;

  // 🔴 Admin – בלי Header / Footer בכלל
  if (isAdmin) {
    return <>{children}</>;
  }

  // 🟡 Producer – Header כן, Footer לא
  if (isProducer) {
    return (
      <>
        <LayoutShell header={<Header />} footer={null}>
          {children}
        </LayoutShell>
      </>
    );
  }

  // 🟢 אתר רגיל
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