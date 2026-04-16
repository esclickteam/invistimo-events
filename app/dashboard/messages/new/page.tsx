"use client";

import { useEffect, useState } from "react";
import RsvpTab from "./tabs/RsvpTab";
import RsvpSmsTab from "./tabs/RsvpSmsTab";
import ReminderTab from "./tabs/ReminderTab";
import ThankYouTab from "./tabs/ThankYouTab";

/* ================= TYPES ================= */

type TabKey = "rsvp" | "rsvp_sms" | "reminder" | "thankyou";

type MessageMeta = {
  invitationTitle: string;      // ✅ חדש
  eventDate: string;
  eventLocation: string;
  eventType?: string;
  giftCreditUrl?: string;
  headerImageUrl?: string;
  lat?: number;
  lng?: number;
};

/* ================= DEFAULTS ================= */

const EMPTY_META: MessageMeta = {
  invitationTitle: "",
  eventDate: "",
  eventLocation: "",
  eventType: "",
  giftCreditUrl: "",
  headerImageUrl: "",
  lat: undefined,
  lng: undefined,
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

  const [meta, setMeta] = useState<MessageMeta>(EMPTY_META);
  const [invitationId, setInvitationId] = useState<string>("");

  const [loading, setLoading] = useState(true);

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/invitations/my", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) return;

        const data = await res.json();
        const invitation = data?.invitation;
        const event = invitation?.event;

        if (invitation && event) {
          setInvitationId(invitation._id);

          setMeta({
            invitationTitle: invitation.title || "",   // ✅ כאן השינוי
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
            lat: event.location?.lat,
            lng: event.location?.lng,
          });
        }
      } catch (err) {
        console.error("❌ Failed to load invitation data", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  /* ================= RENDER ================= */

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
        טוען…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-5xl font-extrabold mb-2 text-gray-800">
          📨 שליחת הודעות
        </h1>
        <p className="text-lg text-gray-500">
          ניהול ושליחה לפי סבבים
        </p>
      </header>

      {/* Tabs */}
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

      {/* Content */}
      <main className="mt-6 p-6 min-h-[300px] bg-white rounded-xl shadow">
        {activeTab === "rsvp" && (
          <RsvpTab invitationId={invitationId} {...meta} />
        )}

        {activeTab === "rsvp_sms" && (
          <RsvpSmsTab invitationId={invitationId} {...meta} />
        )}

        {activeTab === "reminder" && (
          <ReminderTab invitationId={invitationId} {...meta} />
        )}

        {activeTab === "thankyou" && (
          <ThankYouTab invitationId={invitationId} {...meta} />
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