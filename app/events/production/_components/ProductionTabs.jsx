"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  LayoutDashboard,
  Palette,
  Handshake,
  CalendarDays,
  ListChecks,
  Wine,
  Gift,
} from "lucide-react";

const TABS = [
  {
    key: "overview",
    label: "תמונת מצב",
    icon: LayoutDashboard,
  },
  {
    key: "planning",
    label: "תכנון וקונספט",
    icon: Palette,
  },
  {
    key: "suppliers",
    label: "ספקים ותקציב",
    icon: Handshake,
  },
  {
    key: "calendar",
    label: "לוח שנה ופגישות",
    icon: CalendarDays,
  },
  {
    key: "logistics",
    label: "לוגיסטיקה",
    icon: ListChecks,
  },
  {
    key: "alcohol",
    label: "אלכוהול",
    icon: Wine,
  },
  {
    key: "gifts",
    label: "מתנות מהאירוע",
    icon: Gift,
  },
];

export default function ProductionTabs({
  overview,
  planning,
  suppliers,
  calendar,
  logistics,
  alcohol,
  gifts,
  liveGuests,
  liveSeating,
  invitation,
  eventId,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = (searchParams.get("tab") || "overview").split("/")[0];

  const changeTab = (tabKey) => {
    const params = new URLSearchParams(searchParams.toString());

    if (eventId && !params.get("eventId")) {
      params.set("eventId", eventId);
    }

    params.set("tab", tabKey);

    router.push(`/events/production?${params.toString()}`);
  };

  return (
    <div dir="rtl" className="space-y-8 pt-[102px]">
      {/* ================= TABS ================= */}
      <div
        className="
          sticky
          top-[102px]
          z-[60]
          border-b
          border-[#E8DDD3]
          bg-[#F8F3ED]/90
          backdrop-blur-xl
        "
      >
        <div className="mx-auto max-w-7xl px-4">
          <div
            className="
              no-scrollbar
              flex
              items-center
              justify-center
              gap-3
              overflow-x-auto
              py-4
            "
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => changeTab(tab.key)}
                  className={`
                    group
                    relative
                    flex
                    items-center
                    gap-2
                    whitespace-nowrap
                    rounded-full
                    border
                    px-5
                    py-3
                    text-sm
                    font-black
                    transition-all
                    duration-300
                    ${
                      isActive
                        ? `
                          border-[#E7D8FF]
                          bg-gradient-to-br
                          from-[#F4EDFF]
                          via-white
                          to-[#FBF7F1]
                          text-[#1E1B2E]
                          shadow-[0_14px_35px_rgba(132,90,223,0.14)]
                        `
                        : `
                          border-transparent
                          bg-white/70
                          text-[#6F6678]
                          hover:border-[#E8DDD3]
                          hover:bg-white
                          hover:text-[#1E1B2E]
                          hover:shadow-[0_10px_25px_rgba(120,90,60,0.07)]
                        `
                    }
                  `}
                >
                  <span
                    className={`
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-full
                      transition
                      ${
                        isActive
                          ? `
                            bg-[#8B5CF6]
                            text-white
                            shadow-[0_8px_20px_rgba(139,92,246,0.25)]
                          `
                          : `
                            bg-[#F5E7DC]
                            text-[#7A4A35]
                            group-hover:bg-[#EFE4DA]
                          `
                      }
                    `}
                  >
                    <Icon size={15} />
                  </span>

                  <span>{tab.label}</span>

                  {isActive && (
                    <span
                      className="
                        absolute
                        -bottom-[17px]
                        left-1/2
                        h-[3px]
                        w-10
                        -translate-x-1/2
                        rounded-full
                        bg-[#8B5CF6]
                      "
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= CONTENT ================= */}
      <div className="mx-auto max-w-7xl px-4 pb-12">
        {activeTab === "overview" && overview}
        {activeTab === "planning" && planning}
        {activeTab === "suppliers" && suppliers}
        {activeTab === "calendar" && calendar}
        {activeTab === "logistics" && logistics}
        {activeTab === "alcohol" && alcohol}
        {activeTab === "gifts" && gifts}
        {activeTab === "live-guests" && liveGuests}
        {activeTab === "live-seating" && liveSeating}
      </div>
    </div>
  );
}