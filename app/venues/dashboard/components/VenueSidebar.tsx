"use client";

import React from "react";
import { Crown, X } from "lucide-react";

import type {
  VenueTab,
  VenueTabItem,
} from "@/app/venues/dashboard/VenueDashboardClient";

type Props = {
  tabs: VenueTabItem[];
  activeTab: VenueTab;
  onChangeTab: (tab: VenueTab) => void;
  mobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
};

export default function VenueSidebar({
  tabs,
  activeTab,
  onChangeTab,
  mobileMenuOpen,
  onCloseMobileMenu,
}: Props) {
  return (
    <>
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="סגירת תפריט"
          onClick={onCloseMobileMenu}
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={[
          "fixed right-0 top-0 z-50 h-screen w-[86%] max-w-80 border-l border-[#eadfce] bg-[#fffaf4] shadow-2xl transition-transform duration-300 lg:translate-x-0",
          "lg:z-20 lg:w-80 lg:shadow-none",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-full flex-col px-4 py-5">
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <p className="text-sm font-black text-[#2f261d]">
              תפריט מערכת אולמות
            </p>

            <button
              type="button"
              onClick={onCloseMobileMenu}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#eadfce] bg-white text-[#2f261d]"
            >
              <X size={18} />
            </button>
          </div>

          <div className="rounded-[1.75rem] border border-[#eadfce] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d8b873] to-[#a77b32] text-white shadow-md">
                <Crown size={22} />
              </div>

              <div>
                <h2 className="text-lg font-black text-[#2f261d]">
                  Invistimo Venues
                </h2>

                <p className="mt-1 text-xs font-bold text-[#8a7966]">
                  מערכת אולמות ומתחמים
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-[#f7f2ea] p-3">
              <p className="text-xs font-black text-[#a5824f]">סטטוס מערכת</p>
              <p className="mt-1 text-sm font-black text-[#2f261d]">
                דשבורד אולם פעיל
              </p>
            </div>
          </div>

          <nav className="mt-5 flex-1 space-y-2 overflow-y-auto pb-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChangeTab(tab.id)}
                  className={[
                    "group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-right transition",
                    selected
                      ? "bg-[#2f261d] text-white shadow-lg shadow-[#2f261d]/15"
                      : "text-[#6d5c49] hover:bg-white hover:text-[#2f261d] hover:shadow-sm",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition",
                      selected
                        ? "bg-white/15 text-white"
                        : "bg-[#f1e6d4] text-[#a5824f] group-hover:bg-[#f6ead6]",
                    ].join(" ")}
                  >
                    <Icon size={18} />
                  </span>

                  <span className="min-w-0">
                    <span className="block text-sm font-black">
                      {tab.label}
                    </span>

                    <span
                      className={[
                        "mt-0.5 block truncate text-xs font-bold",
                        selected ? "text-white/70" : "text-[#9b8974]",
                      ].join(" ")}
                    >
                      {tab.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}