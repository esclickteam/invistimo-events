"use client";

import "./globals.css";
import type { ReactNode } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

import Providers from "./providers";
import Header from "./components/Header";
import Footer from "./components/Footer";
import SupportBotButton from "./components/SupportBotButton";

export const metadata = {
  title: "Invistimo – הזמנות דיגיטליות ואישורי הגעה",
  description:
    "Invistimo – הזמנות דיגיטליות מעוצבות עם אישורי הגעה והושבה חכמה לכל סוגי האירועים.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // 👇 עמוד לינק אישי לאורח (RSVP / Invite)
  const isGuestInvitePage =
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/invite/rsvp");

  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen font-[Heebo] bg-[#f7f3ee] text-[#5c4632]">
        <Providers>
          {/* HEADER */}
          {!isGuestInvitePage && <Header />}

          {/* MAIN CONTENT */}
          <main className={!isGuestInvitePage ? "min-h-screen pt-[64px]" : ""}>
            {children}
          </main>

          {/* FOOTER */}
          {!isGuestInvitePage && <Footer />}

          {/* 💬 בוט תמיכה */}
          {!isGuestInvitePage && <SupportBotButton />}
        </Providers>

        {/* ♿ נגישות */}
        {!isGuestInvitePage && (
          <Script
            src="https://cdn.userway.org/widget.js"
            data-account="HnP2BQ1axC"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
