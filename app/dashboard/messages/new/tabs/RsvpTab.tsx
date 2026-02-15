"use client";

import { useMemo, useState, useEffect } from "react";
import AudienceFilterSelector from "../shared/AudienceFilterSelector";
import SendTiming from "../shared/SendTiming";
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

  // ⛔ חסימה אמיתית מהשרת
  const [rsvpAlreadySent, setRsvpAlreadySent] = useState(false);
  const [rsvpSentAt, setRsvpSentAt] = useState<Date | null>(null);

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

        if (invitationData?.invitation?.rsvpRoundSentAt) {
          setRsvpAlreadySent(true);
          setRsvpSentAt(new Date(invitationData.invitation.rsvpRoundSentAt));
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
    (round === 1 && rsvpAlreadySent);

  const previewText = useMemo(
    () =>
      getRsvpPreviewText({
        eventTitle,
        eventDate,
        eventLocation,
      }),
    [eventTitle, eventDate, eventLocation]
  );

  if (loading) {
    return <p>טוען אורחים...</p>;
  }

  /* ================= UI ================= */

  return (
    <div className="space-y-6 bg-white p-6 rounded-xl shadow-md">
      {/* ===== ROUNDS ===== */}
      <div className="flex gap-2">
        <button
          className={`flex-1 py-2 rounded-xl font-medium border ${
            round === 1 ? "bg-blue-600 text-white" : "border-gray-300"
          }`}
          onClick={() => setRound(1)}
          disabled={rsvpAlreadySent}
        >
          סבב 1 – לכולם {rsvpAlreadySent ? "(נשלח)" : ""}
        </button>

        <button
          className={`flex-1 py-2 rounded-xl font-medium border ${
            round === 2 ? "bg-blue-600 text-white" : "border-gray-300"
          }`}
          onClick={() => setRound(2)}
        >
          סבב 2 – למי שטרם ענה
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

      {/* ===== INFO ===== */}
      <section className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        📌 הודעת אישור הגעה נשלחת ב־WhatsApp בלבד
        <br />
        ✏️ תוכן ההודעה קבוע לפי תבנית מאושרת
        <br />
        ⏱️ ניתן לבחור שליחה מיידית או מתוזמנת
      </section>

      {missingHeaderImage && (
        <section className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          ❌ חסרה תמונת הזמנה
          <br />
          WhatsApp דורש תמונת Header לצורך שליחת תבנית RSVP
        </section>
      )}

      {rsvpAlreadySent && round === 1 && rsvpSentAt && (
        <section className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
          ✅ סבב אישור הגעה כבר נשלח
          <br />
          📅 נשלח בתאריך:{" "}
          {rsvpSentAt.toLocaleDateString("he-IL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </section>
      )}

      {/* ===== TIMING ===== */}
      <SendTiming scheduledAt={scheduledAt} onChange={setScheduledAt} />

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
        {rsvpAlreadySent && round === 1
          ? "✅ אישור הגעה נשלח"
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
