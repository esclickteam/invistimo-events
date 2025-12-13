"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Guest = {
  _id: string;
  name: string;
  phone: string;
  token: string;
  rsvp: "yes" | "no" | "pending";
  tableName?: string;
};

const MESSAGE_TEMPLATES = {
  rsvp: {
    label: "אישור הגעה",
    content:
      "היי {{name}} 💛\nנשמח לדעת אם תגיע/י לאירוע 🎉\nלאישור הגעה:\n{{rsvpLink}}",
  },
  table: {
    label: "מספר שולחן",
    content:
      "שלום {{name}} 🌸\nביום האירוע שובצת לשולחן:\n🪑 {{tableName}}\nמחכים לך!",
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
    useState<keyof typeof MESSAGE_TEMPLATES>("rsvp");

  const [message, setMessage] = useState(
    MESSAGE_TEMPLATES.rsvp.content
  );

  const [filter, setFilter] =
    useState<"all" | "pending" | "withTable">("pending");

  /* ============================================================
     Load data
  ============================================================ */
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

  /* ============================================================
     Template change
  ============================================================ */
  useEffect(() => {
    setMessage(MESSAGE_TEMPLATES[templateKey].content);
  }, [templateKey]);

  if (loading) return null;

  /* ============================================================
     Guests to send
  ============================================================ */
  const guestsToSend = guests.filter((g) => {
    if (filter === "pending") return g.rsvp === "pending";
    if (filter === "withTable") return !!g.tableName;
    return true;
  });

  /* ============================================================
     WhatsApp send
  ============================================================ */
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
      setTimeout(() => sendWhatsApp(guest), index * 500);
    });
  };

  /* ============================================================
     Render
  ============================================================ */
  return (
    <div className="p-10 max-w-4xl mx-auto" dir="rtl">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 mb-4 hover:underline"
      >
        ← חזרה לדשבורד
      </button>

      <h1 className="text-3xl font-semibold mb-6">שליחת הודעות</h1>

      {/* Template */}
      <div className="mb-6">
        <label className="block mb-2 font-medium">סוג הודעה</label>
        <select
          value={templateKey}
          onChange={(e) =>
            setTemplateKey(e.target.value as any)
          }
          className="w-full border rounded-xl p-3"
        >
          {Object.entries(MESSAGE_TEMPLATES).map(([key, t]) => (
            <option key={key} value={key}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded-full border ${
            filter === "pending"
              ? "bg-green-600 text-white"
              : ""
          }`}
        >
          טרם השיבו
        </button>

        <button
          onClick={() => setFilter("withTable")}
          className={`px-4 py-2 rounded-full border ${
            filter === "withTable"
              ? "bg-green-600 text-white"
              : ""
          }`}
        >
          עם מספר שולחן
        </button>

        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-full border ${
            filter === "all"
              ? "bg-green-600 text-white"
              : ""
          }`}
        >
          כולם
        </button>
      </div>

      {/* Message */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={6}
        className="w-full border rounded-xl p-4 mb-6"
      />

      {/* Send */}
      <button
        onClick={sendToAll}
        disabled={guestsToSend.length === 0}
        className="
          w-full
          bg-green-600
          text-white
          py-4
          rounded-xl
          font-semibold
          text-lg
          hover:bg-green-700
          disabled:opacity-50
        "
      >
        💬 שליחה ב-WhatsApp ({guestsToSend.length})
      </button>

      {/* Manual */}
      <div className="mt-10">
        <h3 className="font-semibold mb-3">שליחה ידנית</h3>
        <div className="space-y-2">
          {guestsToSend.map((g) => (
            <button
              key={g._id}
              onClick={() => sendWhatsApp(g)}
              className="block w-full text-right border px-4 py-2 rounded hover:bg-gray-50"
            >
              💬 {g.name} ({g.phone})
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
