"use client";

import { useState } from "react";

const TABS = [
  { key: "overview", label: "תמונת מצב" },
  { key: "planning", label: "תכנון וקונספט" },
  { key: "suppliers", label: "ספקים ותקציב" },
  { key: "logistics", label: "לוגיסטיקה" },
];

export default function ProductionTabs({
  overview,
  planning,
  suppliers,
  logistics,
}) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      <div className="flex gap-8 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
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

      <div>
        {activeTab === "overview" && overview}
        {activeTab === "planning" && planning}
        {activeTab === "suppliers" && suppliers}
        {activeTab === "logistics" && logistics}
      </div>
    </div>
  );
}
