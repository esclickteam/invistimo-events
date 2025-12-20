"use client";

import Link from "next/link";
import { X, Pencil } from "lucide-react";

export default function DashboardMobileMenu({
  open,
  onClose,
  invitationShareId,
}: {
  open: boolean;
  onClose: () => void;
  invitationShareId?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" dir="rtl">
      {/* Overlay */}
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
          border-l border-[#e2d6c8]
          shadow-xl
          p-6
          flex flex-col
          gap-6
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-lg text-[#4a413a]">
            ניהול האירוע
          </span>
          <button onClick={onClose} aria-label="סגירת תפריט">
            <X size={22} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-4 text-[#4a413a] font-medium">
          <Link href="/dashboard" onClick={onClose}>
            🏠 ראשי
          </Link>

          {/* ✏️ עריכת פרטי האירוע – הועבר לכאן */}
          <Link
            href="/dashboard?editEvent=1"
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <Pencil size={16} />
            עריכת פרטי האירוע
          </Link>

          <Link href="/dashboard/messages" onClick={onClose}>
            💬 שליחת הודעות
          </Link>

          <Link href="/dashboard/seating" onClick={onClose}>
            🪑 סידורי הושבה
          </Link>

          {invitationShareId && (
            <a
              href={`https://www.invistimo.com/invite/${invitationShareId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
            >
              👁️ צפייה בהזמנה
            </a>
          )}
        </nav>
      </aside>
    </div>
  );
}
