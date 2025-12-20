"use client";

import { Menu, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardHeader({
  onOpenMenu,
}: {
  onOpenMenu: () => void;
}) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include", // ⭐️ חשוב בשביל cookies
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

        <span className="mr-3 font-medium text-[#4a413a]">
         
        </span>
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
        title="התנתקות"
      >
        <LogOut size={18} />
        יציאה
      </button>
    </header>
  );
}
