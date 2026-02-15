"use client";

import { useEffect, useMemo, useState } from "react";
import AudienceFilterSelector from "../shared/AudienceFilterSelector";
import SendButton from "../shared/SendButton";
import { buildMessage } from "@/lib/messages/buildMessage";

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
  invitationId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  lat?: number;
  lng?: number;
  giftCreditUrl?: string;
};

/* ================= CONSTANTS ================= */

const MESSAGE_WITH_TABLE =
  "היי {{name}} 🌸\n" +
  "שמחים לראות אותך 💛\n\n" +
  "השולחן שלך באירוע :\n" +
  "🪑 {{tableName}}\n\n" +
  "📍 ניווט:\n" +
  "{{navigationLink}}\n\n" +
  "נתראה!";

/* ================= COMPONENT ================= */

export default function ReminderTab({
  invitationId,
  eventDate,
  eventLocation,
  lat,
  lng,
  giftCreditUrl,
}: Props) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeGiftLink, setIncludeGiftLink] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  /* ================= TIMING ================= */

  type SendTiming = "now" | "scheduled";

  const [sendTiming, setSendTiming] = useState<SendTiming>("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const computedScheduledAt = useMemo(() => {
    if (
      sendTiming !== "scheduled" ||
      !scheduledDate ||
      !scheduledTime
    ) {
      return null;
    }

    const [year, month, day] = scheduledDate.split("-").map(Number);
    const [hour, minute] = scheduledTime.split(":").map(Number);

    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }, [sendTiming, scheduledDate, scheduledTime]);

  /* ================= TEST SMS ================= */

  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testsRemaining, setTestsRemaining] = useState<number | null>(null);

  useEffect(() => {
    async function loadRemaining() {
      try {
        const res = await fetch("/api/sms/test", {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json();
        if (typeof data.remaining === "number") {
          setTestsRemaining(data.remaining);
        }
      } catch {
        setTestsRemaining(0);
      }
    }

    loadRemaining();
  }, []);

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

  /* ================= HELPERS ================= */

  const hasTable = (g: Guest) =>
    !!g.tableName || typeof g.tableNumber === "number";

  const confirmedGuests = useMemo(
    () => guests.filter((g) => g.rsvp === "yes"),
    [guests]
  );

  const guestsWithTable = useMemo(
    () => confirmedGuests.filter(hasTable),
    [confirmedGuests]
  );

  const guestsToSend = useMemo(
    () =>
      guestsWithTable.length > 0
        ? guestsWithTable
        : confirmedGuests,
    [guestsWithTable, confirmedGuests]
  );

  const buildReminderMessage = (g: Guest) =>
    buildMessage({
      template: MESSAGE_WITH_TABLE,
      guest: g,
      eventDate,
      eventLocation,
      navigationLink:
        typeof lat === "number" && typeof lng === "number"
          ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
          : "",
      includeGiftLink,
      giftLink: giftCreditUrl || "",
    });

  /* ================= PREVIEW ================= */

  useEffect(() => {
    if (!invitationId || guestsToSend.length === 0) {
      setPreview(null);
      return;
    }

    let longestText = "";
    let longestGuest: Guest | null = null;

    for (const g of guestsToSend) {
      const text = buildReminderMessage(g);
      if (text.length > longestText.length) {
        longestText = text;
        longestGuest = g;
      }
    }

    if (!longestGuest) return;

    async function fetchPreview() {
      try {
        const res = await fetch("/api/sms/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            invitationId,
            guestId: longestGuest!._id,
            messageOverride: longestText,
          }),
        });

        const data = await res.json();

        if (data?.text) {
          setPreview({
            text: data.text,
            totalChars: data.totalChars,
            parts: data.parts,
            blocked: !data.allowed,
          });
        }
      } catch {}
    }

    fetchPreview();
  }, [invitationId, guestsToSend, includeGiftLink]);

  /* ================= TEST SEND ================= */

  async function sendTestMessage() {
    if (!preview?.text || !testPhone) return;

    try {
      setSendingTest(true);

      const res = await fetch("/api/sms/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: testPhone,
          message: preview.text,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (typeof data.remaining === "number") {
          setTestsRemaining(data.remaining);
        }
        alert("נשלח בהצלחה ✅");
      } else {
        alert("שליחה נכשלה ❌");
      }
    } catch {
      alert("שגיאה בשליחה");
    } finally {
      setSendingTest(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">טוען אורחים…</p>;
  }

  return (
    <div className="space-y-6">

      <AudienceFilterSelector
        value={guestsWithTable.length > 0 ? "withTable" : "all"}
        onChange={() => {}}
        totalCount={confirmedGuests.length}
        withTableCount={guestsWithTable.length}
        readOnly
      />

      {/* TIMING UI */}
      <div className="border rounded-xl p-4 bg-[#faf9f7] space-y-4 text-sm">
        <div className="font-semibold">⏱️ תזמון ההודעה</div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={sendTiming === "now"}
              onChange={() => setSendTiming("now")}
            />
            שליחה מיידית
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={sendTiming === "scheduled"}
              onChange={() => setSendTiming("scheduled")}
            />
            שליחה מתוזמנת
          </label>
        </div>

        {sendTiming === "scheduled" && (
          <div className="flex gap-3">
            <input
              type="date"
              min={new Date().toLocaleDateString("en-CA")}
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2"
            />

            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2"
            />
          </div>
        )}

        {computedScheduledAt && (
          <div className="text-xs text-gray-500">
            📅 תישלח ב־
            <strong>
              {" "}
              {computedScheduledAt.toLocaleDateString("he-IL")}
            </strong>{" "}
            בשעה{" "}
            <strong>
              {computedScheduledAt.toLocaleTimeString("he-IL", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </strong>
          </div>
        )}
      </div>

      {/* SEND BUTTON */}
      <SendButton
        channel="sms"
        type="reminder"
        invitationId={invitationId}
        audience={guestsToSend.map((g) => g._id)}
        scheduledAt={computedScheduledAt}

        disabled={
          !preview ||
          preview.blocked ||
          (sendTiming === "scheduled" && !computedScheduledAt)
        }
      >
        {sendTiming === "scheduled"
          ? "⏱️ תזמן תזכורת"
          : `📩 שלח תזכורת (${guestsToSend.length})`}
      </SendButton>
    </div>
  );
}
