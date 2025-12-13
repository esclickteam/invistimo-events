"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/* ================= TYPES ================= */

type Guest = {
  _id: string;
  name: string;
  phone: string;
  token: string;
  rsvp: "yes" | "no" | "pending";
  tableName?: string;
};

type MessageType = "rsvp" | "table" | "custom";
type FilterType = "all" | "pending" | "withTable";
type SendMode = "now" | "scheduled";
type Channel = "whatsapp" | "sms";

/* ================= TEMPLATES ================= */

const MESSAGE_TEMPLATES: Record<
  MessageType,
  { label: string; content: string; requiresTable?: boolean }
> = {
  rsvp: {
    label: "אישור הגעה",
    content:
      "היי {{name}} 💛\nנשמח לדעת אם תגיע/י לאירוע 🎉\nלאישור הגעה:\n{{rsvpLink}}",
  },
  table: {
    label: "מספר שולחן",
    requiresTable: true,
    content:
      "שלום {{name}} 🌸\nמספר השולחן שלך:\n🪑 {{tableName}}\nמחכים לך!",
  },
  custom: {
    label: "הודעה חופשית",
    content: "",
  },
};

export default function MessagesPage() {
  const router = useRouter();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [templateKey, setTemplateKey] = useState<MessageType>("rsvp");
  const [message, setMessage] = useState(MESSAGE_TEMPLATES.rsvp.content);

  const [filter, setFilter] = useState<FilterType>("pending");
  const [sendMode, setSendMode] = useState<SendMode>("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [channel, setChannel] = useState<Channel>("whatsapp");

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    async function loadData() {
      const invRes = await fetch("/api/invitations/my");
      const invData = await invRes.json();
      if (!invData.success) return;

      setInvitation(invData.invitation);

      const guestsRes = await fetch(
        `/api/guests?invitation=${invData.invitation._id}`
      );
      const guestsData = await guestsRes.json();
      setGuests(guestsData.guests || []);

      setLoading(false);
    }

    loadData();
  }, []);

  /* ================= TEMPLATE CHANGE ================= */

  useEffect(() => {
    setMessage(MESSAGE_TEMPLATES[templateKey].content);
    if (
      MESSAGE_TEMPLATES[templateKey].requiresTable &&
      filter !== "withTable"
    ) {
      setFilter("withTable");
    }
  }, [templateKey]);

  /* ================= FILTERED GUESTS ================= */

  const guestsToSend = useMemo(() => {
    return guests.filter((g) => {
      if (filter === "pending") return g.rsvp === "pending";
      if (filter === "withTable") return !!g.tableName;
      return true;
    });
  }, [guests, filter]);

  /* ================= BALANCE (CLIENT SIDE) ================= */

  const maxGuests = invitation?.maxGuests || 300;
  const maxMessages = maxGuests * 3;
  const usedMessages = guestsToSend.length;
  const remainingMessages = Math.max(maxMessages - usedMessages, 0);
  const noBalance = remainingMessages <= 0;

  /* ================= MESSAGE BUILD ================= */

  const buildMessage = (guest: Guest) =>
    message
      .replace("{{name}}", guest.name)
      .replace(
        "{{rsvpLink}}",
        `https://invistimo.com/invite/rsvp/${invitation.shareId}?token=${guest.token}`
      )
      .replace("{{tableName}}", guest.tableName || "");

  /* ================= SEND ================= */

  const sendWhatsApp = (guest: Guest) => {
    const phone = `972${guest.phone.replace(/\D/g, "").replace(/^0/, "")}`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(
        buildMessage(guest)
      )}`,
      "_blank"
    );
  };

  const sendSMSMock = (guest: Guest) => {
    alert(`SMS יישלח ל־${guest.phone}\n\n${buildMessage(guest)}`);
  };

  const sendToAll = () => {
    if (sendMode === "scheduled" && !scheduledAt) {
      alert("יש לבחור תאריך ושעה");
      return;
    }

    guestsToSend.forEach((guest, index) => {
      setTimeout(() => {
        channel === "whatsapp"
          ? sendWhatsApp(guest)
          : sendSMSMock(guest);
      }, index * 600);
    });
  };

  if (loading) return null;

  /* ================= RENDER ================= */

  return (
    <div className="p-10 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 mb-3 hover:underline"
      >
        ← חזרה
      </button>

      <h1 className="text-3xl font-semibold mb-1">
        {invitation?.eventType} |{" "}
        {new Date(invitation?.eventDate).toLocaleDateString("he-IL")}
      </h1>

      {/* Balance Card */}
      <div className="bg-white border rounded-xl p-4 mb-6 shadow-sm flex justify-between">
        <span className="font-medium">יתרת הודעות</span>
        <span
          className={`font-bold ${
            noBalance ? "text-red-600" : "text-green-600"
          }`}
        >
          {remainingMessages} / {maxMessages}
        </span>
      </div>

      {/* Channel */}
      <div className="flex gap-4 mb-4">
        {["whatsapp", "sms"].map((c) => (
          <button
            key={c}
            onClick={() => setChannel(c as Channel)}
            className={`px-4 py-2 rounded-full border ${
              channel === c
                ? "bg-blue-600 text-white"
                : ""
            }`}
          >
            {c === "whatsapp" ? "WhatsApp" : "SMS"}
          </button>
        ))}
      </div>

      {/* Template */}
      <select
        value={templateKey}
        onChange={(e) =>
          setTemplateKey(e.target.value as MessageType)
        }
        className="w-full border rounded-xl p-3 mb-4"
      >
        {Object.entries(MESSAGE_TEMPLATES).map(([key, t]) => (
          <option key={key} value={key}>
            {t.label}
          </option>
        ))}
      </select>

      {/* Message */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={6}
        className="w-full border rounded-xl p-4 mb-4"
      />

      {/* Timing */}
      <div className="flex gap-4 mb-6 items-center">
        <label>
          <input
            type="radio"
            checked={sendMode === "now"}
            onChange={() => setSendMode("now")}
          />{" "}
          מיידי
        </label>

        <label>
          <input
            type="radio"
            checked={sendMode === "scheduled"}
            onChange={() => setSendMode("scheduled")}
          />{" "}
          מתוזמן
        </label>

        {sendMode === "scheduled" && (
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="border rounded-lg px-3 py-1"
          />
        )}
      </div>

      {/* Send */}
      <button
        onClick={sendToAll}
        disabled={noBalance || guestsToSend.length === 0}
        className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-semibold disabled:opacity-50"
      >
        📩 שליחה ({guestsToSend.length})
      </button>
    </div>
  );
}
