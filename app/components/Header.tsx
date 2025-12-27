"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

export default function Header() {
  const { user, logout, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      <Link href="/" onClick={onClick} className="hover:text-[var(--champagne-dark)] transition">
        ראשי
      </Link>
      <Link href="/rsvp" onClick={onClick} className="hover:text-[var(--champagne-dark)] transition">
        אישורי הגעה
      </Link>
      <Link
        href="/seating-explained"
        onClick={onClick}
        className="hover:text-[var(--champagne-dark)] transition"
      >
        סידורי הושבה
      </Link>
      <Link href="/pricing" onClick={onClick} className="hover:text-[var(--champagne-dark)] transition">
        חבילות ומחירים
      </Link>
      <Link href="/contact" onClick={onClick} className="hover:text-[var(--champagne-dark)] transition">
        צור קשר
      </Link>
    </>
  );

  return (
    <>
      <header
        className="
          fixed top-0 inset-x-0 z-50
          bg-[#f5eee7]
          bg-[url('/noise.png')] bg-repeat
          border-b border-[#e2d6c8]
          shadow-sm
        "
      >
        <div className="w-full px-4 md:px-10" dir="rtl">
          <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center h-16">
            {/* ימין – ניווט / המבורגר */}
            <div className="flex items-center justify-start">
              {/* דסקטופ */}
              <nav className="hidden md:flex items-center gap-10 text-[#4a413a] font-medium text-[18px]">


                <NavLinks />
              </nav>

              {/* מובייל – המבורגר רק אם לא בדשבורד */}
              {!isDashboard && (
                <button
                  onClick={() => setMobileOpen(true)}
                  className="md:hidden p-2"
                  aria-label="פתח תפריט"
                >
                  <Menu size={26} />
                </button>
              )}
            </div>

            {/* מרכז – לוגו */}
            <div className="flex justify-center" dir="ltr">
              <Link href="/" className="flex items-center">
                <img
                  src="/invistimo-logo.png"
                  alt="Invistimo Logo"
                  className="h-10 w-auto object-contain scale-[4] origin-center"
                />
              </Link>
            </div>

            {/* שמאל – התחברות (דסקטופ בלבד) */}
            <div className="hidden md:flex justify-end items-center gap-4">
              {!loading &&
                (user ? (
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
                ))}
            </div>
          </div>
        </div>
      </header>

      {/* ================= MOBILE DRAWER (רק מחוץ לדשבורד) ================= */}
      {!isDashboard && mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />

          {/* drawer */}
          <div
            className="
              absolute top-0 right-0 h-full w-[80%] max-w-sm
              bg-[#f5eee7]
              border-l border-[#e2d6c8]
              shadow-xl
              p-6
              flex flex-col
              gap-6
            "
            dir="rtl"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-lg">תפריט</span>
              <button onClick={() => setMobileOpen(false)}>
                <X size={22} />
              </button>
            </div>

            <nav className="flex flex-col gap-5 text-[#4a413a] font-medium">
              <NavLinks onClick={() => setMobileOpen(false)} />
            </nav>

            {/* אזור משתמש – מתחת לצור קשר */}
            <div className="pt-4 border-t border-[#e2d6c8]">
              {!loading &&
                (user ? (
                  <div className="flex flex-col gap-4">
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="hover:text-[var(--champagne-dark)] font-medium"
                    >
                    לוח בקרה
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setMobileOpen(false);
                      }}
                      className="
                        px-5 py-2 rounded-full
                        border border-[#cbb59d]
                        text-[#4a413a] text-sm
                        hover:bg-[#efe6db]
                        transition
                        w-fit
                      "
                    >
                      התנתקות
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="
                      px-6 py-2 rounded-full
                      border border-[#cbb59d]
                      text-[#4a413a] font-medium
                      hover:bg-[#efe6db]
                      transition
                      w-fit
                    "
                  >
                    התחברות
                  </Link>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
