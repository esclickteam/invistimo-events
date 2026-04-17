"use client";

import { useState } from "react";
import RsvpTab from "@/app/dashboard/messages/new/tabs/RsvpTab";
import RsvpSmsTab from "@/app/dashboard/messages/new/tabs/RsvpSmsTab";
import ReminderTab from "@/app/dashboard/messages/new/tabs/ReminderTab";
import ThankYouTab from "@/app/dashboard/messages/new/tabs/ThankYouTab";

type TabKey = "rsvp" | "rsvp_sms" | "reminder" | "thankyou";

type MessageMeta = {
  invitationTitle: string;
  eventDate: string;
  eventLocation: string;
  eventType?: string;
  giftCreditUrl?: string;
  headerImageUrl?: string;
  lat?: number;
  lng?: number;
};

const DEMO_META: MessageMeta = {
  invitationTitle: "החתונה של בר ומאי",
  eventDate: "20.09.2026",
  eventLocation: "גן האירועים קיסר, תל אביב",
  eventType: "חתונה",
  giftCreditUrl: "",
  headerImageUrl: "",
  lat: 32.0853,
  lng: 34.7818,
};

export default function DemoNewMessagePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("rsvp");
  const invitationId = "demo-invitation-id";

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <header className="text-center">
        <h1 className="text-5xl font-extrabold mb-2 text-gray-800">
          📨 שליחת הודעות
        </h1>
        <p className="text-lg text-gray-500">ניהול ושליחה לפי סבבים</p>
      </header>

      <div className="flex justify-center gap-4 bg-gray-50 rounded-xl p-2 shadow-inner">
        <TabButton
          label="אישור הגעה WhatsApp"
          active={activeTab === "rsvp"}
          onClick={() => setActiveTab("rsvp")}
        />
        <TabButton
          label="אישור הגעה SMS"
          active={activeTab === "rsvp_sms"}
          onClick={() => setActiveTab("rsvp_sms")}
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

      <main className="mt-6 p-6 min-h-[300px] bg-white rounded-xl shadow">
        {activeTab === "rsvp" && (
          <RsvpTab invitationId={invitationId} {...DEMO_META} />
        )}

        {activeTab === "rsvp_sms" && (
          <RsvpSmsTab invitationId={invitationId} {...DEMO_META} />
        )}

        {activeTab === "reminder" && (
          <ReminderTab invitationId={invitationId} {...DEMO_META} />
        )}

        {activeTab === "thankyou" && (
          <ThankYouTab invitationId={invitationId} {...DEMO_META} />
        )}
      </main>
    </div>
  );
}

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
      className={`
        flex-1 px-6 py-3 rounded-full font-medium text-sm transition
        ${
          active
            ? "bg-blue-600 text-white shadow-md scale-105"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }
      `}
    >
      {label}
    </button>
  );
}