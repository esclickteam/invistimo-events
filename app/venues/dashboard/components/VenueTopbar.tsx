"use client";

import React from "react";
import { Bell, ChevronLeft, Menu, Plus, Search, Sparkles } from "lucide-react";

import type { VenueTabItem } from "@/app/venues/dashboard/VenueDashboardClient";

type Props = {
  activeTabData: VenueTabItem;
  onOpenMobileMenu: () => void;
};

export default function VenueTopbar({
  activeTabData,
  onOpenMobileMenu,
}: Props) {
  const Icon = activeTabData.icon;

  return (
    <header className="sticky top-0 z-30 border-b border-[#eadfce]/80 bg-[#f7f2ea]/85 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="פתיחת תפריט"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#eadfce] bg-white text-[#2f261d] shadow-sm lg:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2f261d] text-white shadow-sm sm:flex">
            <Icon size={22} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-black text-[#a5824f]">
              <Sparkles size={14} />
              <span>Invistimo Venues</span>
            </div>

            <h1 className="mt-1 truncate text-xl font-black text-[#2f261d] sm:text-2xl">
              {activeTabData.label}
            </h1>

            <p className="hidden text-sm font-bold text-[#7b6a58] sm:block">
              {activeTabData.description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden h-11 w-72 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 shadow-sm xl:flex">
            <Search size={17} className="text-[#9b8974]" />

            <input
              placeholder="חיפוש לקוח, אירוע או אולם..."
              className="w-full bg-transparent text-sm font-bold text-[#2f261d] outline-none placeholder:text-[#a99a89]"
            />
          </div>

          <button
            type="button"
            className="hidden h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#2f261d] shadow-sm transition hover:bg-[#fffaf4] md:flex"
          >
            <Bell size={17} />
            התראות
          </button>

          <button
            type="button"
            className="flex h-11 items-center gap-2 rounded-2xl bg-[#2f261d] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#493a2d]"
          >
            <Plus size={17} />
            <span className="hidden sm:inline">פעולה חדשה</span>
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}