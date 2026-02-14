"use client";

import { useEffect, useState } from "react";
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

type EventMeta = {
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventType?: string;
  giftCreditUrl?: string;
  headerImageUrl?: string;
};

/* ================= HELPERS ================= */

function formatEventDate(value: any): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("he-IL");
}

/* ================= COMPONENT ================= */

export default function NewMessagesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("rsvp");

  const [guests, setGuests] = useState<Guest[]>([]);
  const [eventMeta, setEventMeta] = useState<EventMeta | null>(null);
  const [loading, setLoading] = useState(true);

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/invitations/my", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json();
        const invitation = data?.invitation;
        const event = invitation?.event;

        if (!invitation || !event) {
          setLoading(false);
          return;
        }

        // 🧠 בניית EventMeta אחיד
        const meta: EventMeta = {
          eventTitle: event.title || "",
          eventDate: formatEventDate(event.date),
          eventLocation:
            event.location?.address ||
            event.location?.name ||
            "",
          eventType: event.eventType || "",
          giftCreditUrl: event.giftCreditUrl || "",
          headerImageUrl:
            invitation.previewImage ||
            invitation.headerImageUrl ||
            "",
        };

        setEventMeta(meta);

        // 👥 אורחים (אם קיימים ב־invitation)
        if (Array.isArray(invitation.guests)) {
          setGuests(invitation.guests);
        }
      } catch (err) {
        console.error("❌ Failed to load invitation data", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) return null;
  if (!eventMeta) return null;

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
          <RsvpTab guests={guests} {...eventMeta} />
        )}

        {activeTab === "reminder" && (
          <ReminderTab guests={guests} {...eventMeta} />
        )}

        {activeTab === "thankyou" && (
          <ThankYouTab guests={guests} {...eventMeta} />
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
