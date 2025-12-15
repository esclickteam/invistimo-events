import "./globals.css";
import type { ReactNode } from "react";
import Providers from "./providers";

import Header from "./components/Header";
import Footer from "./components/Footer";

/* ✅ next/script */
import Script from "next/script";

/* ✅ בוט תמיכה */
import SupportBotButton from "./components/SupportBotButton";

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

          {/* MAIN */}
          <main className="min-h-screen pt-[64px]">
            {children}
          </main>

          {/* FOOTER */}
          <Footer />

          {/* 💬 בוט תמיכה */}
          <SupportBotButton />

          {/* ♿ נגישות – Nagishli */}
          <Script id="nagishli-config" strategy="beforeInteractive">
            {`
              var nl_link = "https://invistimo.com/accessibility";
            `}
          </Script>

          <Script
            src="https://cdn.nagishli.co.il/nagishli.js?v=2.3"
            strategy="afterInteractive"
          />
        </Providers>
      </body>
    </html>
  );
}
