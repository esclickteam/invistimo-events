import "./globals.css";
import type { ReactNode } from "react";
import Providers from "./providers";

/* ❌ אסור: import { useAuth } from "@/context/AuthContext"; */
/* ❌ אסור: "use client"; */
/* ❗ Header חייב להיות בקובץ נפרד */

import Header from "./components/Header"; // ← התקנה היחידה שנדרשת

export const metadata = {
  title: "Invity – הזמנות דיגיטליות ואישורי הגעה",
  description:
    "Invity – הזמנות דיגיטליות מעוצבות עם אישורי הגעה והושבה חכמה לכל סוגי האירועים.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen font-[Heebo]">
        <Providers>

          {/* HEADER */}
          <Header />

          {/* MAIN */}
          <main className="bg-luxury min-h-screen pt-[64px]">
            {children}
          </main>

          {/* FOOTER */}
          <footer className="mt-24 py-10 text-center text-sm text-[var(--brown-soft)]">
            Invity · מערכת הזמנות ואישורי הגעה לכל אירוע
          </footer>

        </Providers>
      </body>
    </html>
  );
}
