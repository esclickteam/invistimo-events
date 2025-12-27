"use client";

import { Menu, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/* ============================================================
   Types
============================================================ */
type DashboardHeaderProps = {
  onOpenMenu: () => void;
  invitation: any;
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
  const { logout } = useAuth(); // 🔥 מקור אמת יחיד

  const handleLogout = () => {
    if (isDemo) {
      router.push("/login");
    } else {
      logout();
    }
  };

  return (
    <header
      className="
        md:hidden
        h-14
        flex items-center justify-between
        px-4
        border-b border-[#e2d6c8]
        bg-[#f5eee7]
      "
      dir="rtl"
    >
      {/* צד ימין – תפריט + כותרת */}
      <div className="flex items-center">
        <button
          onClick={onOpenMenu}
          className="p-2"
          aria-label="פתח תפריט דשבורד"
        >
          <Menu size={22} />
        </button>

        <div className="mr-3 flex flex-col">
          <span className="font-medium text-[#4a413a] truncate max-w-[180px]">
            {invitation?.title || "ניהול אירוע"}
          </span>

          {isDemo && (
            <span className="text-[11px] text-amber-600">
              מצב דמו
            </span>
          )}
        </div>
      </div>

      {/* צד שמאל – התנתקות */}
      <button
        onClick={handleLogout}
        className="
          flex items-center gap-1
          text-red-600
          text-sm font-medium
          hover:text-red-700
          transition
        "
        title={isDemo ? "בדמו – מעבר להתחברות" : "התנתקות מהחשבון"}
        aria-label="התנתקות מהחשבון"
      >
        <LogOut size={18} />
        {isDemo ? "התחברות" : "התנתקות"}
      </button>
    </header>
  );
}
