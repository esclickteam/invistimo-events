"use client";

import { useMemo, useState } from "react";
import AudienceFilterSelector, {
  FilterType,
} from "../shared/AudienceFilterSelector";
import SendTiming from "../shared/SendTiming";
import SendButton from "../shared/SendButton";

/* ================= TYPES ================= */

type Guest = {
  _id: string;
  name: string;
  phone: string;
  rsvp?: "yes" | "no" | "pending";
  tableName?: string;
  tableNumber?: number;
};

type Props = {
  guests: Guest[];

  // 🟢 מיושרים ל־page.tsx (גם אם לא בשימוש כרגע)
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
};

/* ================= CONSTANTS ================= */

const MAX_CHARS = 130;

const MESSAGE_WITH_TABLE =
  "היי {{name}},\nנזכיר שהאירוע שלנו מתקרב 💛\nמספר השולחן שלך: {{tableName}}\nמחכים לראותך!";

const MESSAGE_NO_TABLE =
  "היי {{name}},\nנזכיר שהאירוע שלנו מתקרב 💛\nמחכים לראותך!";

/* ================= COMPONENT ================= */

export default function ReminderTab({
  guests,
  eventTitle,     // ⬅️ מתקבל (לא חובה להשתמש כרגע)
  eventDate,      // ⬅️
  eventLocation,  // ⬅️
}: Props) {
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  /* ================= HELPERS ================= */

  const hasTable = (g: Guest) =>
    !!g.tableName || typeof g.tableNumber === "number";

  /* ================= GROUPS ================= */

  const confirmedGuests = useMemo(
    () => guests.filter((g) => g.rsvp === "yes"),
    [guests]
  );

  const guestsWithTable = useMemo(
    () => confirmedGuests.filter(hasTable),
    [confirmedGuests]
  );

  /* ================= AUDIENCE ================= */

  const guestsToSend = useMemo(() => {
    if (guestsWithTable.length > 0) {
      return guestsWithTable;
    }
    return confirmedGuests;
  }, [guestsWithTable, confirmedGuests]);

  /* ================= MESSAGE ================= */

  const baseMessage =
    guestsWithTable.length > 0
      ? MESSAGE_WITH_TABLE
      : MESSAGE_NO_TABLE;

  const previewText = useMemo(() => {
    const g = guestsToSend[0];
    if (!g) return "";

    const table =
      g.tableName ??
      (typeof g.tableNumber === "number"
        ? `שולחן ${g.tableNumber}`
        : "");

    return baseMessage
      .replace(/{{name}}/g, g.name || "")
      .replace(/{{tableName}}/g, table);
  }, [guestsToSend, baseMessage]);

  const blocked =
    guestsToSend.length === 0 ||
    previewText.length > MAX_CHARS;

  /* ================= RENDER ================= */

  return (
    <div className="space-y-6">
      <AudienceFilterSelector
        value={filter}
        onChange={setFilter}
        totalCount={confirmedGuests.length}
        withTableCount={guestsWithTable.length}
      />

      <section className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        📌 תזכורת נשלחת ב־SMS בלבד
        <br />
        ⏱️ ניתן לשלוח מיידית או לתזמן
        <br />
        🪑 מספר שולחן מצורף רק למי שיש בפועל
      </section>

      <SendTiming
        scheduledAt={scheduledAt}
        onChange={setScheduledAt}
      />

      <SendButton
        channel="sms"
        type="reminder"
        audience={guestsToSend.map((g) => g._id)}
        scheduledAt={scheduledAt}
        disabled={blocked}
      >
        {scheduledAt
          ? "⏱️ תזמן תזכורת"
          : "📩 שלח תזכורת"}
      </SendButton>

      {blocked && (
        <p className="text-sm text-red-500">
          אין נמענים או שההודעה ארוכה מדי
        </p>
      )}
    </div>
  );
}
