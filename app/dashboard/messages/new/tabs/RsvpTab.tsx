"use client";

import { useMemo, useState, useEffect } from "react";
import AudienceFilterSelector from "../shared/AudienceFilterSelector";
import SendButton from "../shared/SendButton";
import WhatsappTemplatePreview from "../shared/WhatsappTemplatePreview";

/* ================= TYPES ================= */

type Guest = {
  _id: string;
  name: string;
  phone: string;
  rsvp?: "yes" | "no" | "pending";
};

type Props = {
  invitationId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  headerImageUrl?: string;
};

const RSVP_TEMPLATE_NAME = "rsvp_invitation_media";

/* ================= HELPERS ================= */

function getRsvpPreviewText({
  eventTitle,
  eventDate,
  eventLocation,
}: {
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
}) {
  return `משפחה וחברים יקרים,
הנכם מוזמנים ל- ${eventTitle} 🤍

📅 תאריך: ${eventDate}
📍 מיקום: ${eventLocation}

לאישור הגעה לחצו על הכפתור למטה 👇

מחכים לשמוח איתכם 💖`;
}

/* ================= COMPONENT ================= */

export default function RsvpTab({
  invitationId,
  eventTitle,
  eventDate,
  eventLocation,
  headerImageUrl,
}: Props) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [round, setRound] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);

  const [round1SentAt, setRound1SentAt] = useState<Date | null>(null);
  const [round2SentAt, setRound2SentAt] = useState<Date | null>(null);

  // ✅ חדש – הודעה ידנית
  const [manualMessage, setManualMessage] = useState("");

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [guestsRes, invitationRes] = await Promise.all([
          fetch(`/api/guests?invitation=${invitationId}`),
          fetch(`/api/invitations/${invitationId}`),
        ]);

        const guestsData = await guestsRes.json();
        const invitationData = await invitationRes.json();

        if (Array.isArray(guestsData.guests)) {
          setGuests(guestsData.guests);
        }

        const inv = invitationData?.invitation;
        if (inv?.rsvpRound1SentAt) {
          setRound1SentAt(new Date(inv.rsvpRound1SentAt));
        }
        if (inv?.rsvpRound2SentAt) {
          setRound2SentAt(new Date(inv.rsvpRound2SentAt));
        }
      } catch (err) {
        console.error("❌ Failed to load RSVP data", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [invitationId]);

  /* ================= DERIVED ================= */

  const guestsToSend = useMemo(() => {
    if (round === 1) return guests;
    return guests.filter((g) => g.rsvp === "pending");
  }, [guests, round]);

  const totalCount = guests.length;
  const pendingCount = guests.filter((g) => g.rsvp === "pending").length;

  const noAudience = guestsToSend.length === 0;
  const missingHeaderImage = !headerImageUrl;

  const blocked =
    loading ||
    noAudience ||
    missingHeaderImage ||
    (round === 1 && !!round1SentAt) ||
    (round === 2 && !!round2SentAt);

  const previewText = useMemo(
    () => getRsvpPreviewText({ eventTitle, eventDate, eventLocation }),
    [eventTitle, eventDate, eventLocation]
  );

  /* ================= MANUAL SEND ================= */

  const sendManualWhatsapp = () => {
    if (!manualMessage || guestsToSend.length === 0) return;

    guestsToSend.forEach((guest) => {
      const phone = guest.phone.replace(/\D/g, "");
      const text = manualMessage.replace(/{{name}}/g, guest.name || "");
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank");
    });
  };

  if (loading) return <p>טוען אורחים...</p>;

  /* ================= UI ================= */

  return (
    <div className="space-y-6 p-6">

      {/* ===== ROUNDS ===== */}
      <div className="flex gap-2">
        <button
          className={`flex-1 py-2 rounded-xl font-medium border ${
            round === 1 ? "bg-blue-600 text-white" : "border-gray-300"
          }`}
          onClick={() => setRound(1)}
        >
          סבב 1 – לכולם {round1SentAt ? "(נשלח)" : ""}
        </button>

        <button
          className={`flex-1 py-2 rounded-xl font-medium border ${
            round === 2 ? "bg-blue-600 text-white" : "border-gray-300"
          }`}
          onClick={() => setRound(2)}
        >
          סבב 2 – למי שטרם ענה {round2SentAt ? "(נשלח)" : ""}
        </button>
      </div>

      {/* ===== AUDIENCE ===== */}
      <AudienceFilterSelector
        value={round === 1 ? "all" : "pending"}
        onChange={() => {}}
        totalCount={totalCount}
        pendingCount={pendingCount}
        readOnly
      />

      {/* ===== PREVIEW ===== */}
      <WhatsappTemplatePreview
        templateKey="rsvp"
        previewText={previewText}
        headerImageUrl={headerImageUrl}
      />

      {/* ================= MANUAL WHATSAPP ================= */}
      <div className="border rounded-2xl p-5 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">
            ✍️ שליחה ידנית ב-WhatsApp
          </div>
          <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
            ללא חיוב
          </span>
        </div>

        <p className="text-sm text-gray-500">
          ההודעה תיפתח ב-WhatsApp Web ותישלח כהודעה רגילה
        </p>

        <textarea
          value={manualMessage}
          onChange={(e) => setManualMessage(e.target.value)}
          rows={4}
          className="w-full border rounded-xl p-3 text-sm"
          placeholder="הקלד/י הודעה ידנית... ניתן להשתמש ב- {{name}}"
        />

        <button
          onClick={sendManualWhatsapp}
          disabled={!manualMessage || guestsToSend.length === 0}
          className="w-full py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
        >
          📲 פתח ב-WhatsApp ({guestsToSend.length})
        </button>
      </div>

      {/* ===== SEND TEMPLATE ===== */}
      <SendButton
        channel="whatsapp"
        type="rsvp"
        invitationId={invitationId}
        templateName={RSVP_TEMPLATE_NAME}
        audience={guestsToSend.map((g) => g._id)}
        scheduledAt={scheduledAt}
        disabled={blocked}
      >
        {(round === 1 && round1SentAt) || (round === 2 && round2SentAt)
          ? "✅ נשלח"
          : scheduledAt
          ? `⏱️ תזמן אישור הגעה – סבב ${round}`
          : `📲 שלח אישור הגעה – סבב ${round}`}
      </SendButton>

      {noAudience && (
        <p className="text-sm text-red-500">
          אין נמענים לשליחה בסבב זה
        </p>
      )}
    </div>
  );
}
