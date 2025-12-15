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
      {/* RTL כללי */}
      <div
        className="max-w-7xl mx-auto px-6"
        dir="rtl"
      >
        {/* GRID כדי שהלוגו יהיה באמת באמצע */}
        <div className="grid grid-cols-3 items-center h-16">

          {/* ====================== צד ימין – תפריט ניווט ====================== */}
          <nav className="hidden md:flex items-center gap-8 text-[#4a413a] font-medium justify-start">
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
                className="h-8 w-auto object-contain"
              />
            </Link>
          </div>

          {/* ====================== צד שמאל – התחברות / משתמש ====================== */}
          <div className="flex justify-end items-center gap-4">
            {!loading && (
              <>
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="text-[#4a413a] font-medium hover:text-[var(--champagne-dark)] transition"
                    >
                      לוח בקרה
                    </Link>

                    <span className="text-[#4a413a] text-sm">
                      שלום, {user.name || "משתמש"}
                    </span>

                    <button
                      onClick={logout}
                      className="
                        px-4 py-2 rounded-full
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
                      px-5 py-2 rounded-full
                      border border-[#cbb59d]
                      text-[#4a413a] text-sm font-medium
                      hover:bg-[#efe6db]
                      transition
                    "
                  >
                    התחברות
                  </Link>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
