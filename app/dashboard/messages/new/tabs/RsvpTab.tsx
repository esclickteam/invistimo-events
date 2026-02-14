"use client";

import { useMemo, useState } from "react";
import AudienceFilterSelector, { FilterType } from "../shared/AudienceFilterSelector";
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
  guests: Guest[];
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  headerImageUrl?: string;
};

/* ================= CONSTANTS ================= */

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
  guests,
  eventTitle,
  eventDate,
  eventLocation,
  headerImageUrl,
}: Props) {
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [round, setRound] = useState<1 | 2>(1); // סבב ראשון או שני
  const [roundSent, setRoundSent] = useState<{ [key in 1 | 2]: boolean }>({ 1: false, 2: false });

  /* ================= AUDIENCE ================= */

  const guestsToSend = useMemo(() => {
    if (round === 1) return guests; // סבב ראשון – שולח לכולם
    return guests.filter((g) => g.rsvp === "pending"); // סבב שני – רק למי שטרם ענה
  }, [guests, round]);

  const totalCount = guests.length; // מספר כולל כל המוזמנים
  const pendingCount = guests.filter((g) => g.rsvp === "pending").length; // מספר שמצבו pending

  /* ================= BLOCKING RULES ================= */

  const noAudience = guestsToSend.length === 0;
  const missingHeaderImage = !headerImageUrl;
  const blocked = noAudience || missingHeaderImage || roundSent[round];

  /* ================= PREVIEW TEXT ================= */

  const previewText = useMemo(
    () =>
      getRsvpPreviewText({
        eventTitle,
        eventDate,
        eventLocation,
      }),
    [eventTitle, eventDate, eventLocation]
  );

  /* ================= HANDLE SEND ================= */

  const handleAfterSend = () => {
    setRoundSent((prev) => ({ ...prev, [round]: true }));
  };

  /* ================= RENDER ================= */

  return (
    <div className="space-y-6 bg-white p-6 rounded-xl shadow-md">
      {/* בחירת סבב */}
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

      {/* קהל יעד */}
      <AudienceFilterSelector
  value={round === 1 ? "all" : "pending"}       // סבב 1 = כולם, סבב 2 = טרם ענו
  onChange={() => {}}                           // TypeScript דורש פונקציה, לא יעבוד כי readOnly
  totalCount={guests.length}                    // מספר כל המוזמנים
  pendingCount={guests.filter((g) => g.rsvp === "pending").length} // מספר מי שטרם ענה
  readOnly={true}                               // הפילטר קריאה בלבד
/>

      {/* הסבר */}
      <section className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        📌 הודעת אישור הגעה נשלחת ב־WhatsApp בלבד
        <br />
        ✏️ תוכן ההודעה קבוע לפי תבנית מאושרת
        <br />
        ⏱️ ניתן לבחור שליחה מיידית או מתוזמנת
      </section>

      {/* אזהרה – אין תמונה */}
      {missingHeaderImage && (
        <section className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          ❌ חסרה תמונת הזמנה  
          <br />
          WhatsApp דורש תמונת Header לצורך שליחת תבנית RSVP
        </section>
      )}

      {/* תזמון */}
      <SendTiming scheduledAt={scheduledAt} onChange={setScheduledAt} />

      {/* תצוגה מקדימה */}
      <WhatsappTemplatePreview
        templateKey="rsvp"
        previewText={previewText}
        headerImageUrl={headerImageUrl}
      />

      {/* שליחה */}
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

      {/* הודעות חסימה */}
      {noAudience && (
        <p className="text-sm text-red-500">
          אין נמענים לשליחה בסבב זה
        </p>
      )}
    </div>
  );
}
