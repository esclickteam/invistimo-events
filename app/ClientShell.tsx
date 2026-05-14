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

  const isInternalPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/try/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/producer") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/client") ||
    pathname.startsWith("/guests") ||
    pathname.startsWith("/seating");

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const isInvitationPublicPage =
    pathname === "/thank-you" ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/rsvp/") ||
    pathname.startsWith("/invitation/");

  // ✅ רק עמודי שיווק חיצוניים לפני התחברות
  const isExternalMarketingPage =
    pathname === "/" ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/features") ||
    pathname.startsWith("/solutions") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/seating-explained") ||
    pathname.startsWith("/how-it-works");

  const showSupportBot =
    isExternalMarketingPage &&
    !isInternalPage &&
    !isAuthPage &&
    !isInvitationPublicPage;

  // 🔴 Admin – בלי Header / Footer בכלל
  if (isAdmin) {
    return <>{children}</>;
  }

  // 🟡 Producer – Header כן, Footer לא, בלי SupportBot
  if (isProducer) {
    return (
      <LayoutShell header={<Header />} footer={null}>
        {children}
      </LayoutShell>
    );
  }

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