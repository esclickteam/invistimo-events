"use client";

import { useState } from "react";
import RsvpTab from "./tabs/RsvpTab";
import ReminderTab from "./tabs/ReminderTab";
import ThankYouTab from "./tabs/ThankYouTab";

/* ================= TYPES ================= */

type Guest = {
  _id: string;
  name: string;
  phone: string;
  rsvp?: "yes" | "no" | "pending";
  tableName?: string;
  tableNumber?: number;
};

type TabKey = "rsvp" | "reminder" | "thankyou";

export default function NewMessagesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("rsvp");

  /* ================= TEMP DATA (בהמשך מהשרת) ================= */

  const guests: Guest[] = [];

  // ⭐ פרטי אירוע – מקור אמת אחד
  const eventTitle = "האירוע שלנו";
  const eventDate = "12/03/2026";
  const eventLocation = "גן אירועים – תל אביב";

  /* ================= RENDER ================= */

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ================= Header ================= */}
      <header>
        <h1 className="text-xl font-bold">📨 שליחת הודעות</h1>
        <p className="text-sm text-gray-500">
          ניהול ושליחה לפי סבבים
        </p>
      </header>

      {/* ================= Tabs ================= */}
      <div className="flex gap-4 border-b">
        <TabButton
          label="אישור הגעה"
          active={activeTab === "rsvp"}
          onClick={() => setActiveTab("rsvp")}
        />

        <TabButton
          label="תזכורת"
          active={activeTab === "reminder"}
          onClick={() => setActiveTab("reminder")}
        />

        <TabButton
          label="הודעת תודה"
          active={activeTab === "thankyou"}
          onClick={() => setActiveTab("thankyou")}
        />
      </div>

      {/* ================= Content ================= */}
      <main>
        {activeTab === "rsvp" && (
          <RsvpTab
            guests={guests}
            eventTitle={eventTitle}
            eventDate={eventDate}
            eventLocation={eventLocation}
          />
        )}

        {activeTab === "reminder" && (
          <ReminderTab
            guests={guests}
            eventTitle={eventTitle}
            eventDate={eventDate}
            eventLocation={eventLocation}
          />
        )}

        {activeTab === "thankyou" && (
          <ThankYouTab
            guests={guests}
            eventTitle={eventTitle}
            eventDate={eventDate}
            eventLocation={eventLocation}
          />
        )}
      </main>
    </div>
  );
}

/* ================= Tab Button ================= */

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
      onClick={onClick}
      className={`pb-2 text-sm font-medium border-b-2 ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );
}
