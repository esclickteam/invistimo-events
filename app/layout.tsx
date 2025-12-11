import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
import Providers from "./providers";
import { useAuth } from "@/context/AuthContext";

function Header() {
  const { user, logout } = useAuth();

  return (
    <header
      dir="ltr"
      className="
        fixed top-0 left-0 w-full z-50
        bg-[#f5eee7] 
        bg-[url('/noise.png')] bg-repeat
        border-b border-[#e2d6c8]
        shadow-sm
      "
    >
      <div className="w-full px-6 py-4 flex items-center justify-between">

        {/* לוגו */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[var(--champagne)] flex items-center justify-center text-white text-lg font-bold shadow-md">
            in
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-[var(--brown-dark)]">
              Invity
            </div>
            <div className="text-xs text-[var(--brown-soft)]">
              הזמנות דיגיטליות ואישורי הגעה
            </div>
          </div>
        </Link>

        {/* ניווט */}
        <nav className="hidden md:flex items-center gap-10 text-lg text-[var(--brown-soft)]">
          <a href="#how" className="hover:text-[var(--brown-dark)] transition-colors">
            איך זה עובד
          </a>

          <a href="#features" className="hover:text-[var(--brown-dark)] transition-colors">
            מה מקבלים
          </a>

          <a href="#packages" className="hover:text-[var(--brown-dark)] transition-colors">
            חבילות
          </a>

          {/* 🔥 אם יש משתמש מחובר */}
          {user ? (
            <div className="flex items-center gap-4">

              {/* אזור אישי */}
              <Link
                href="/dashboard"
                className="text-sm hover:text-[var(--brown-dark)] transition-colors"
              >
                שלום, {user.name || "משתמש"}
              </Link>

              {/* התנתקות */}
              <button
                onClick={logout}
                className="text-sm px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition"
              >
                התנתקות
              </button>
            </div>
          ) : (
            // 🔹 אם לא מחובר — הצג התחברות
            <Link href="/login" className="btn-primary text-sm px-5 py-2">
              התחברות
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

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
