"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  LayoutDashboard,
  Palette,
  Handshake,
  CalendarDays,
  ListChecks,
  Wine,
  Sparkles,
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
];

export default function ProductionTabs({
  overview,
  planning,
  suppliers,
  calendar,
  logistics,
  alcohol,
  liveGuests,
  liveSeating,
  invitation,
  eventId,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab =
    (searchParams.get("tab") || "overview").split("/")[0];

  const changeTab = (tabKey) => {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    if (eventId && !params.get("eventId")) {
      params.set("eventId", eventId);
    }

    params.set("tab", tabKey);

    router.push(
      `/events/production?${params.toString()}`
    );
  };

  if (!invitation && activeTab === "overview") {
    return (
      <div
        dir="rtl"
        className="
          max-w-4xl
          mx-auto
          mt-10
          rounded-[34px]
          border
          border-[#ECE5DE]
          bg-white
          p-10
          text-center
          shadow-sm
        "
      >
        <div
          className="
            h-16
            w-16
            mx-auto
            mb-5
            rounded-3xl
            bg-[#F5E7DC]
            text-[#7A4A35]
            flex
            items-center
            justify-center
          "
        >
          <Sparkles size={24} />
        </div>

        <h3
          className="
            text-2xl
            font-black
            text-[#1E1B2E]
            mb-3
          "
        >
          המשתמש עדיין לא קיבל הזמנה
        </h3>

        <p className="text-gray-500 leading-7">
          ההפקה תתאפשר לאחר יצירת הזמנה או אירוע.
          אם זה משתמש שנוצר ע״י מפיק, ההזמנה תיווצר אוטומטית.
        </p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-8">
      {/* ================= TABS ================= */}
      <div
        className="
          sticky
          top-16
          z-50
          border-b
          border-[#E8DDD3]
          bg-[#F8F3ED]/90
          backdrop-blur-xl
        "
      >
        <div className="max-w-7xl mx-auto px-4">
          <div
            className="
              flex
              items-center
              justify-center
              gap-3
              overflow-x-auto
              no-scrollbar
              py-4
            "
          >
            {TABS.map((tab) => {
              const isActive =
                activeTab === tab.key;

              const Icon = tab.icon;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() =>
                    changeTab(tab.key)
                  }
                  className={`
                    group
                    relative
                    flex
                    items-center
                    gap-2
                    rounded-full
                    px-5
                    py-3
                    text-sm
                    font-black
                    whitespace-nowrap
                    border
                    transition-all
                    duration-300
                    ${
                      isActive
                        ? `
                          bg-gradient-to-br
                          from-[#F4EDFF]
                          via-white
                          to-[#FBF7F1]
                          text-[#1E1B2E]
                          border-[#E7D8FF]
                          shadow-[0_14px_35px_rgba(132,90,223,0.14)]
                        `
                        : `
                          bg-white/70
                          text-[#6F6678]
                          border-transparent
                          hover:bg-white
                          hover:text-[#1E1B2E]
                          hover:border-[#E8DDD3]
                          hover:shadow-[0_10px_25px_rgba(120,90,60,0.07)]
                        `
                    }
                  `}
                >
                  <span
                    className={`
                      h-8
                      w-8
                      rounded-full
                      flex
                      items-center
                      justify-center
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
                        -translate-x-1/2
                        h-[3px]
                        w-10
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
      <div className="max-w-7xl mx-auto px-4 pb-12">
        {activeTab === "overview" && overview}
        {activeTab === "planning" && planning}
        {activeTab === "suppliers" && suppliers}
        {activeTab === "calendar" && calendar}
        {activeTab === "logistics" && logistics}
        {activeTab === "alcohol" && alcohol}
        {activeTab === "live-guests" && liveGuests}
        {activeTab === "live-seating" && liveSeating}
      </div>
    </div>
  );
}