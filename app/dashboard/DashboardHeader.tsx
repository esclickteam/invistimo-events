"use client";

import { Menu, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/* ============================================================
   Types
============================================================ */
type DashboardHeaderProps = {
  onOpenMenu: () => void;
  invitation: any;
};

/* ============================================================
   Component
============================================================ */
export default function DashboardHeader({
  onOpenMenu,
  invitation,
}: DashboardHeaderProps) {
  const { logout } = useAuth(); // 🔥 מקור אמת יחיד

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

        <span className="mr-3 font-medium text-[#4a413a] truncate max-w-[180px]">
          {invitation?.title || "ניהול אירוע"}
        </span>
      </div>

      {/* צד שמאל – התנתקות */}
      <button
        onClick={logout}
        className="
          flex items-center gap-1
          text-red-600
          text-sm font-medium
          hover:text-red-700
          transition
        "
        title="התנתקות מהחשבון"
        aria-label="התנתקות מהחשבון"
      >
        <LogOut size={18} />
        התנתקות
      </button>
    </header>
  );
}
