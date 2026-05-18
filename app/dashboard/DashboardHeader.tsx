"use client";

import { Menu, Home, MessageCircle, LogOut, LogIn } from "lucide-react";
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
   Component
============================================================ */
export default function DashboardHeader({
  onOpenMenu,
  invitation,
  isDemo = false,
}: DashboardHeaderProps) {
  const router = useRouter();

  const { user, logout } = useAuth();
  const role = user?.role;

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
        fixed top-0 inset-x-0 z-40
        px-3 pt-3
        print:hidden
      "
    >
      <div
        className="
          mx-auto max-w-[1500px]
          rounded-[24px]
          border border-[#D9BE80]/70
          bg-[#FFFDF8]/92
          shadow-[0_18px_55px_rgba(91,65,26,0.13)]
          backdrop-blur-2xl
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
                bg-white/80
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

            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="
                  inline-flex items-center gap-2
                  rounded-[13px]
                  px-4 py-2.5
                  text-[15px] font-bold
                  text-[#4A3A2A]
                  transition
                  hover:bg-[#F8EEDB]
                  hover:text-[#B88A2D]
                  whitespace-nowrap
                "
              >
                <Home size={17} className="text-[#B88A2D]" />
                ראשי
              </button>

              <button
                onClick={() => router.push("/dashboard/contact")}
                className="
                  inline-flex items-center gap-2
                  rounded-[13px]
                  px-4 py-2.5
                  text-[15px] font-bold
                  text-[#4A3A2A]
                  transition
                  hover:bg-[#F8EEDB]
                  hover:text-[#B88A2D]
                  whitespace-nowrap
                "
              >
                <MessageCircle size={17} className="text-[#B88A2D]" />
                תמיכה
              </button>
            </div>
          </div>

          {/* =========================
              מרכז – לוגו כמו ההידר הראשי
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
                  h-[44px]
                  w-auto
                  max-w-[260px]
                  object-contain
                  select-none
                  md:h-[48px]
                  md:max-w-[330px]
                  drop-shadow-[0_6px_14px_rgba(158,116,42,0.14)]
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
                hidden lg:flex
                max-w-[260px]
                flex-col
                items-end
                leading-tight
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
                rounded-[13px]
                border
                px-5 py-3
                text-[15px] font-bold
                transition
                whitespace-nowrap
                ${
                  isDemo
                    ? "border-[#C9A45C]/75 bg-white/70 text-[#4A3A2A] hover:bg-[#F8EEDB] hover:text-[#B88A2D]"
                    : "border-[#D8C5A7] bg-white/60 text-red-600 hover:bg-red-50 hover:text-red-700"
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