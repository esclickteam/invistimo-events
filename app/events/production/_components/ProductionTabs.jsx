"use client";

import { useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { key: "overview", label: "תמונת מצב" },
  { key: "planning", label: "תכנון וקונספט" },
  { key: "suppliers", label: "ספקים ותקציב" },
  { key: "calendar", label: "לוח שנה ופגישות" },
  { key: "logistics", label: "לוגיסטיקה" },
  { key: "alcohol", label: "אלכוהול" },

  // לייב
  { key: "live-guests", label: "לייב – אורחים", live: true },
  { key: "live-seating", label: "לייב – הושבה", live: true },
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
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const changeTab = (tabKey) => {
    router.push(`/events/production?tab=${tabKey}`);
  };

  // Guard
  if (!invitation) {
    return (
      <div className="p-10 text-center text-gray-500">
        <h3 className="text-lg font-semibold mb-2">
          המשתמש עדיין לא קיבל הזמנה
        </h3>
        <p>
          ההפקה תתאפשר לאחר יצירת הזמנה או אירוע.
          אם זה משתמש שנוצר ע״י מפיק, ההזמנה תיווצר אוטומטית.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ================= TABS ================= */}
      <div className="sticky top-16 z-20 bg-[#f7f2ec] border-b border-[#e5dccf]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-3">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => changeTab(tab.key)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                    transition
                    ${
                      isActive
                        ? "bg-black text-white"
                        : "text-black/70 hover:bg-black/5"
                    }
                    ${
                      tab.live && !isActive
                        ? "border border-black/20"
                        : ""
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= CONTENT ================= */}
      <div className="max-w-7xl mx-auto px-4">
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
