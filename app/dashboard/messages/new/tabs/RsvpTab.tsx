"use client";

import { useMemo, useState, useEffect } from "react";
import AudienceFilterSelector, { FilterType } from "../shared/AudienceFilterSelector";
import SendTiming from "../shared/SendTiming";
import SendButton from "../shared/SendButton";
import WhatsappTemplatePreview from "../shared/WhatsappTemplatePreview";

type Guest = {
  _id: string;
  name: string;
  phone: string;
  rsvp?: "yes" | "no" | "pending";
};

type Props = {
  invitationId: string;        // מזהה ההזמנה
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  headerImageUrl?: string;
};

const RSVP_TEMPLATE_NAME = "rsvp_invitation_media";

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
  const [roundSent, setRoundSent] = useState<{ [key in 1 | 2]: boolean }>({ 1: false, 2: false });
  const [loadingGuests, setLoadingGuests] = useState(true);

  // ================= FETCH GUESTS FROM API =================
  useEffect(() => {
    async function loadGuests() {
      try {
        setLoadingGuests(true);
        const res = await fetch(`/api/guests?invitation=${invitationId}`);
        const data = await res.json();
        if (Array.isArray(data.guests)) {
          setGuests(data.guests);
        }
      } catch (err) {
        console.error("❌ Failed to fetch guests", err);
      } finally {
        setLoadingGuests(false);
      }
    }

    loadGuests();
  }, [invitationId]);

  const guestsToSend = useMemo(() => {
    if (round === 1) return guests;
    return guests.filter((g) => g.rsvp === "pending");
  }, [guests, round]);

  const totalCount = guests.length;
  const pendingCount = guests.filter((g) => g.rsvp === "pending").length;

  const noAudience = guestsToSend.length === 0;
  const missingHeaderImage = !headerImageUrl;
  const blocked = noAudience || missingHeaderImage || roundSent[round] || loadingGuests;

  const previewText = useMemo(
    () => getRsvpPreviewText({ eventTitle, eventDate, eventLocation }),
    [eventTitle, eventDate, eventLocation]
  );

  const handleAfterSend = () => {
    setRoundSent((prev) => ({ ...prev, [round]: true }));
  };

  if (loadingGuests) return <p>טוען אורחים...</p>;

  return (
    <div className="space-y-6 bg-white p-6 rounded-xl shadow-md">
      <div className="flex gap-2 mb-4">
        <button
          className={`flex-1 py-2 rounded-xl font-medium border ${
            round === 1 ? "bg-blue-600 text-white" : "border-gray-300"
          }`}
          onClick={() => setRound(1)}
          disabled={roundSent[1]}
        >
          סבב 1 – לכולם {roundSent[1] ? "(נשלח)" : ""}
        </button>
        <button
          className={`flex-1 py-2 rounded-xl font-medium border ${
            round === 2 ? "bg-blue-600 text-white" : "border-gray-300"
          }`}
          onClick={() => setRound(2)}
          disabled={roundSent[2]}
        >
          סבב 2 – למי שטרם ענה {roundSent[2] ? "(נשלח)" : ""}
        </button>
      </div>

      <AudienceFilterSelector
        value={round === 1 ? "all" : "pending"}
        onChange={() => {}}
        totalCount={totalCount}
        pendingCount={pendingCount}
        readOnly={true}
      />

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

      <SendTiming scheduledAt={scheduledAt} onChange={setScheduledAt} />

      <WhatsappTemplatePreview
        templateKey="rsvp"
        previewText={previewText}
        headerImageUrl={headerImageUrl}
      />

      <SendButton
        channel="whatsapp"
        type="rsvp"
        templateName={RSVP_TEMPLATE_NAME}
        audience={guestsToSend.map((g) => g._id)}
        scheduledAt={scheduledAt}
        disabled={blocked}
      >
        {roundSent[round]
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
