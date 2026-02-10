"use client";

import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ProducerDashboardHeader from "./ProducerDashboardHeader";

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
   UI CONST
============================================================ */
const HEADER_UI = {
  height: "h-16",
  navText: "text-[20px] tracking-wide",
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

  /* ============================================================
     Auth
  ============================================================ */
  const { user, logout } = useAuth();
  const role = user?.role;

  /* ============================================================
     ⬅️ Producer Header Override
  ============================================================ */
  if (role === "producer") {
    return (
      <div className="print:hidden">
        <ProducerDashboardHeader />
      </div>
    );
  }

  /* ============================================================
     Logout
  ============================================================ */
  const handleLogout = async () => {
    try {
      if (isDemo) {
        router.push("/login");
        return;
      }
      await logout();
    } catch (error) {
      console.error("❌ Logout failed:", error);
    }
  };

  /* ============================================================
     JSX – Header כללי (Client / Demo)
  ============================================================ */
  return (
    <header
      dir="rtl"
      className={`
        fixed top-0 inset-x-0 z-40
        ${HEADER_UI.height}
        border-b border-[#e2d6c8]
        bg-[#f5eee7]
        bg-[url('/noise.png')] bg-repeat
        print:hidden
      `}
    >
      <div
        className="
          grid grid-cols-[1fr_auto_1fr]
          items-center h-full
          px-4 md:px-10
        "
      >
        {/* =========================
            ימין – ניווט
        ========================= */}
        <div className="flex items-center gap-6 justify-start">
          <button
            onClick={onOpenMenu}
            className="p-2 md:hidden"
            aria-label="פתח תפריט דשבורד"
          >
            <Menu size={28} />
          </button>

          <div className="hidden md:flex flex-col leading-tight">
            <span className="font-medium text-[#4a413a] truncate max-w-[240px] text-[15px]">
              {isDemo
                ? "🧪 מצב דמו – לצפייה בלבד"
                : invitation?.title || "📊 ניהול אירוע"}
            </span>
          </div>

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
            מרכז – לוגו
        ========================= */}
        <div className="flex justify-center">
          <button
            onClick={() => router.push("/dashboard")}
            aria-label="מעבר לדשבורד הראשי"
            className="scale-[4]"
          >
            <img
              src="/invistimo-logo.png"
              alt="Invistimo"
              className="h-10 w-auto select-none"
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
          >
            🚪 {isDemo ? "התחברות" : "התנתקות"}
          </button>
        </div>
      </div>
    </header>
  );
}
