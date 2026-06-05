"use client";

import { Menu, Home, MessageCircle, LogOut, LogIn } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
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
   Component
============================================================ */
export default function DashboardHeader({
  onOpenMenu,
  invitation,
  isDemo = false,
}: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { user, logout } = useAuth();
  const role = user?.role;

  /* ============================================================
     Seating page – hide dashboard header completely
     משאיר רק את ה-toolbar הפנימי של ההושבה
  ============================================================ */
  const isSeatingPage =
    pathname === "/dashboard/seating" ||
    pathname.startsWith("/dashboard/seating/") ||
    pathname === "/try/dashboard/seating" ||
    pathname.startsWith("/try/dashboard/seating/");

  if (isSeatingPage) {
    return null;
  }

  /* ============================================================
     Producer Header Override
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

  const eventTitle = isDemo
    ? "מצב דמו – לצפייה בלבד"
    : invitation?.title || "ניהול אירוע";

  return (
    <header
  dir="rtl"
  className="
    relative z-20
    w-full
    bg-[#F8F5EE]
    px-3 py-3
    print:hidden
  "
>
      <div
        className="
          mx-auto max-w-[1500px]
          rounded-[24px]
          border border-[#D9BE80]/70
          bg-[#FFFDF8]
          shadow-[0_8px_24px_rgba(91,65,26,0.08)]
        "
      >
        <div
          className="
            grid h-[78px]
            grid-cols-[1fr_auto_1fr]
            items-center
            gap-4
            px-4 md:px-8
          "
        >
          {/* =========================
              ימין – תפריט / ניווט
          ========================= */}
          <div className="flex items-center justify-start gap-4">
            <button
              onClick={onOpenMenu}
              className="
                flex h-11 w-11 items-center justify-center
                rounded-full
                border border-[#D7BE88]
                bg-white
                text-[#3F3328]
                shadow-sm
                transition
                hover:bg-[#F8EEDB]
                md:hidden
              "
              aria-label="פתח תפריט דשבורד"
            >
              <Menu size={25} />
            </button>

            <div className="hidden items-center gap-3 md:flex">
              <button
                onClick={() => router.push("/dashboard")}
                className="
                  inline-flex items-center gap-2
                  whitespace-nowrap
                  rounded-[13px]
                  px-4 py-2.5
                  text-[15px] font-bold
                  text-[#4A3A2A]
                  transition
                  hover:bg-[#F8EEDB]
                  hover:text-[#B88A2D]
                "
              >
                <Home size={17} className="text-[#B88A2D]" />
                ראשי
              </button>

              <button
                onClick={() => router.push("/dashboard/contact")}
                className="
                  inline-flex items-center gap-2
                  whitespace-nowrap
                  rounded-[13px]
                  px-4 py-2.5
                  text-[15px] font-bold
                  text-[#4A3A2A]
                  transition
                  hover:bg-[#F8EEDB]
                  hover:text-[#B88A2D]
                "
              >
                <MessageCircle size={17} className="text-[#B88A2D]" />
                תמיכה
              </button>
            </div>
          </div>

          {/* =========================
              מרכז – לוגו
          ========================= */}
          <div className="flex justify-center" dir="ltr">
            <button
              onClick={() => router.push("/dashboard")}
              aria-label="מעבר לדשבורד הראשי"
              className="
                flex items-center justify-center
                cursor-pointer
                transition
                hover:scale-[1.03]
              "
            >
              <img
                src="/invistimo-logo.png"
                alt="Invistimo"
                className="
                  h-[42px]
                  w-auto
                  max-w-[210px]
                  select-none
                  object-contain
                  drop-shadow-[0_6px_14px_rgba(158,116,42,0.12)]
                  md:h-[48px]
                  md:max-w-[330px]
                "
                draggable={false}
              />
            </button>
          </div>

          {/* =========================
              שמאל – מצב אירוע + יציאה
          ========================= */}
          <div className="flex items-center justify-end gap-3">
            <div
              className="
                hidden
                max-w-[260px]
                flex-col
                items-end
                leading-tight
                lg:flex
              "
            >
              <span className="text-[11px] font-bold text-[#B88A2D]">
                {isDemo ? "תצוגת מערכת" : "ברוכים הבאים"}
              </span>

              <span
                className="
                  max-w-[260px]
                  truncate
                  text-[15px] font-bold
                  text-[#3F3328]
                "
                title={eventTitle}
              >
                {eventTitle}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className={`
                inline-flex items-center gap-2
                whitespace-nowrap
                rounded-[13px]
                border
                px-4 py-3
                text-[14px] font-bold
                transition
                md:px-5 md:text-[15px]
                ${
                  isDemo
                    ? "border-[#C9A45C]/75 bg-white text-[#4A3A2A] hover:bg-[#F8EEDB] hover:text-[#B88A2D]"
                    : "border-[#D8C5A7] bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
                }
              `}
              title={isDemo ? "מעבר להתחברות" : "התנתקות מהחשבון"}
            >
              {isDemo ? <LogIn size={17} /> : <LogOut size={17} />}
              {isDemo ? "התחברות" : "התנתקות"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}