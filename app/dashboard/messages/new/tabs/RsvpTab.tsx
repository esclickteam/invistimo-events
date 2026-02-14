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

/* ================= CONSTANTS ================= */

// שם התבנית המאושרת במטה
const RSVP_TEMPLATE_NAME = "rsvp_invitation_media";

// ⚠️ טקסט תצוגה בלבד – 1:1 כמו התבנית (בלי לינק, בלי עריכה)
const RSVP_PREVIEW_TEXT = `משפחה וחברים יקרים,
נשמח לדעת אם תגיעו לחגוג איתנו 🎉

לאישור הגעה לחצו על הכפתור למטה 👇

מחכים לשמוח איתכם 💖`;

/* ================= COMPONENT ================= */

export default function RsvpTab({ guests }: { guests: Guest[] }) {
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  /* ================= AUDIENCE ================= */

  const guestsToSend = useMemo(() => {
    if (filter === "pending") {
      return guests.filter((g) => g.rsvp !== "yes");
    }
    return guests;
  }, [guests, filter]);

  const blocked = guestsToSend.length === 0;

  /* ================= RENDER ================= */

  return (
    <div className="space-y-6">
      {/* ================= קהל יעד ================= */}
      <AudienceFilterSelector
        value={filter}
        onChange={setFilter}
        totalCount={guests.length}
        pendingCount={guests.filter((g) => g.rsvp !== "yes").length}
      />

      {/* ================= הסבר ================= */}
      <section className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        📌 הודעת אישור הגעה נשלחת ב־WhatsApp בלבד  
        <br />
        ✏️ תוכן ההודעה קבוע לפי תבנית מאושרת  
        <br />
        ⏱️ ניתן לבחור שליחה מיידית או מתוזמנת
      </section>

      {/* ================= תזמון ================= */}
      <SendTiming
        scheduledAt={scheduledAt}
        onChange={setScheduledAt}
      />

      {/* ================= תצוגה מקדימה – זהה לתבנית ================= */}
      <WhatsappTemplatePreview
        templateKey="rsvp"
        previewText={RSVP_PREVIEW_TEXT}
        headerImageUrl="/whatsapp-invite-header.png"
      />

      {/* ================= שליחה ================= */}
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

      {blocked && (
        <p className="text-sm text-red-500">
          יש לבחור לפחות נמען אחד
        </p>
      )}
    </div>
  );
}
