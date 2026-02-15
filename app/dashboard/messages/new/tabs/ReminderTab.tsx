"use client";

import { useEffect, useMemo, useState } from "react";
import AudienceFilterSelector from "../shared/AudienceFilterSelector";
import SendButton from "../shared/SendButton";
import ScheduledMessagesTable from "@/app/components/ScheduledMessagesTable";
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

/* ================= CONSTANT ================= */

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
  const [preview, setPreview] = useState<any>(null);

  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  /* ================= SCHEDULED ================= */

  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [showScheduled, setShowScheduled] = useState(false);

  const loadScheduledMessages = async () => {
    try {
      const res = await fetch("/api/scheduled-messages", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();
      setScheduledMessages(data?.success ? data.messages || [] : []);
    } catch {
      setScheduledMessages([]);
    }
  };

  useEffect(() => {
    loadScheduledMessages();
  }, []);

  /* ================= TIMING ================= */

  type SendTiming = "now" | "scheduled";
  const [sendTiming, setSendTiming] = useState<SendTiming>("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

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

    return new Date(y, m - 1, d, hh, mm);
  }, [sendTiming, scheduledDate, scheduledTime]);

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

  const confirmedGuests = useMemo(
    () => guests.filter((g) => g.rsvp === "yes"),
    [guests]
  );

  const guestsToSend = confirmedGuests;

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
      includeGiftLink: false,
      giftLink: giftCreditUrl || "",
    });

  /* ================= PREVIEW ================= */

  useEffect(() => {
    if (!invitationId || guestsToSend.length === 0) {
      setPreview(null);
      return;
    }

    const firstGuest = guestsToSend[0];
    const localText = buildReminderMessage(firstGuest);

    // 🔹 מיידי
    setPreview({
      text: localText,
      totalChars: localText.length,
      parts: Math.ceil(localText.length / 160),
      blocked: false,
      loading: true,
      testsRemaining: 10,
    });

    // 🔹 validation שרת
    async function validate() {
      try {
        const res = await fetch("/api/sms/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            invitationId,
            guestId: firstGuest._id,
            messageOverride: localText,
          }),
        });

        const data = await res.json();

        if (data?.text) {
          setPreview({
            text: data.text,
            totalChars: data.totalChars,
            parts: data.parts,
            blocked: !data.allowed,
            loading: false,
            testsRemaining: data.testsRemaining ?? 10,
          });
        }
      } catch {
        setPreview((prev: any) => ({ ...prev, loading: false }));
      }
    }

    validate();
  }, [invitationId, guestsToSend]);

  /* ================= TEST MESSAGE ================= */

  const sendTestMessage = async () => {
    if (!preview?.text || !testPhone) return;

    try {
      setSendingTest(true);

      const res = await fetch("/api/sms/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          invitationId,
          phone: testPhone,
          message: preview.text,
        }),
      });

      const data = await res.json();

      if (data?.success) {
        alert("הודעת בדיקה נשלחה בהצלחה");
        setTestPhone("");
        loadScheduledMessages();
      } else {
        alert("שגיאה בשליחת הודעת בדיקה");
      }
    } catch {
      alert("שגיאה בשליחה");
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">טוען אורחים…</p>;
  }

  return (
    <div className="space-y-8">

      {/* PREVIEW */}
      {preview && (
        <div className="flex justify-center">
          <div className="relative w-[260px] h-[520px] bg-black rounded-[48px] p-3 shadow-2xl">
            <div className="relative w-full h-full bg-[#f5f5f5] rounded-[38px] overflow-hidden">
              <div className="bg-gray-100 text-center py-2 text-[11px] font-semibold border-b">
                INVISTIMO · SMS
              </div>
              <div className="flex justify-center items-center h-full p-4">
                <div className="bg-gray-200 rounded-3xl px-4 py-3 text-sm text-right whitespace-pre-wrap">
                  {preview.text}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEST MESSAGE */}
      <div className="border rounded-2xl p-5 bg-white shadow-sm space-y-4">
        <div className="flex justify-between">
          <div className="font-semibold">
            ✏️ שליחת הודעה לבדיקה
          </div>
          <div className="text-xs text-gray-500">
            בדיקות שנשארו היום: {preview?.testsRemaining ?? 10} / 10
          </div>
        </div>

        <p className="text-sm text-gray-500">
          ההודעה תישלח למספר נייד בלבד – בדיוק כפי שהיא תישלח לאורחים
        </p>

        <div className="flex gap-3">
          <input
            type="tel"
            placeholder="05XXXXXXXX"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            className="flex-1 border rounded-xl px-4 py-3 text-sm"
          />

          <button
            onClick={sendTestMessage}
            disabled={!testPhone || preview?.blocked || sendingTest}
            className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-sm disabled:opacity-50"
          >
            {sendingTest ? "שולח..." : "שלח לבדיקה"}
          </button>
        </div>
      </div>

      {/* SEND BUTTON */}
      <SendButton
        channel="sms"
        type="reminder"
        invitationId={invitationId}
        audience={guestsToSend.map((g) => g._id)}
        scheduledAt={scheduledAt}
        disabled={!preview || preview.blocked}
      >
        📩 שלח תזכורת ({guestsToSend.length})
      </SendButton>

      {/* MODAL BUTTON */}
      {scheduledMessages.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowScheduled(true)}
            className="px-6 py-3 rounded-2xl bg-white border shadow-sm text-sm"
          >
            📅 צפייה בהודעות מתוזמנות
          </button>
        </div>
      )}

      {/* MODAL */}
      {showScheduled && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[95%] max-w-[900px] p-6">
            <ScheduledMessagesTable
              messages={scheduledMessages}
              onChange={loadScheduledMessages}
            />
          </div>
        </div>
      )}
    </div>
  );
}
