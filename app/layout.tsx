"use client";

import "./globals.css";
import type { ReactNode } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

import Providers from "./providers";

import Header from "./components/Header";
import Footer from "./components/Footer";
import LayoutShell from "./components/LayoutShell";

import SupportBotButton from "./components/SupportBotButton";
import SupportBotGate from "./components/SupportBotGate";
import AccessibilityScript from "./components/AccessibilityScript";

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // 🛡️ בדיקת Admin
  const isAdmin = pathname.startsWith("/admin");

  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen font-[Heebo] bg-[#f7f3ee] text-[#5c4632]">
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="afterInteractive"
        />

        <Providers>
          {isAdmin ? (
            // ✅ Admin – בלי Header / Footer של האתר
            <>{children}</>
          ) : (
            // 🌐 אתר רגיל
            <LayoutShell header={<Header />} footer={<Footer />}>
              {children}
            </LayoutShell>
          )}

          {/* 🤖 בוט תמיכה – רק מחוץ לאדמין */}
          {!isAdmin && (
            <SupportBotGate>
              <SupportBotButton />
            </SupportBotGate>
          )}
        </Providers>

        <AccessibilityScript />
      </body>
    </html>
  );
}
