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
  invitationId,
}: {
  guests: Guest[];
  invitationId: string;
}) {
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

  // ✅ פילטר קהל
  const [filter, setFilter] = useState<FilterType>("all");

  // ⛔️ בעתיד יבוא מה־user
  const hasSeatingPackage = false;

  /* ================= COUNTS ================= */

  const confirmedGuests = useMemo(
    () => guests.filter((g) => g.rsvp === "yes"),
    [guests]
  );

  const withTableGuests = useMemo(
    () =>
      confirmedGuests.filter(
        (g) =>
          g.tableName || typeof g.tableNumber === "number"
      ),
    [confirmedGuests]
  );

  /* ================= FILTER ================= */

  const guestsToSend = useMemo(() => {
    switch (filter) {
      case "pending":
        return guests.filter((g) => g.rsvp === "pending");

      case "withTable":
        return hasSeatingPackage
          ? withTableGuests
          : confirmedGuests;

      case "all":
      default:
        return confirmedGuests;
    }
  }, [
    filter,
    guests,
    confirmedGuests,
    withTableGuests,
    hasSeatingPackage,
  ]);

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
      .replace(/{{name}}/g, g.name || "")
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
        totalCount={confirmedGuests.length}
        pendingCount={
          guests.filter((g) => g.rsvp === "pending").length
        }
        withTableCount={withTableGuests.length}
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

        <p className="text-xs text-gray-500 mt-1">
          {previewText.length}/{MAX_CHARS} תווים
        </p>

        <p className="text-xs text-gray-400 mt-1">
          המשתנים{" "}
          <span className="font-mono">{`{{name}}`}</span>,{" "}
          <span className="font-mono">{`{{tableName}}`}</span>{" "}
          מתעדכנים אוטומטית
        </p>
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
