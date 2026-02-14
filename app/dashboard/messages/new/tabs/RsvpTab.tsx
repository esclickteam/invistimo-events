"use client";

import { useMemo, useState } from "react";
import AudienceFilterSelector, {
  FilterType,
} from "../shared/AudienceFilterSelector";
import PhonePreview from "../shared/PhonePreview";
import SendTiming from "../shared/SendTiming";
import SendButton from "../shared/SendButton";

/* ================= TYPES ================= */

type Guest = {
  _id: string;
  name: string;
  phone: string;
  rsvp?: "yes" | "no" | "pending";
};

/* ================= CONSTANTS ================= */

// שם התבנית המאושרת ב־360dialog
const RSVP_TEMPLATE_NAME = "rsvp_invitation_media";

// טקסט תצוגה מקדימה בלבד (לא נשלח בפועל)
const RSVP_PREVIEW_TEXT = `היי {{name}} 👋

נשמח לדעת אם תגיעו לחגוג איתנו 🎉

לאישור הגעה לחצו כאן`;

/* ================= COMPONENT ================= */

export default function RsvpTab({
  guests,
}: {
  guests: Guest[];
}) {
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

  // סבב שליחה
  const [filter, setFilter] = useState<FilterType>("all");

  /* ================= AUDIENCE ================= */

  const guestsToSend = useMemo(() => {
    switch (filter) {
      case "pending":
        return guests.filter((g) => g.rsvp !== "yes");
      case "all":
      default:
        return guests;
    }
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
        pendingCount={
          guests.filter((g) => g.rsvp !== "yes").length
        }
      />

      {/* ================= הסבר ================= */}
      <section className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        📌 הודעת אישור הגעה נשלחת ב־WhatsApp באמצעות תבנית מאושרת.
        <br />
        ✏️ לא ניתן לערוך את תוכן ההודעה.
        <br />
        ⏱️ ניתן לבחור מועד שליחה אוטומטי.
      </section>

      {/* ================= תזמון ================= */}
      <SendTiming
        scheduledAt={scheduledAt}
        onChange={setScheduledAt}
      />

      {/* ================= תצוגה מקדימה ================= */}
      <PhonePreview
        channel="whatsapp"
        text={RSVP_PREVIEW_TEXT}
        headerImageUrl="/whatsapp-invite-header.png"
        showRsvpButton
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
