"use client";

import Link from "next/link";
import { X } from "lucide-react";

export default function DashboardMobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" dir="rtl">
      {/* רקע כהה */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className="
          absolute top-0 right-0
          h-full w-[80%] max-w-xs
          bg-[#f5eee7]
          shadow-xl
          p-6
          flex flex-col
          gap-5
        "
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-lg">ניהול האירוע</span>
          <button onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <nav className="flex flex-col gap-4 text-[#4a413a] font-medium">
          <Link href="/dashboard" onClick={onClose}>🏠 ניהול אירוע</Link>
          <Link href="/dashboard/guests" onClick={onClose}>👥 רשימת מוזמנים</Link>
          <Link href="/dashboard/messages" onClick={onClose}>💬 שליחת הודעות</Link>
          <Link href="/dashboard/seating" onClick={onClose}>🪑 הושבה</Link>
          <Link href="/dashboard/edit-invite" onClick={onClose}>✏️ עריכת פרטי אירוע</Link>
          <Link href="/invite" onClick={onClose}>👁️ צפייה בהזמנה</Link>
        </nav>
      </aside>
    </div>
  );
}
