"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * 🔹 טאבים "אמיתיים" בלבד
 * LIVE מנוהל בתוך המסכים עצמם (לא כטאב)
 */
const TABS = [
  { key: "overview", label: "תמונת מצב" },
  { key: "planning", label: "תכנון וקונספט" },
  { key: "suppliers", label: "ספקים ותקציב" },
  { key: "calendar", label: "לוח שנה ופגישות" },
  { key: "logistics", label: "לוגיסטיקה" },
  { key: "alcohol", label: "אלכוהול" },
];

export default function ProductionTabs({
  overview,
  planning,
  suppliers,
  calendar,
  logistics,
  alcohol,

  // 🧠 נשארים בפרופס אבל לא בשימוש כרגע
  liveGuests,
  liveSeating,

  invitation,
  eventId,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawTab = (searchParams.get("tab") || "overview").split("/")[0];

  /**
   * 🚧 Guard:
   * אם מישהו מנסה להגיע ל-live דרך URL ישן
   * מחזירים אותו לטאב בטוח
   */
  const activeTab =
    rawTab.startsWith("live-") ? "overview" : rawTab;

  const changeTab = (tabKey) => {
    const params = new URLSearchParams(searchParams.toString());

    if (eventId && !params.get("eventId")) {
      params.set("eventId", eventId);
    }

    params.set("tab", tabKey);
    router.push(`/events/production?${params.toString()}`);
  };

  // Guard קיים – נשאר כמו שהוא
  if (!invitation && activeTab === "overview") {
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
      <div className="sticky top-16 z-50 bg-[#f7f2ec] border-b border-[#e5dccf]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-3 pb-2">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => changeTab(tab.key)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                    transition
                    ${
                      isActive
                        ? "bg-black text-white"
                        : "text-black/70 hover:bg-black/5"
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
      </div>
    </div>
  );
}
