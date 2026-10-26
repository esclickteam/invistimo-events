"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

import Header from "./components/Header";
import Footer from "./components/Footer";
import LayoutShell from "./components/LayoutShell";
import VenueAppHeader from "@/components/venues/VenueAppHeader";

export default function ClientShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isAdmin = pathname.startsWith("/admin");

  const isProducer =
    pathname.startsWith("/producer") ||
    pathname.startsWith("/events/production");

  const isVenues = pathname.startsWith("/venues");

  // Live demos + published sites only — marketing hub `/wedding-website` keeps public chrome.
  const isWeddingWebsite =
    pathname === "/w" ||
    pathname.startsWith("/w/") ||
    pathname.startsWith("/wedding-website/");

  /* =====================================================
     ❌ דפי הצעת מחיר / הסכם – בלי Header / Footer / SupportBot
  ===================================================== */
  const isSalesDocumentPage =
    pathname.startsWith("/sales-documents") ||
    pathname.startsWith("/client-contracts/sign");

  const isSetPasswordPage =
    pathname === "/set-password" || pathname.startsWith("/set-password/");

  /* SupportBot mounts once from PublicPageShell (avoids duplicate FABs / CLS). */

  /* =====================================================
     🔴 Admin – בלי Header / Footer בכלל
  ===================================================== */
  if (isAdmin) {
    return <>{children}</>;
  }

  /* =====================================================
     📄 הצעת מחיר / הסכם – בלי Header / Footer בכלל
  ===================================================== */
  if (isSalesDocumentPage || isWeddingWebsite || isSetPasswordPage) {
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
     🏛️ Venues – VenueAppHeader בלבד, בלי Footer שיווקי
  ===================================================== */
  if (isVenues) {
    return (
      <LayoutShell header={<VenueAppHeader />} footer={null}>
        {children}
      </LayoutShell>
    );
  }

  /* =====================================================
     🟢 אתר רגיל
  ===================================================== */
  return (
    <LayoutShell header={<Header />} footer={<Footer />}>
      {children}
    </LayoutShell>
  );
}
