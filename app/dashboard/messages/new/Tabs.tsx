"use client";

import { useState } from "react";

export type MessageTab = "rsvp" | "reminder" | "thankyou";

type TabsProps = {
  value?: MessageTab;              // מאפשר שליטה חיצונית אם צריך
  onChange?: (tab: MessageTab) => void;
};

export default function Tabs({ value, onChange }: TabsProps) {
  const [internalTab, setInternalTab] =
    useState<MessageTab>("rsvp");

  const activeTab = value ?? internalTab;

  const handleChange = (tab: MessageTab) => {
    if (!value) {
      setInternalTab(tab);
    }
    onChange?.(tab);
  };

  const tabs: { key: MessageTab; label: string }[] = [
    { key: "rsvp", label: "אישור הגעה" },
    { key: "reminder", label: "תזכורת" },
    { key: "thankyou", label: "הודעת תודה" },
  ];

  return (
    <div className="w-full max-w-[600px] mb-8 mx-auto">

      {/* Tabs Container */}
      <div
        dir="rtl"
        className="relative flex bg-[#f4efe9] rounded-2xl p-1 shadow-sm"
      >
        {/* Active Background Indicator */}
        <div
          className={`
            absolute top-1 bottom-1 rounded-xl bg-white shadow
            transition-all duration-300 ease-in-out
          `}
          style={{
            width: `${100 / tabs.length}%`,
            right: `${
              (tabs.findIndex((t) => t.key === activeTab) *
                100) /
              tabs.length
            }%`,
          }}
        />

        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleChange(tab.key)}
            className={`
              relative z-10 flex-1 py-2 text-sm font-medium
              transition-colors duration-200
              ${
                activeTab === tab.key
                  ? "text-[#4a413a]"
                  : "text-gray-500 hover:text-[#4a413a]"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-500 mt-3 text-center">
        בחרו סוג הודעה – לכל סוג יש תוכן ושליחה מותאמים
      </p>
    </div>
  );
}
