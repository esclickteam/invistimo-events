"use client";

import { Menu } from "lucide-react";
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
   UI CONST – זהה ל־Header הראשי
============================================================ */
const HEADER_UI = {
  height: "min-h-[80px] py-3",
  navText: "text-[20px] tracking-wide",
  logo: "h-14",
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
      className={`
        fixed top-0 inset-x-0 z-40
        ${HEADER_UI.height}
        border-b border-[#e2d6c8]
        bg-[#f5eee7]
        bg-[url('/noise.png')] bg-repeat
      `}
    >
      {/* GRID – 3 עמודות */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 md:px-10">

        {/* =========================
            ימין – ניווט + הקשר
        ========================= */}
        <div className="flex items-center gap-6 justify-start">

          {/* ☰ מובייל */}
          <button
            onClick={onOpenMenu}
            className="p-2 md:hidden"
            aria-label="פתח תפריט דשבורד"
          >
            <Menu size={28} />
          </button>

          {/* שם אירוע / דמו */}
          <div className="flex flex-col leading-tight">
            <span className="font-medium text-[#4a413a] truncate max-w-[240px] text-[15px]">
              {isDemo
                ? "🧪 מצב דמו – לצפייה בלבד"
                : invitation?.title || "📊 ניהול אירוע"}
            </span>

            {isDemo && (
              <span className="text-[11px] text-amber-600">
                נתונים לדוגמה
              </span>
            )}
          </div>

          {/* ניווט – דסקטופ */}
          <nav
            className={`
              hidden md:flex items-center gap-10 mr-6
              text-[#4a413a] font-medium
              ${HEADER_UI.navText}
            `}
          >
            <button
              onClick={() => router.push("/dashboard")}
              className="hover:text-[var(--champagne-dark)] transition"
            >
              🏠 ראשי
            </button>

            <button
              onClick={() => router.push("/dashboard/contact")}
              className="hover:text-[var(--champagne-dark)] transition"
            >
              💬 תמיכה
            </button>
          </nav>
        </div>

        {/* =========================
            אמצע – לוגו
        ========================= */}
        <div className="flex justify-center" dir="ltr">
          <button
            onClick={() => router.push("/dashboard")}
            aria-label="מעבר לדשבורד הראשי"
            className="flex items-center"
          >
            <img
              src="/invistimo-logo.png"
              alt="Invistimo"
              className={`
                ${HEADER_UI.logo}
                w-auto
                object-contain
                select-none
              `}
              draggable={false}
            />
          </button>
        </div>

        {/* =========================
            שמאל – התנתקות
        ========================= */}
        <div className="flex justify-end">
          <button
            onClick={handleLogout}
            className={`
              font-medium
              ${HEADER_UI.navText}
              text-red-600
              hover:text-red-700
              transition
            `}
            title={isDemo ? "מעבר להתחברות" : "התנתקות מהחשבון"}
            aria-label="התנתקות"
          >
            🚪 {isDemo ? "התחברות" : "התנתקות"}
          </button>
        </div>
      </div>
    </header>
  );
}
