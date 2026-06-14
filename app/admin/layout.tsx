"use client";

// 🔒 קריטי לספארי iOS – מונע snapshot / BFCache
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

/* =====================================================
   ADMIN LAYOUT
===================================================== */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // ✅ מקור אמת אחד להתנתקות
  const { logout } = useAuth();

  const pathname = usePathname();

  const nav = [
    { href: "/admin", label: "סקירה" },
    { href: "/admin/users", label: "משתמשים" },

    // ✅ חדש: טאב עובדים — כאן יהיה טפסי 101 של העובדים
    { href: "/admin/employees", label: "עובדים" },

    // ✅ טאב הקלטות שיחות
    { href: "/admin/call-recordings", label: "הקלטות שיחות" },
  ];

  /* --------------------------------------------------
     LOGOUT
  -------------------------------------------------- */
  const handleLogout = async () => {
    await logout(); // 🔑 ניתוק מלא + ניקוי state + redirect
    setOpen(false);
  };

  const isActivePath = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      {/* ================= Mobile Header ================= */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-white px-4 md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="text-2xl"
          aria-label="Open menu"
          type="button"
        >
          ☰
        </button>

        <span className="font-semibold">Admin Panel</span>
      </header>

      {/* ================= Overlay (Mobile) ================= */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ================= Sidebar ================= */}
      <aside
        className={`
          fixed right-0 top-0 z-50 h-full w-64 border-l bg-white p-6
          transform transition-transform duration-300
          md:static md:translate-x-0
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="mb-8 flex items-center justify-between md:block">
          <h2 className="text-xl font-bold">🛡️ Admin Panel</h2>

          <button
            className="text-xl md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-2">
          {nav.map((item) => {
            const isActive = isActivePath(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`
                  rounded-lg px-4 py-2 transition
                  ${
                    isActive
                      ? "bg-gray-100 font-semibold text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }
                `}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="my-6 border-t" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          type="button"
          className="
            w-full rounded-lg px-4 py-2
            font-medium text-red-600
            transition hover:bg-red-50
          "
        >
          התנתקות
        </button>
      </aside>

      {/* ================= Content ================= */}
      <main className="w-full flex-1 p-4 pt-16 md:p-10 md:pt-0">
        {children}
      </main>
    </div>
  );
}