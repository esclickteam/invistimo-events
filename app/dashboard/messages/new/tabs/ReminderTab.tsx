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
  const [includeGiftLink] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  const [testPhone, setTestPhone] = useState("");
const [sendingTest, setSendingTest] = useState(false);
const [reminderSentAt, setReminderSentAt] = useState<Date | null>(null);


  /* ================= SCHEDULED MESSAGES ================= */

  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [showScheduled, setShowScheduled] = useState(false);

  const loadScheduledMessages = async () => {
    try {
      const res = await fetch("/api/scheduled-messages", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (data?.success) {
        setScheduledMessages(
          Array.isArray(data.messages) ? data.messages : []
        );
      } else {
        setScheduledMessages([]);
      }
    } catch (err) {
      console.error("❌ Failed to load scheduled messages", err);
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

    const [year, month, day] = scheduledDate.split("-").map(Number);
    const [hour, minute] = scheduledTime.split(":").map(Number);

    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }, [sendTiming, scheduledDate, scheduledTime]);

  /* ================= LOAD GUESTS ================= */

  useEffect(() => {
    if (!invitationId) return;

    async function loadGuests() {
  try {
    setLoading(true);

    const [guestsRes, invitationRes] = await Promise.all([
      fetch(`/api/guests?invitation=${invitationId}`),
      fetch(`/api/invitations/${invitationId}`),
    ]);

    const guestsData = await guestsRes.json();
    const invitationData = await invitationRes.json();

    setGuests(Array.isArray(guestsData.guests) ? guestsData.guests : []);

    const inv = invitationData?.invitation;
    if (inv?.reminderSentAt) {
      setReminderSentAt(new Date(inv.reminderSentAt));
    }
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

  // ================================
  // 1️⃣ LOCAL PREVIEW – מיידי
  // ================================

  const firstGuest = guestsToSend[0];
  const localText = buildReminderMessage(firstGuest);

  setPreview({
    text: localText,
    totalChars: localText.length,
    parts: Math.ceil(localText.length / 160),
    blocked: false, // זמני עד שהשרת מחזיר
    loading: true,  // נוסיף אינדיקציה אם רוצים
  });

  // ================================
  // 2️⃣ SERVER VALIDATION – ברקע
  // ================================

  async function validateWithServer() {
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
        });
      }
    } catch {
      setPreview((prev: any) => ({
        ...prev,
        loading: false,
      }));
    }
  }

  validateWithServer();

}, [invitationId, guestsToSend]);

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
    } else {
      alert("שגיאה בשליחת הודעת בדיקה");
    }
  } catch {
    alert("שגיאה בשליחה");
  } finally {
    setSendingTest(false);
  }
};



  const reminderAlreadySent = !!reminderSentAt;


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

      {/* PREVIEW */}
      {preview && (
        <div className="w-full flex justify-center mt-6 mb-8">
          <div className="relative w-[260px] h-[520px] bg-black rounded-[48px] p-3 shadow-2xl">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[120px] h-[22px] bg-black rounded-b-2xl" />
            <div className="relative w-full h-full bg-[#f5f5f5] rounded-[38px] overflow-hidden">
              <div className="bg-gray-100 text-center py-2 text-[11px] font-semibold text-gray-600 border-b">
                INVISTIMO · SMS
              </div>
              <div className="flex justify-center items-center h-full p-4">
                <div className="bg-gray-200 text-gray-900 rounded-3xl px-4 py-3 text-sm max-w-[85%] text-right break-words whitespace-pre-wrap">
                  {preview.text}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEST MESSAGE */}
{preview && (
  <div className="border rounded-2xl p-5 bg-white shadow-sm space-y-4">

    <div className="flex justify-between">
      <div className="font-semibold">
        ✏️ שליחת הודעה לבדיקה
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
)}


      {/* TIMING */}
      {/* ================= TIMING ================= */}
<div className="border rounded-2xl p-6 bg-transparent shadow-none space-y-5" dir="rtl">
  <div className="flex items-center gap-2 font-semibold text-gray-800">
    <span>⏱️</span>
    <span>תזמון ההודעה</span>
  </div>

  {/* RADIO OPTIONS */}
  <div className="space-y-3">

    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="radio"
        checked={sendTiming === "now"}
        onChange={() => setSendTiming("now")}
        className="accent-blue-600"
      />
      <span>שליחה מיידית</span>
    </label>

    {sendTiming === "now" && (
      <div className="text-orange-600 text-sm mr-6">
        ⚠️ ההודעה תישלח מיד ולא ניתן יהיה לבטל
      </div>
    )}

    <label className="flex items-center gap-3 cursor-pointer mt-2">
      <input
        type="radio"
        checked={sendTiming === "scheduled"}
        onChange={() => setSendTiming("scheduled")}
        className="accent-blue-600"
      />
      <span>שליחה מתוזמנת</span>
    </label>

    {sendTiming === "scheduled" && (
      <div className="text-green-600 text-sm mr-6">
        ✓ ניתן לערוך או לבטל את ההודעה עד מועד השליחה
      </div>
    )}
  </div>

  {/* DATE + TIME */}
  {sendTiming === "scheduled" && (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

      {/* DATE */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600">
          תאריך שליחה
        </label>
        <input
          type="date"
          min={new Date().toLocaleDateString("en-CA")}
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          className="border rounded-xl px-4 py-3 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* TIME */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600">
          שעת שליחה
        </label>
        <input
          type="time"
          min={
            scheduledDate === new Date().toLocaleDateString("en-CA")
              ? new Date().toTimeString().slice(0, 5)
              : undefined
          }
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          className="border rounded-xl px-4 py-3 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

    </div>
  )}
</div>


      <SendButton
  channel="sms"
  type="reminder"
  invitationId={invitationId}
  audience={guestsToSend.map((g) => g._id)}
  scheduledAt={scheduledAt}
  onAfterSend={() => {
    if (sendTiming === "now") {
      setReminderSentAt(new Date());
    }
  }}
  disabled={
    reminderAlreadySent ||
    !preview ||
    preview.blocked ||
    (sendTiming === "scheduled" && !scheduledAt)
  }
>
  {reminderAlreadySent
    ? "✅ תזכורת נשלחה"
    : sendTiming === "scheduled"
    ? "⏱️ תזמן תזכורת"
    : `📩 שלח תזכורת (${guestsToSend.length})`}
</SendButton>


      {/* OPEN MODAL BUTTON */}
     {scheduledMessages.length > 0 && (
  <div className="w-full flex justify-center mt-8">

    <button
      onClick={async () => {
        await loadScheduledMessages();
        setShowScheduled(true);
      }}
      className="
        flex items-center gap-2
        px-6 py-3
        rounded-2xl
        bg-white
        border border-gray-200
        shadow-sm
        text-sm font-medium text-gray-700
        hover:bg-gray-50
        hover:shadow-md
        transition-all duration-200
      "
    >
      <span>📅</span>
      <span>צפייה בהודעות מתוזמנות</span>
    </button>

  </div>
)}





      {/* MODAL */}
      {showScheduled && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl relative w-[95%] max-w-[900px] max-h-[85vh] overflow-y-auto p-6">

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                📅 הודעות מתוזמנות
              </h2>

              <button
                onClick={() => setShowScheduled(false)}
                className="text-gray-500 hover:text-black text-xl"
              >
                ✕
              </button>
            </div>

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
