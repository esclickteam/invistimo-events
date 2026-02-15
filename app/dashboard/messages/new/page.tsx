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

  // 🔥 הוסיפי את זה
  lat?: number;
  lng?: number;
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
  const [invitationId, setInvitationId] = useState<string | null>(null);
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

        // ⭐ שמירת invitationId (קריטי!)
        setInvitationId(invitation._id);

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

  // 🔥 זה מה שחסר לך
  lat: event.location?.lat,
  lng: event.location?.lng,
};


        setEventMeta(meta);

        // 👥 אורחים (לטאבים האחרים)
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

  /* ================= GUARDS ================= */

  if (loading) return null;
  if (!eventMeta || !invitationId) return null;

  /* ================= RENDER ================= */

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* ================= Header ================= */}
      <header className="text-center">
        <h1 className="text-5xl font-extrabold mb-2 text-gray-800">
          📨 שליחת הודעות
        </h1>
        <p className="text-lg text-gray-500">
          ניהול ושליחה לפי סבבים
        </p>
      </header>

      {/* ================= Tabs ================= */}
      <div className="flex justify-center gap-4 bg-gray-50 rounded-xl p-2 shadow-inner">
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
      <main className="mt-6 bg-white rounded-2xl shadow-lg p-6">
        {activeTab === "rsvp" && (
          <RsvpTab
            invitationId={invitationId}
            {...eventMeta}
          />
        )}

       {activeTab === "reminder" && (
  <ReminderTab
    invitationId={invitationId}
    {...eventMeta}
  />
)}


       {activeTab === "thankyou" && (
  <ThankYouTab
    invitationId={invitationId}
    {...eventMeta}
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
