"use client";

import { Menu } from "lucide-react";

export default function DashboardHeader({
  onOpenMenu,
}: {
  onOpenMenu: () => void;
}) {
  return (
    <header
      className="
        md:hidden
        h-14
        flex items-center
        px-4
        border-b border-[#e2d6c8]
        bg-[#f5eee7]
      "
      dir="rtl"
    >
      <button onClick={onOpenMenu} className="p-2" aria-label="פתח תפריט דשבורד">
        <Menu size={22} />
      </button>

      <span className="mr-3 font-medium text-[#4a413a]">ניהול האירוע</span>
    </header>
  );
}
