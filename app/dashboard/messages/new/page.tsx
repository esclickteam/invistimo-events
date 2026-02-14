"use client";

import { useState } from "react";
import RsvpTab from "./tabs/RsvpTab";
import ReminderTab from "./tabs/ReminderTab";

/* ================= TYPES ================= */

type Guest = {
  _id: string;
  name: string;
  phone: string;
  rsvp?: "yes" | "no" | "pending";
  tableName?: string;
  tableNumber?: number;
};

type TabKey = "rsvp" | "reminder";

export default function NewMessagesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("rsvp");

  // ⛔️ זמני – בהמשך יבוא מה־server
  const guests: Guest[] = [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-xl font-bold">📨 שליחת הודעות</h1>
        <p className="text-sm text-gray-500">
          ניהול ושליחה לפי סבבים
        </p>
      </header>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("rsvp")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === "rsvp"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500"
          }`}
        >
          אישור הגעה
        </button>

        <button
          onClick={() => setActiveTab("reminder")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === "reminder"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500"
          }`}
        >
          תזכורת
        </button>
      </div>

      <main>
        {activeTab === "rsvp" && <RsvpTab guests={guests} />}

        {activeTab === "reminder" && (
          <ReminderTab
            guests={guests}
            invitationId=""
          />
        )}
      </main>
    </div>
  );
}
