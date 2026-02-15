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

  const [preview, setPreview] = useState<{
    text: string;
    totalChars: number;
    blocked: boolean;
  } | null>(null);

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
        setGuests(Array.isArray(data.guests) ? data.guests : []);
      } catch {
        setGuests([]);
      } finally {
        setLoading(false);
      }
    }

    loadGuests();
  }, [invitationId]);

  const guestsToSend = useMemo(() => guests, [guests]);

  /* ================= PREVIEW (LOCAL + SERVER VALIDATION) ================= */

  useEffect(() => {
    if (!guestsToSend[0]) {
      setPreview(null);
      return;
    }

    // ✅ בנייה לוקאלית מיידית
    const localText = message
      .replace(/{{name}}/g, guestsToSend[0].name || "")
      .replace(/{{eventTitle}}/g, eventTitle)
      .replace(/{{eventDate}}/g, eventDate)
      .replace(/{{eventLocation}}/g, eventLocation);

    setPreview({
      text: localText,
      totalChars: localText.length,
      blocked: false,
    });

    // ✅ בדיקה ברקע מול השרת (לא חוסם רינדור)
    fetch("/api/sms/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        invitationId,
        guestId: guestsToSend[0]._id,
        messageOverride: localText,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.text) return;

        setPreview({
          text: data.text,
          totalChars: data.totalChars,
          blocked: !data.allowed,
        });
      })
      .catch(() => {});
  }, [message, guestsToSend, eventTitle, eventDate, eventLocation]);

  /* ================= SCHEDULE ================= */

  const scheduledAt = useMemo(() => {
    if (sendTiming !== "scheduled" || !scheduledDate || !scheduledTime) {
      return null;
    }
    const [y, m, d] = scheduledDate.split("-").map(Number);
    const [hh, mm] = scheduledTime.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  }, [sendTiming, scheduledDate, scheduledTime]);

  const isBlocked =
    loading ||
    guestsToSend.length === 0 ||
    preview?.blocked === true;

  if (loading) {
    return <p className="text-sm text-gray-500">טוען אורחים…</p>;
  }

  return (
    <div className="space-y-8">

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

        {preview && (
          <p
            className={`text-xs mt-1 ${
              preview.blocked ? "text-red-600" : "text-gray-500"
            }`}
          >
            {preview.totalChars} תווים
          </p>
        )}

        <p className="text-xs text-gray-400 mt-1">
          משתנה: <span className="font-mono">{`{{name}}`}</span>
        </p>
      </section>

      {/* תצוגה מקדימה */}
      {preview && (
        <section>
          <h3 className="font-semibold mb-3 text-center">📱 תצוגה מקדימה</h3>

          <div className="w-full flex justify-center">
            <div className="relative w-[260px] h-[520px] bg-black rounded-[48px] p-3 shadow-2xl">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[120px] h-[22px] bg-black rounded-b-2xl" />

              <div className="relative w-full h-full bg-transparent rounded-[38px] overflow-hidden">
                <div className="bg-gray-100 text-center py-2 text-xs font-semibold border-b">
                  INVISTIMO · SMS
                </div>

                <div className="flex justify-center items-center h-full p-4">
                  <div className="bg-gray-200 rounded-2xl p-3 text-sm whitespace-pre-wrap max-w-[90%] text-right">
                    {preview.text}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* תזמון */}
      <section className="border rounded-2xl p-6 bg-transparent shadow-none space-y-4" dir="rtl">
        <h3 className="font-semibold">⏱️ מועד שליחה</h3>

        <label className="flex items-center gap-2">
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
          <div className="flex gap-3 mt-2">
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

      {/* שליחה */}
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
        <p className="text-sm text-red-500 text-center">
          אין נמענים או שההודעה חסומה
        </p>
      )}
    </div>
  );
}
