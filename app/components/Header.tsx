"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { user, logout, loading } = useAuth();

  return (
    <header
      className="
        fixed top-0 inset-x-0 z-50
        bg-[#f5eee7]
        bg-[url('/noise.png')] bg-repeat
        border-b border-[#e2d6c8]
        shadow-sm
      "
    >
      {/* FULL WIDTH HEADER */}
      <div
        className="w-full px-10"
        dir="rtl"
      >
        {/* 3 אזורים – ימין | מרכז | שמאל */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-16">

          {/* ====================== ימין – תפריט ====================== */}
          <nav className="flex items-center gap-10 justify-start text-[#4a413a] font-medium">
            <Link href="#how" className="hover:text-[var(--champagne-dark)] transition">
              איך זה עובד?
            </Link>
            <Link href="#rsvp" className="hover:text-[var(--champagne-dark)] transition">
              אישורי הגעה
            </Link>
            <Link href="#seating" className="hover:text-[var(--champagne-dark)] transition">
              סידורי הושבה
            </Link>
            <Link href="#pricing" className="hover:text-[var(--champagne-dark)] transition">
              חבילות ומחירים
            </Link>
            <Link href="#contact" className="hover:text-[var(--champagne-dark)] transition">
              צור קשר
            </Link>
          </nav>

          {/* ====================== מרכז – לוגו ====================== */}
          <div className="flex justify-center" dir="ltr">
            <Link href="/" className="flex items-center">
              <img
  src="/invistimo-logo.png"
  alt="Invistimo Logo"
  className="h-10 w-auto object-contain scale-[4] origin-center"
/>
            </Link>
          </div>

          {/* ====================== שמאל – התחברות ====================== */}
          <div className="flex justify-end items-center gap-4">
            {!loading && (
              user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-[#4a413a] font-medium hover:text-[var(--champagne-dark)] transition"
                  >
                    לוח בקרה
                  </Link>

                  <button
                    onClick={logout}
                    className="
                      px-5 py-2 rounded-full
                      border border-[#cbb59d]
                      text-[#4a413a] text-sm
                      hover:bg-[#efe6db]
                      transition
                    "
                  >
                    התנתקות
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="
                    px-6 py-2 rounded-full
                    border border-[#cbb59d]
                    text-[#4a413a] font-medium
                    hover:bg-[#efe6db]
                    transition
                  "
                >
                  התחברות
                </Link>
              )
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
