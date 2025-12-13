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
      "שלום {{name}} 🌸\nשמחים לעדכן שמספר השולחן שלך:\n🪑 {{tableName}}\nמחכים לך!",
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

  const [templateKey, setTemplateKey] =
    useState<MessageType>("rsvp");
  const [message, setMessage] = useState(
    MESSAGE_TEMPLATES.rsvp.content
  );

  const [filter, setFilter] = useState<FilterType>("pending");
  const [sendMode, setSendMode] = useState<SendMode>("now");
  const [scheduledAt, setScheduledAt] = useState("");

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

  /* ================= BALANCE (FRONT MOCK) ================= */

  const maxGuests = invitation?.maxGuests || 300; // מהחבילה
  const maxMessages = maxGuests * 3;
  const usedMessages = guestsToSend.length;
  const remainingMessages = Math.max(
    maxMessages - usedMessages,
    0
  );

  /* ================= SEND (WHATSAPP MOCK) ================= */

  const sendWhatsApp = (guest: Guest) => {
    const phone = `972${guest.phone.replace(/\D/g, "").replace(/^0/, "")}`;

    const finalMessage = message
      .replace("{{name}}", guest.name)
      .replace(
        "{{rsvpLink}}",
        `https://invistimo.com/invite/rsvp/${invitation.shareId}?token=${guest.token}`
      )
      .replace("{{tableName}}", guest.tableName || "");

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(finalMessage)}`,
      "_blank"
    );
  };

  const sendToAll = () => {
    guestsToSend.forEach((guest, index) => {
      setTimeout(() => sendWhatsApp(guest), index * 600);
    });
  };

  if (loading) return null;

  /* ================= RENDER ================= */

  return (
    <div className="p-10 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:underline"
        >
          ← חזרה
        </button>

        <h1 className="text-3xl font-semibold mt-2">
          {invitation?.eventType} |{" "}
          {new Date(invitation?.eventDate).toLocaleDateString("he-IL")}
        </h1>

        <div className="mt-2 text-sm text-gray-600">
          יתרת הודעות:{" "}
          <strong>
            {remainingMessages} / {maxMessages}
          </strong>
        </div>
      </div>

      {/* Message type */}
      <select
        value={templateKey}
        onChange={(e) => setTemplateKey(e.target.value as MessageType)}
        className="w-full border rounded-xl p-3 mb-4"
      >
        {Object.entries(MESSAGE_TEMPLATES).map(([key, t]) => (
          <option key={key} value={key}>
            {t.label}
          </option>
        ))}
      </select>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        {[
          { key: "pending", label: "טרם השיבו" },
          { key: "withTable", label: "עם שולחן" },
          { key: "all", label: "כולם" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as FilterType)}
            className={`px-4 py-2 rounded-full border ${
              filter === f.key
                ? "bg-green-600 text-white"
                : ""
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Message */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={6}
        className="w-full border rounded-xl p-4 mb-6"
      />

      {/* Timing */}
      <div className="flex gap-4 mb-6">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={sendMode === "now"}
            onChange={() => setSendMode("now")}
          />
          שליחה מיידית
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={sendMode === "scheduled"}
            onChange={() => setSendMode("scheduled")}
          />
          שליחה מתוזמנת
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
        disabled={guestsToSend.length === 0}
        className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-semibold disabled:opacity-50"
      >
        💬 שליחה ({guestsToSend.length})
      </button>

      {/* Manual */}
      <div className="mt-10">
        <h3 className="font-semibold mb-3">שליחה ידנית</h3>
        <div className="space-y-2">
          {guestsToSend.map((g) => (
            <button
              key={g._id}
              onClick={() => sendWhatsApp(g)}
              className="w-full border px-4 py-2 rounded text-right hover:bg-gray-50"
            >
              💬 {g.name} ({g.phone})
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
