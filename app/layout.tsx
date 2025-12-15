import "./globals.css";
import type { ReactNode } from "react";
import Providers from "./providers";

import Header from "./components/Header";
import Footer from "./components/Footer";

/* ✅ בוט תמיכה – קומפוננטת client */
import SupportBotButton from "./components/SupportBotButton";

/* ✅ טעינת סקריפטים */
import Script from "next/script";

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
          {/* HEADER */}
          <Header />

          {/* MAIN CONTENT */}
          <main className="min-h-screen pt-[64px]">{children}</main>

          {/* FOOTER – פעם אחת בלבד */}
          <Footer />

          {/* 💬 בוט תמיכה – צף בכל האתר */}
          <SupportBotButton />

          {/* ♿ נגישות – Nagish / נגיש לי */}
          <Script id="nagish-config" strategy="afterInteractive">
            {`var nl_link = "https://invistimo.com/accessibility";`}
          </Script>

          <Script
            src="https://cdn.nagish.co.il/nagishli.js?v=2.3"
            strategy="afterInteractive"
            charSet="utf-8"
          />
        </Providers>
      </body>
    </html>
  );
}
