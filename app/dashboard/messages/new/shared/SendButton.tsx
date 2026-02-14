"use client";

import { useMemo, useState } from "react";
import AudienceFilterSelector from "../shared/AudienceFilterSelector";
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
  guests: Guest[];
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  headerImageUrl?: string;
};

const RSVP_TEMPLATE_NAME = "rsvp_invitation_media";

export default function RsvpTab({
  guests,
  eventTitle,
  eventDate,
  eventLocation,
  headerImageUrl,
}: Props) {
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [round, setRound] = useState<1 | 2>(1); // סבב 1 או סבב 2

  /* ================= AUDIENCE ================= */
  const guestsToSend = useMemo(() => {
    if (round === 1) {
      // סבב ראשון – לכולם
      return guests;
    } else {
      // סבב שני – רק למי שטרם ענה
      return guests.filter((g) => g.rsvp === "pending");
    }
  }, [guests, round]);

  /* ================= BLOCKING RULES ================= */
  const noAudience = guestsToSend.length === 0;
  const missingHeaderImage = !headerImageUrl;
  const blocked = noAudience || missingHeaderImage;

  /* ================= PREVIEW TEXT ================= */
  const previewText = useMemo(() => {
    return `משפחה וחברים יקרים,
הנכם מוזמנים ל- ${eventTitle} 🤍

📅 תאריך: ${eventDate}
📍 מיקום: ${eventLocation}

לאישור הגעה לחצו על הכפתור למטה 👇

מחכים לשמוח איתכם 💖`;
  }, [eventTitle, eventDate, eventLocation]);

  /* ================= RENDER ================= */
  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4">
      {/* סבב */}
      <div className="flex gap-4">
        <button
          onClick={() => setRound(1)}
          className={`flex-1 py-2 rounded-xl font-semibold ${
            round === 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          סבב 1 – לכולם
        </button>
        <button
          onClick={() => setRound(2)}
          className={`flex-1 py-2 rounded-xl font-semibold ${
            round === 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          סבב 2 – למי שטרם ענה
        </button>
      </div>

      {/* קהל יעד */}
      <AudienceFilterSelector
        value={round === 1 ? "all" : "pending"}
        onChange={() => {}}
        totalCount={guests.length}
        pendingCount={guests.filter((g) => g.rsvp === "pending").length}
        readOnly={true} // לא מאפשר שינוי ידני, אוטומטי לפי סבב
      />

      {/* הסבר */}
      <section className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        📌 הודעת אישור הגעה נשלחת ב־WhatsApp בלבד
        <br />
        ✏️ תוכן ההודעה קבוע לפי תבנית מאושרת
        <br />
        ⏱️ ניתן לבחור שליחה מיידית או מתוזמנת
      </section>

      {/* אזהרה */}
      {missingHeaderImage && (
        <section className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          ❌ חסרה תמונת הזמנה – WhatsApp דורש Header לצורך שליחת תבנית RSVP
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

      {/* כפתור שליחה */}
      <SendButton
        channel="whatsapp"
        type="rsvp"
        templateName={RSVP_TEMPLATE_NAME}
        audience={guestsToSend.map((g) => g._id)}
        scheduledAt={scheduledAt}
        disabled={blocked}
      >
        {scheduledAt
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
