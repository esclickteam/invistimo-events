"use client";

import { useState } from "react";
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
  const [showDemoToast, setShowDemoToast] = useState(false);

  if (!open) return null;

  /* ===============================
     🔐 ניווט חכם לפי מצב דמו
  =============================== */
  const handleNav = (path: string) => {
    onClose();

    if (isDemo) {
      // ✅ בדמו – פתוח
      if (
        path === "/dashboard" ||
        path === "/dashboard/seating" ||
        path === "/dashboard/messages"
      ) {
        router.push(`/try${path}`);
      } else {
        setShowDemoToast(true);
      }
      return;
    }

    // 🟢 פרודקשן
    router.push(path);
  };

  const handleViewInvite = () => {
    onClose();

    if (isDemo) {
      setShowDemoToast(true);
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
    <>
      {/* ===============================
         Drawer
      =============================== */}
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
            <button
              onClick={() => handleNav("/dashboard")}
              className="text-right"
            >
              🏠 ראשי
            </button>

            <button
              onClick={() => handleNav("/dashboard/event")}
              className="flex items-center gap-2 text-right"
            >
              <Pencil size={16} />
              עריכת פרטי האירוע
            </button>

            <button
              onClick={() => handleNav("/dashboard/messages")}
              className="text-right"
            >
              💬 שליחת הודעות
            </button>

            <button
              onClick={() => handleNav("/dashboard/seating")}
              className="text-right"
            >
              🪑 סידורי הושבה
            </button>

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

      {/* ===============================
         🧪 Demo Toast
      =============================== */}
      {showDemoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]">
          <div
            className="
              flex items-center gap-4
              bg-[#fff7e6]
              border border-[#e6cfa3]
              text-[#5c4632]
              px-5 py-3
              rounded-xl
              shadow-lg
              text-sm
            "
          >
            <span>
              🧪 בדמו ניתן לצפות בדשבורד, הושבה והודעות בלבד
            </span>

            <button
              onClick={() => router.push("/login")}
              className="
                whitespace-nowrap
                px-4 py-1.5
                rounded-full
                bg-[#c9b48f]
                text-white
                font-medium
                hover:bg-[#b7a27a]
                transition
              "
            >
              להתחברות
            </button>

            <button
              onClick={() => setShowDemoToast(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="סגירת הודעה"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
