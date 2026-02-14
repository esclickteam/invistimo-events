"use client";

import { useState } from "react";

export type MessageTab = "rsvp" | "reminder" | "thankyou";

type TabsProps = {
  onChange?: (tab: MessageTab) => void;
};

export default function Tabs({ onChange }: TabsProps) {
  const [activeTab, setActiveTab] = useState<MessageTab>("rsvp");

  const handleChange = (tab: MessageTab) => {
    setActiveTab(tab);
    onChange?.(tab);
  };

  return (
    <div className="w-full max-w-[600px] mb-8">
      {/* Tabs Header */}
      <div className="flex gap-2 bg-[#f4efe9] rounded-2xl p-1">
        <TabButton
          label="אישור הגעה"
          active={activeTab === "rsvp"}
          onClick={() => handleChange("rsvp")}
        />

        <TabButton
          label="תזכורת"
          active={activeTab === "reminder"}
          onClick={() => handleChange("reminder")}
        />

        <TabButton
          label="הודעת תודה"
          active={activeTab === "thankyou"}
          onClick={() => handleChange("thankyou")}
        />
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-500 mt-2 text-center">
        בחרו סוג הודעה – לכל סוג יש תוכן ושליחה מותאמים
      </p>
    </div>
  );
}

/* ================= TAB BUTTON ================= */

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex-1 py-2 rounded-xl text-sm font-medium transition
        ${
          active
            ? "bg-white text-[#4a413a] shadow"
            : "text-gray-500 hover:bg-white/60"
        }
      `}
    >
      {label}
    </button>
  );
}
