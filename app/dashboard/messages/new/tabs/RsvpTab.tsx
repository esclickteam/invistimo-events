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
  tableName?: string;
  tableNumber?: number;
};

/* ================= CONSTANTS ================= */

const MAX_CHARS = 130;

const DEFAULT_MESSAGE =
  "היי {{name}},\nנזכיר שהאירוע שלנו מתקרב 💛\nמספר השולחן שלך: {{tableName}}\nמחכים לראותך!";

/* ================= COMPONENT ================= */

export default function ReminderTab({
  guests,
}: {
  guests: Guest[];
}) {
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

  // 🔑 זה הפילטר
  const [filter, setFilter] = useState<FilterType>("all");

  /* ================= FILTER LOGIC ================= */

  const guestsToSend = useMemo(() => {
    switch (filter) {
      case "pending":
        return guests.filter((g) => g.rsvp === "pending");

      case "withTable":
        return guests.filter(
          (g) =>
            g.tableName ||
            typeof g.tableNumber === "number"
        );

      case "all":
      default:
        return guests;
    }
  }, [guests, filter]);

  /* ================= PREVIEW ================= */

  const previewText = useMemo(() => {
    const g = guestsToSend[0];
    if (!g) return "";

    const table =
      g.tableName ??
      (typeof g.tableNumber === "number"
        ? `שולחן ${g.tableNumber}`
        : "");

    return message
      .replace(/{{name}}/g, g.name)
      .replace(/{{tableName}}/g, table);
  }, [message, guestsToSend]);

  const blocked =
    guestsToSend.length === 0 ||
    previewText.length > MAX_CHARS;

  /* ================= RENDER ================= */

  return (
    <div className="space-y-6">
      <AudienceFilterSelector
        value={filter}
        onChange={setFilter}
        totalCount={guests.length}
        pendingCount={
          guests.filter((g) => g.rsvp === "pending").length
        }
        withTableCount={
          guests.filter(
            (g) =>
              g.tableName ||
              typeof g.tableNumber === "number"
          ).length
        }
      />

      <section>
        <label className="font-semibold block mb-1">
          ✍️ תוכן התזכורת
        </label>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="w-full border rounded-xl p-3"
        />
      </section>

      <SendTiming
        scheduledAt={scheduledAt}
        onChange={setScheduledAt}
      />

      <PhonePreview channel="sms" text={previewText} />

      <SendButton
        channel="sms"
        type="reminder"
        audience={guestsToSend.map((g) => g._id)}
        scheduledAt={scheduledAt}
        disabled={blocked}
      >
        {scheduledAt ? "⏱️ תזמן תזכורת" : "📩 שלח תזכורת"}
      </SendButton>
    </div>
  );
}
