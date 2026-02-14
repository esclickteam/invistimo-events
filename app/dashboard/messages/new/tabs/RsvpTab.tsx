"use client";

import { useMemo, useState } from "react";
import AudienceFilterSelector, {
  FilterType,
} from "../shared/AudienceFilterSelector";
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

  // מגיעים מה־Event + Invitation
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  headerImageUrl?: string;
};

/* ================= CONSTANTS ================= */

// שם התבנית המאושרת במטה
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
  const [filter, setFilter] = useState<FilterType>("all");

  /* ================= AUDIENCE ================= */

  const guestsToSend = useMemo(() => {
    if (filter === "pending") {
      return guests.filter((g) => g.rsvp !== "yes");
    }
    return guests;
  }, [guests, filter]);

  /* ================= BLOCKING RULES ================= */

  const noAudience = guestsToSend.length === 0;
  const missingHeaderImage = !headerImageUrl;

  // WhatsApp לא מאפשר Template בלי Header Media
  const blocked = noAudience || missingHeaderImage;

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

  /* ================= RENDER ================= */

  return (
    <div className="space-y-6">
      {/* קהל יעד */}
      <AudienceFilterSelector
        value={filter}
        onChange={setFilter}
        totalCount={guests.length}
        pendingCount={guests.filter((g) => g.rsvp !== "yes").length}
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
      <SendTiming
        scheduledAt={scheduledAt}
        onChange={setScheduledAt}
      />

      {/* תצוגה מקדימה – 1:1 לתבנית */}
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
        {scheduledAt
          ? "⏱️ תזמן אישור הגעה ב־WhatsApp"
          : "📲 שלח אישור הגעה ב־WhatsApp"}
      </SendButton>

      {/* הודעות חסימה */}
      {noAudience && (
        <p className="text-sm text-red-500">
          יש לבחור לפחות נמען אחד
        </p>
      )}
    </div>
  );
}
