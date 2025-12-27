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
        h-14
        flex items-center
        px-4
        border-b border-[#e2d6c8]
        bg-[#f5eee7]
      "
    >
      {/* =========================
          צד ימין – הקשר + ניווט
      ========================= */}
      <div className="flex items-center gap-4 flex-1">
        {/* ☰ המבורגר – מובייל */}
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

        {/* ניווט בסיסי */}
        <nav className="hidden md:flex items-center gap-4 mr-4 text-sm">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[#4a413a] hover:underline"
          >
            ראשי
          </button>

          <button
            onClick={() => router.push("/support")}
            className="flex items-center gap-1 text-[#4a413a] hover:underline"
          >
            <MessageCircle size={16} />
            תמיכה
          </button>
        </nav>
      </div>

      {/* =========================
          אמצע – לוגו
      ========================= */}
      <div className="flex justify-center flex-1">
        <button
          onClick={() => router.push("/dashboard")}
          className="font-bold text-lg tracking-wide text-[#3d342e]"
          aria-label="מעבר לדשבורד הראשי"
        >
          Invistimo
        </button>
      </div>

      {/* =========================
          צד שמאל – התנתקות
      ========================= */}
      <div className="flex justify-end flex-1">
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
    </header>
  );
}
