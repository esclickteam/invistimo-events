import "./globals.css";
import type { ReactNode } from "react";
import Script from "next/script";

import Providers from "./providers";

/* ❌ אין hooks */
/* ❌ אין "use client" בלייאאוט */

import Header from "./components/Header";
import Footer from "./components/Footer";

/* ✅ קומפוננטת client – מותר לייבא */
import SupportBotButton from "./components/SupportBotButton";
import LayoutShell from "./components/LayoutShell";
import SupportBotGate from "./components/SupportBotGate";

export const metadata = {
  title: "Invistimo – הזמנות דיגיטליות ואישורי הגעה",
  description:
    "Invistimo – הזמנות דיגיטליות מעוצבות עם אישורי הגעה והושבה חכמה לכל סוגי האירועים.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen font-[Heebo] bg-[#f7f3ee] text-[#5c4632]">
        <Providers>
          <LayoutShell Header={Header} Footer={Footer}>
            {children}
          </LayoutShell>

          {/* 💬 בוט תמיכה – לא מופיע בדפי הזמנה */}
          <SupportBotGate>
            <SupportBotButton />
          </SupportBotGate>
        </Providers>

        {/* ♿ UserWay – נגישות חינמית */}
        <Script
          src="https://cdn.userway.org/widget.js"
          data-account="HnP2BQ1axC"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
