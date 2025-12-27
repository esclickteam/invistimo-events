"use client";

import { useRouter } from "next/navigation";
import { X, Pencil } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  invitationShareId?: string;
  isDemo?: boolean;
};

export default function DashboardMobileMenu({
  open,
  onClose,
  invitationShareId,
  isDemo = false,
}: Props) {
  const router = useRouter();

  if (!open) return null;

  /* ===============================
     🔐 ניווט חכם לפי מצב דמו
  =============================== */
  const handleNav = (path: string) => {
    onClose();

    if (isDemo) {
      // ✅ בדמו – רק הושבה והודעות פתוחים
      if (
        path === "/dashboard/seating" ||
        path === "/dashboard/messages"
      ) {
        router.push(`/try${path.replace("/dashboard", "/dashboard")}`);
      } else {
        router.push("/login");
      }
      return;
    }

    // 🟢 פרודקשן
    router.push(path);
  };

  const handleViewInvite = () => {
    onClose();

    if (isDemo) {
      router.push("/login");
      return;
    }

    if (invitationShareId) {
      window.open(
        `https://www.invistimo.com/invite/${invitationShareId}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

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
          {/* 🏠 ראשי */}
          <button
            onClick={() => handleNav("/dashboard")}
            className="text-right"
          >
            🏠 ראשי
          </button>

          {/* ✏️ עריכת פרטי האירוע */}
          <button
            onClick={() => handleNav("/dashboard/event")}
            className="flex items-center gap-2 text-right"
          >
            <Pencil size={16} />
            עריכת פרטי האירוע
          </button>

          {/* 💬 שליחת הודעות – פתוח בדמו */}
          <button
            onClick={() => handleNav("/dashboard/messages")}
            className="text-right"
          >
            💬 שליחת הודעות
          </button>

          {/* 🪑 סידורי הושבה – פתוח בדמו */}
          <button
            onClick={() => handleNav("/dashboard/seating")}
            className="text-right"
          >
            🪑 סידורי הושבה
          </button>

          {/* 👁️ צפייה בהזמנה */}
          {invitationShareId && (
            <button
              onClick={handleViewInvite}
              className="text-right"
            >
              👁️ צפייה בהזמנה
            </button>
          )}
        </nav>
      </aside>
    </div>
  );
}
