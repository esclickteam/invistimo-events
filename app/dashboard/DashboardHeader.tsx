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
   UI CONST – עיצוב ההידר
============================================================ */
const HEADER_UI = {
  height: "h-16", // גובה ההידר
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
  const { logout } = useAuth();

  /* ============================================================
     פונקציית התנתקות מלאה
  ============================================================= */
  const handleLogout = async () => {
    try {
      // במצב דמו – מעבר ישיר לדף התחברות
      if (isDemo) {
        router.push("/login");
        return;
      }

      // ✅ שליחת בקשה לשרת למחיקת ה־cookies
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });

      // ✅ ניקוי כל הנתונים המקומיים
      localStorage.clear();
      sessionStorage.clear();

      // ✅ קריאה לפונקציית ה־logout מהקונטקסט (אם קיימת)
      if (typeof logout === "function") {
        logout();
      }

      // ✅ הפניה לדף התחברות + רענון מלא
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  /* ============================================================
     JSX
  ============================================================= */
  return (
    <header
      dir="rtl"
      className={`
        fixed top-0 inset-x-0 z-40
        ${HEADER_UI.height}
        border-b border-[#e2d6c8]
        bg-[#f5eee7]
        bg-[url('/noise.png')] bg-repeat
        overflow-visible
      `}
    >
      <div
        className="
          grid grid-cols-[1fr_auto_1fr]
          items-center h-full
          px-4 md:px-10
          overflow-visible relative
        "
      >
        {/* =========================
            צד ימין – תפריט ניווט
        ========================= */}
        <div className="flex items-center gap-6 justify-start">
          {/* כפתור תפריט במובייל */}
          <button
            onClick={onOpenMenu}
            className="p-2 md:hidden"
            aria-label="פתח תפריט דשבורד"
          >
            <Menu size={28} />
          </button>

          {/* שם האירוע (רק בדסקטופ) */}
          <div className="hidden md:flex flex-col leading-tight">
            <span className="font-medium text-[#4a413a] truncate max-w-[240px] text-[15px]">
              {isDemo
                ? "🧪 מצב דמו – לצפייה בלבד"
                : invitation?.title || "📊 ניהול אירוע"}
            </span>

            {isDemo && (
              <span className="text-[11px] text-amber-600">נתונים לדוגמה</span>
            )}
          </div>

          {/* ניווט פנימי */}
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
        <div
          className="flex justify-center items-center overflow-visible relative"
          dir="ltr"
        >
          <button
            onClick={() => router.push("/dashboard")}
            aria-label="מעבר לדשבורד הראשי"
            className="
              flex items-center justify-center
              overflow-visible
              origin-center
              scale-[4]
            "
          >
            <img
              src="/invistimo-logo.png"
              alt="Invistimo"
              className="h-10 w-auto object-contain select-none"
              draggable={false}
            />
          </button>
        </div>

        {/* =========================
            צד שמאל – כפתור התנתקות
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
