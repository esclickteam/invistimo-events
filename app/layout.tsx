import "./globals.css";
import type { ReactNode } from "react";
import Providers from "./providers";

/* ❌ אין hooks */
/* ❌ אין "use client" */

import Header from "./components/Header";
import Footer from "./components/Footer";

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
          <main className="min-h-screen pt-[64px]">
            {children}
          </main>

          {/* 
            FOOTER – מופיע בכל הדפים  
            כולל ניווט משפטי + FAQ לפני יצירת קשר
          */}
          <Footer />

        </Providers>
      </body>
    </html>
  );
}
