"use client";

import { useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { key: "overview", label: "תמונת מצב" },
  { key: "planning", label: "תכנון וקונספט" },
  { key: "suppliers", label: "ספקים ותקציב" },
  { key: "calendar", label: "לוח שנה ופגישות" },
  { key: "logistics", label: "לוגיסטיקה" },
  { key: "alcohol", label: "אלכוהול" }, // 🆕 חדש
];

export default function ProductionTabs({
  overview,
  planning,
  suppliers,
  calendar,
  logistics,
  alcohol, // 🆕 חדש
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 🔑 הטאב נקבע מה־URL
  const activeTab = searchParams.get("tab") || "overview";

  function changeTab(tabKey) {
    router.push(`/events/production?tab=${tabKey}`);
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
        {activeTab === "alcohol" && alcohol} {/* 🆕 */}
      </div>
    </div>
  );
}
