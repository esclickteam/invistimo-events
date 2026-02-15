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

  // 🔒 מצב סבבים מהשרת
  const [round1SentAt, setRound1SentAt] = useState<Date | null>(null);
  const [round2SentAt, setRound2SentAt] = useState<Date | null>(null);

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

  // ⛔ חסימה רק של שליחה – לא של ניווט
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

  if (loading) return <p>טוען אורחים...</p>;

  /* ================= UI ================= */

  return (
    <div className="space-y-6 p-6">

      {/* ===== ROUNDS (תמיד לחיצים) ===== */}
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


      {/* ===== SEND ===== */}
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
        <p className="text-sm text-red-500">אין נמענים לשליחה בסבב זה</p>
      )}
    </div>
  );
}
