"use client";

import { useEffect, useMemo, useState } from "react";
import AudienceFilterSelector from "../shared/AudienceFilterSelector";
import SendButton from "../shared/SendButton";

/* ================= TYPES ================= */

type Guest = {
  _id: string;
  name: string;
  phone: string;
};

type SendTiming = "now" | "scheduled";

type Props = {
  invitationId: string;

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
  invitationId,
  eventTitle,
  eventDate,
  eventLocation,
}: Props) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [sendTiming, setSendTiming] = useState<SendTiming>("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  /* ================= LOAD GUESTS ================= */

  useEffect(() => {
    if (!invitationId) return;

    async function loadGuests() {
      try {
        setLoading(true);
        const res = await fetch(`/api/guests?invitation=${invitationId}`);
        const data = await res.json();

        if (Array.isArray(data.guests)) {
          setGuests(data.guests);
        } else {
          setGuests([]);
        }
      } catch (err) {
        console.error("❌ Failed to load thank-you guests", err);
        setGuests([]);
      } finally {
        setLoading(false);
      }
    }

    loadGuests();
  }, [invitationId]);

  /* ================= AUDIENCE ================= */

  const guestsToSend = useMemo(() => guests, [guests]);

  /* ================= MESSAGE PREVIEW ================= */

  const previewText = useMemo(() => {
    if (!guestsToSend[0]) return message;

    return message
      .replace(/{{name}}/g, guestsToSend[0].name || "")
      .replace(/{{eventTitle}}/g, eventTitle)
      .replace(/{{eventDate}}/g, eventDate)
      .replace(/{{eventLocation}}/g, eventLocation);
  }, [message, guestsToSend, eventTitle, eventDate, eventLocation]);

  const totalChars = previewText.length;
  const isBlocked =
    loading || guestsToSend.length === 0 || totalChars > CHAR_LIMIT;

  /* ================= SCHEDULE ================= */

  const scheduledAt = useMemo(() => {
    if (sendTiming !== "scheduled" || !scheduledDate || !scheduledTime) {
      return null;
    }
    const [y, m, d] = scheduledDate.split("-").map(Number);
    const [hh, mm] = scheduledTime.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  }, [sendTiming, scheduledDate, scheduledTime]);

  /* ================= RENDER ================= */

  if (loading) {
    return <p className="text-sm text-gray-500">טוען אורחים…</p>;
  }

  return (
    <div className="w-full max-w-[600px] space-y-8">
      {/* קהל יעד */}
      <AudienceFilterSelector
        value="all"
        onChange={() => {}}
        totalCount={guests.length}
        readOnly
      />

      {/* תוכן ההודעה */}
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
          משתנה: <span className="font-mono ml-1">{`{{name}}`}</span>
        </p>
      </section>

      {/* תצוגה מקדימה */}
      <section>
        <h3 className="font-semibold mb-2 text-center">📱 תצוגה מקדימה</h3>
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

      {/* תזמון */}
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

      {/* כפתור שליחה */}
      <SendButton
        channel="sms"
        type="thankyou"
        invitationId={invitationId}
        audience={guestsToSend.map((g) => g._id)}
        scheduledAt={scheduledAt}
        disabled={isBlocked}
      >
        📩 שליחת הודעת תודה
      </SendButton>

      {isBlocked && (
        <p className="text-sm text-red-500">
          אין נמענים או שההודעה ארוכה מדי
        </p>
      )}
    </div>
  );
}
