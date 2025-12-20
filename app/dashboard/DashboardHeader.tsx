"use client";

import { Menu, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import EventCountdown from "@/app/components/EventCountdown";

export default function DashboardHeader({
  onOpenMenu,
  invitation,
}: {
  onOpenMenu: () => void;
  invitation?: any;
}) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      router.replace("/login");
    } catch (err) {
      console.error("Logout failed:", err);
      alert("שגיאה בהתנתקות");
    }
  }

  return (
    <header
      className="
        md:hidden
        sticky top-0 z-40
        border-b border-[#e2d6c8]
        bg-[#f5eee7]
      "
      dir="rtl"
    >
      {/* שורה ראשונה – תפריט + יציאה */}
      <div className="h-14 flex items-center justify-between px-4">
        <div className="flex items-center">
          <button
            onClick={onOpenMenu}
            className="p-2"
            aria-label="פתח תפריט דשבורד"
          >
            <Menu size={22} />
          </button>

          <span className="mr-3 font-medium text-[#4a413a]">
            ניהול האירוע
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="
            flex items-center gap-1
            text-red-600
            text-sm font-medium
            hover:text-red-700
            transition
          "
          title="התנתקות"
        >
          <LogOut size={18} />
          יציאה
        </button>
      </div>

      {/* שורה שנייה – ספירה לאחור (אם יש תאריך) */}
      {invitation?.eventDate && (
        <div className="px-3 pb-2">
          <EventCountdown invitation={invitation} compact />
        </div>
      )}
    </header>
  );
}
