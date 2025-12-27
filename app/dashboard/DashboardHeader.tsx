"use client";

import { Menu, LogOut, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/* ============================================================
   Types
============================================================ */
type DashboardHeaderProps = {
  onOpenMenu: () => void;
  invitation: {
    title?: string;
  } | null;
  isDemo?: boolean;
};

/* ============================================================
   Component
============================================================ */
export default function DashboardHeader({
  onOpenMenu,
  invitation,
  isDemo = false,
}: DashboardHeaderProps) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = () => {
    if (isDemo) {
      router.push("/login");
    } else {
      logout();
    }
  };

  return (
    <header
      dir="rtl"
      className="
        fixed top-0 inset-x-0 z-40
        h-14
        border-b border-[#e2d6c8]
        bg-[#f5eee7]
      "
    >
      {/* GRID – 3 עמודות קבועות */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center h-full px-4">

        {/* =========================
            צד ימין – הקשר + ניווט
        ========================= */}
        <div className="flex items-center gap-4 justify-start">
          {/* ☰ מובייל */}
          <button
            onClick={onOpenMenu}
            className="p-2 md:hidden"
            aria-label="פתח תפריט דשבורד"
          >
            <Menu size={22} />
          </button>

          {/* שם אירוע / דמו */}
          <div className="flex flex-col leading-tight">
            <span className="font-medium text-[#4a413a] truncate max-w-[220px]">
              {isDemo
                ? "מצב דמו – לצפייה בלבד"
                : invitation?.title || "ניהול אירוע"}
            </span>

            {isDemo && (
              <span className="text-[11px] text-amber-600">
                נתונים לדוגמה
              </span>
            )}
          </div>

          {/* ניווט – דסקטופ */}
          <nav className="hidden md:flex items-center gap-4 mr-4 text-sm">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-[#4a413a] hover:underline"
            >
              ראשי
            </button>

            <button
              onClick={() => router.push("/contact")}
              className="flex items-center gap-1 text-[#4a413a] hover:underline"
            >
              <MessageCircle size={16} />
              תמיכה
            </button>
          </nav>
        </div>

        {/* =========================
            אמצע – לוגו גרפי
        ========================= */}
        <div className="flex justify-center">
          <button
            onClick={() => router.push("/dashboard")}
            aria-label="מעבר לדשבורד הראשי"
            className="flex items-center"
          >
            <img
              src="/invistimo-logo.png"
              alt="Invistimo"
              className="
                h-7
                w-auto
                object-contain
                select-none
              "
              draggable={false}
            />
          </button>
        </div>

        {/* =========================
            צד שמאל – התנתקות
        ========================= */}
        <div className="flex justify-end">
          <button
            onClick={handleLogout}
            className="
              flex items-center gap-1
              text-sm font-medium
              text-red-600
              hover:text-red-700
              transition
            "
            title={isDemo ? "מעבר להתחברות" : "התנתקות מהחשבון"}
            aria-label="התנתקות"
          >
            <LogOut size={18} />
            {isDemo ? "התחברות" : "התנתקות"}
          </button>
        </div>
      </div>
    </header>
  );
}
