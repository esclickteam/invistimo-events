"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { user, logout, loading } = useAuth();

  return (
    <header
      className="
        fixed top-0 left-0 w-full z-50
        bg-[#f5eee7]
        bg-[url('/noise.png')] bg-repeat
        border-b border-[#e2d6c8]
        shadow-sm
      "
    >
      {/* ⭐ RTL כדי שהתפריט יהיה בצד ימין */}
      <div
        className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between"
        dir="rtl"
      >
        {/* ====================== תפריט ניווט — צד ימין ====================== */}
        <div className="flex items-center gap-10">
          <nav className="hidden md:flex gap-8 text-[#4a413a] font-medium">
            <Link
              href="#how"
              className="hover:text-[var(--champagne-dark)] transition"
            >
              איך זה עובד
            </Link>

            <Link
              href="#features"
              className="hover:text-[var(--champagne-dark)] transition"
            >
              מה מקבלים
            </Link>

            <Link
              href="#pricing"
              className="hover:text-[var(--champagne-dark)] transition"
            >
              חבילות
            </Link>
          </nav>

          {/* 🔐 מצב התחברות / התנתקות */}
          {!loading && (
            <>
              {user ? (
                <div className="hidden md:flex items-center gap-4">
                  <Link
                    href="/dashboard"
                    className="text-[#4a413a] font-semibold hover:text-[var(--champagne-dark)] transition"
                  >
                    שלום, {user.name || "משתמש"}
                  </Link>

                  <button
                    onClick={logout}
                    className="
                      px-5 py-2 rounded-full
                      bg-[#e14d4d] text-white font-semibold shadow-md
                      hover:bg-[#d13b3b] transition
                    "
                  >
                    התנתקות
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="
                    hidden md:block px-6 py-2 rounded-full
                    bg-[var(--champagne)] text-white font-semibold shadow-md
                    hover:bg-[var(--champagne-dark)] transition
                  "
                >
                  התחברות
                </Link>
              )}
            </>
          )}
        </div>

        {/* ====================== לוגו — צד שמאל ====================== */}
        <div dir="ltr" className="flex items-center">
          <Link href="/" className="flex items-center">
            <img
              src="/invistimo-logo.png"
              alt="Invistimo Logo"
              className="h-10 w-auto object-contain scale-[4] origin-left"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
