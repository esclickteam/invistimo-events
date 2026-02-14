"use client";

import { useMemo, useState } from "react";

/* ================= TYPES ================= */

type Guest = {
  _id: string;
  name: string;
  phone: string;
};

type FilterType = "all" | "attended";
type SendTiming = "now" | "scheduled";

type Props = {
  guests: Guest[];

  // 🟢 מיושרים ל־page.tsx (גם אם לא בשימוש כרגע)
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
};

/* ================= CONSTANTS ================= */

const CHAR_LIMIT = 130;

const DEFAULT_MESSAGE =
  "היי {{name}} 🌸\nשמחנו לראותכם באירוע.\nתודה שהשתתפתם בשמחתנו 💖";

/* ================= COMPONENT ================= */

export default function ThankYouTab({
  guests,
  eventTitle,     // ⬅️ מתקבל (לא חובה להשתמש כרגע)
  eventDate,      // ⬅️
  eventLocation,  // ⬅️
}: Props) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  const [sendTiming, setSendTiming] = useState<SendTiming>("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  /* ================= AUDIENCE ================= */

  const guestsToSend = useMemo(() => {
    if (filter === "attended") {
      // בעתיד: arrived === true
      return guests;
    }
    return guests;
  }, [guests, filter]);

  /* ================= MESSAGE ================= */

  const previewText = useMemo(() => {
    if (!guestsToSend[0]) return message;
    return message.replace(/{{name}}/g, guestsToSend[0].name);
  }, [message, guestsToSend]);

  const totalChars = previewText.length;
  const isBlocked = totalChars > CHAR_LIMIT;

  /* ================= SCHEDULE ================= */

  const scheduledAt = useMemo(() => {
    if (
      sendTiming !== "scheduled" ||
      !scheduledDate ||
      !scheduledTime
    ) {
      return null;
    }

    const [y, m, d] = scheduledDate.split("-").map(Number);
    const [hh, mm] = scheduledTime.split(":").map(Number);

    return new Date(y, m - 1, d, hh, mm, 0, 0);
  }, [sendTiming, scheduledDate, scheduledTime]);

  /* ================= SEND ================= */

  const sendMessages = async () => {
    if (isBlocked) {
      alert("❌ ההודעה חורגת מ־130 תווים");
      return;
    }

    if (sendTiming === "scheduled" && !scheduledAt) {
      alert("נא לבחור תאריך ושעה לשליחה");
      return;
    }

    const res = await fetch("/api/sms/send", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "thankyou",
        guestIds: guestsToSend.map((g) => g._id),
        message,
        scheduledAt,
      }),
    });

    if (!res.ok) {
      alert("❌ שליחת ההודעות נכשלה");
      return;
    }

    alert(
      sendTiming === "scheduled"
        ? "⏱️ הודעת תודה תוזמנה בהצלחה"
        : `✅ נשלחו ${guestsToSend.length} הודעות`
    );
  };

  /* ================= RENDER ================= */

  return (
    <div className="w-full max-w-[600px] space-y-8">
      {/* AUDIENCE */}
      <section>
        <h3 className="font-semibold mb-2">👥 קהל יעד</h3>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterType)}
          className="w-full border rounded-xl p-3"
        >
          <option value="all">
            לכל המוזמנים ({guests.length})
          </option>
          <option value="attended">
            למי שהגיע לאירוע
          </option>
        </select>

        <p className="text-sm text-gray-500 mt-1">
          יישלח ל־<strong>{guestsToSend.length}</strong> אורחים
        </p>
      </section>

      {/* MESSAGE */}
      <section>
        <h3 className="font-semibold mb-2">✍️ תוכן ההודעה</h3>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="w-full border rounded-xl p-4"
        />

        <p
          className={`text-xs mt-1 ${
            isBlocked ? "text-red-600" : "text-gray-500"
          }`}
        >
          {totalChars}/{CHAR_LIMIT} תווים
        </p>

        <p className="text-xs text-gray-400 mt-1">
          משתנה:
          <span className="font-mono ml-1">{`{{name}}`}</span>
        </p>
      </section>

      {/* PREVIEW */}
      <section>
        <h3 className="font-semibold mb-2 text-center">
          📱 תצוגה מקדימה
        </h3>

        <div className="mx-auto w-[320px] bg-black rounded-[32px] p-3 shadow-xl">
          <div className="bg-white rounded-[24px] overflow-hidden">
            <div className="bg-gray-100 text-center py-2 text-xs font-semibold">
              INVISTIMO · SMS
            </div>

            <div className="p-4 flex justify-center">
              <div className="bg-gray-200 rounded-2xl p-3 text-sm whitespace-pre-wrap max-w-[90%]">
                {previewText}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TIMING */}
      <section>
        <h3 className="font-semibold mb-3">⏱️ מועד שליחה</h3>

        <label className="flex items-center gap-2 mb-2">
          <input
            type="radio"
            checked={sendTiming === "now"}
            onChange={() => setSendTiming("now")}
          />
          שליחה מיידית
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={sendTiming === "scheduled"}
            onChange={() => setSendTiming("scheduled")}
          />
          שליחה מתוזמנת
        </label>

        {sendTiming === "scheduled" && (
          <div className="flex gap-3 mt-3">
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="flex-1 border rounded-xl p-3"
            />
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="flex-1 border rounded-xl p-3"
            />
          </div>
        )}
      </section>

      {/* SEND */}
      <button
        onClick={sendMessages}
        disabled={isBlocked || guestsToSend.length === 0}
        className="
          w-full bg-green-600 text-white py-4 rounded-xl
          font-semibold text-lg
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        📩 שליחת הודעת תודה
      </button>
    </div>
  );
}
