"use client";

// 🔒 קריטי לספארי iOS – מונע snapshot / BFCache
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

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

  const nav = [
    { href: "/admin", label: "סקירה" },
    { href: "/admin/users", label: "משתמשים" },
  ];

  /* --------------------------------------------------
     LOGOUT
  -------------------------------------------------- */
  const handleLogout = async () => {
    await logout();      // 🔑 ניתוק מלא + ניקוי state + redirect
    setOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex" dir="rtl">
      {/* ================= Mobile Header ================= */}
      <header className="fixed top-0 right-0 left-0 z-40 h-14 bg-white border-b flex items-center justify-between px-4 md:hidden">
  <button
    onClick={() => setOpen(true)}
    className="text-2xl"
    aria-label="Open menu"
  >
    ☰
  </button>

  <span className="font-semibold">Admin Panel</span>
</header>

      {/* ================= Overlay (Mobile) ================= */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ================= Sidebar ================= */}
      <aside
        className={`
          fixed top-0 right-0 z-50 h-full w-64 bg-white border-l p-6
          transform transition-transform duration-300
          md:static md:translate-x-0
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8 md:block">
          <h2 className="text-xl font-bold">🛡️ Admin Panel</h2>
          <button
            className="md:hidden text-xl"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Divider */}
        <div className="my-6 border-t" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="
            w-full px-4 py-2 rounded-lg
            text-red-600 font-medium
            hover:bg-red-50 transition
          "
        >
          התנתקות
        </button>
      </aside>

      {/* ================= Content ================= */}
      <main className="flex-1 w-full pt-16 md:pt-0 p-4 md:p-10">
        {children}
      </main>
    </div>
  );
}
