"use client";

import { useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { key: "overview", label: "תמונת מצב" },
  { key: "planning", label: "תכנון וקונספט" },
  { key: "suppliers", label: "ספקים ותקציב" },
  { key: "calendar", label: "לוח שנה ופגישות" },
  { key: "logistics", label: "לוגיסטיקה" },
  { key: "alcohol", label: "אלכוהול" },
  { key: "live-seating", label: "לייב – הושבה" },
];

export default function ProductionTabs({
  overview,
  planning,
  suppliers,
  calendar,
  logistics,
  alcohol,
  liveSeating,
  invitation, // 🆕 נשלח מה־parent component
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 🔑 הטאב הפעיל
  const activeTab = searchParams.get("tab") || "overview";

  function changeTab(tabKey) {
    router.push(`/events/production?tab=${tabKey}`);
  }

  // 🔹 Guard – אם אין הזמנה, מונע קריסה
  if (!invitation) {
    return (
      <div className="p-8 text-center text-gray-500">
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
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="flex gap-8 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => changeTab(tab.key)}
            className={`pb-3 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "border-b-2 border-black text-black"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabs Content */}
      <div>
        {activeTab === "overview" && overview}
        {activeTab === "planning" && planning}
        {activeTab === "suppliers" && suppliers}
        {activeTab === "calendar" && calendar}
        {activeTab === "logistics" && logistics}
        {activeTab === "alcohol" && alcohol}
        {activeTab === "live-seating" && liveSeating}
      </div>
    </div>
  );
}
