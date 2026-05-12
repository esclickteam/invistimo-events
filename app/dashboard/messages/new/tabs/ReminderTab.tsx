"use client";

import { useEffect, useMemo, useState } from "react";
import AudienceFilterSelector from "../shared/AudienceFilterSelector";
import SendButton from "../shared/SendButton";
import ScheduledMessagesTable from "@/app/components/ScheduledMessagesTable";
import { buildMessage } from "@/lib/messages/buildMessage";
import { useAuth } from "@/context/AuthContext";

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
  invitationTitle: string;
  eventDate: string;
  eventLocation: string;
  lat?: number;
  lng?: number;
  giftCreditUrl?: string;
};

/* ================= CONSTANTS ================= */

const MESSAGE_WITH_TABLE =
  "היי {{name}} 🌸\n" +
  "שמחים לראות אותך ב־{{invitationTitle}} 💛\n\n" +
  "השולחן שלך באירוע:\n" +
  "🪑 {{tableName}}\n\n" +
  "📍 ניווט:\n" +
  "{{navigationLink}}\n\n" +
  "נתראה!";

const CARD =
  "rounded-[28px] border border-[#E8DFD2] bg-white/95 shadow-[0_18px_45px_rgba(31,27,46,0.08)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#EEE7DD] bg-[#FCFAF7] shadow-sm";

const INPUT =
  "w-full rounded-2xl border border-[#E6DED4] bg-white px-4 py-3 text-sm text-[#1F2937] outline-none transition focus:border-[#C8A45D] focus:ring-4 focus:ring-[#C8A45D]/15";

const GOLD_BADGE =
  "inline-flex items-center gap-2 rounded-full border border-[#E2C98F]/60 bg-[#FFF8E7] px-3 py-1 text-xs font-bold text-[#8A6A22]";

/* ================= COMPONENT ================= */

export default function ReminderTab({
  invitationId,
  invitationTitle,
  eventDate,
  eventLocation,
  lat,
  lng,
  giftCreditUrl,
}: Props) {
  const { user } = useAuth();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  const [includeGiftLink, setIncludeGiftLink] = useState(false);
  const [giftLink, setGiftLink] = useState(giftCreditUrl || "");

  const [message, setMessage] = useState(MESSAGE_WITH_TABLE);

  type AudienceType = "all" | "withTable";
  const [audienceType, setAudienceType] =
    useState<AudienceType>("withTable");

  const [preview, setPreview] = useState<any>(null);

  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testCount, setTestCount] = useState(0);
  const MAX_TEST_MESSAGES = 2;

  const [reminderSentAt, setReminderSentAt] = useState<Date | null>(null);
  const [reminderLocked, setReminderLocked] = useState(true);

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
        setScheduledMessages(Array.isArray(data.messages) ? data.messages : []);
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
    if (sendTiming !== "scheduled" || !scheduledDate || !scheduledTime) {
      return null;
    }

    const [year, month, day] = scheduledDate.split("-").map(Number);
    const [hour, minute] = scheduledTime.split(":").map(Number);

    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }, [sendTiming, scheduledDate, scheduledTime]);

  /* ================= LOAD GUESTS ================= */

  useEffect(() => {
    if (!invitationId) {
      setLoading(false);
      setGuests([]);
      return;
    }

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
          setReminderLocked(inv?.messageLocks?.reminderSms ?? true);
        } else {
          setReminderSentAt(null);
          setReminderLocked(inv?.messageLocks?.reminderSms ?? true);
        }
      } catch {
        setGuests([]);
      } finally {
        setLoading(false);
      }
    }

    loadGuests();
  }, [invitationId]);

  async function toggleMessageLock(current: boolean) {
    try {
      const res = await fetch("/api/admin/toggle-message-lock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitationId,
          key: "reminderSms",
          value: !current,
        }),
      });

      if (!res.ok) {
        throw new Error("FAILED");
      }

      setReminderLocked(!current);
    } catch (err) {
      console.error(err);
      alert("שגיאה בעדכון הנעילה");
    }
  }

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

  const guestsToSend = useMemo(() => {
    if (audienceType === "withTable") {
      return guestsWithTable;
    }

    return confirmedGuests;
  }, [audienceType, guestsWithTable, confirmedGuests]);

  const buildReminderMessage = (g: Guest) =>
    buildMessage({
      template: message,
      guest: g,
      invitationTitle,
      eventDate,
      eventLocation,
      navigationLink:
        typeof lat === "number" && typeof lng === "number"
          ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
          : "",
      includeGiftLink,
      giftLink,
    });

  /* ================= PREVIEW ================= */

  useEffect(() => {
    if (!invitationId || guestsToSend.length === 0) {
      setPreview(null);
      return;
    }

    const firstGuest = guestsToSend[0];
    const localText = buildReminderMessage(firstGuest);

    setPreview({
      text: localText,
      totalChars: localText.length,
      parts: Math.ceil(localText.length / 160),
      blocked: false,
      loading: true,
    });

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
  }, [
    invitationId,
    guestsToSend,
    includeGiftLink,
    giftLink,
    message,
    invitationTitle,
    eventDate,
    eventLocation,
    lat,
    lng,
  ]);

  const sendTestMessage = async () => {
    if (!preview?.text || !testPhone) return;

    if (testCount >= MAX_TEST_MESSAGES) {
      alert("ניתן לשלוח עד 2 הודעות בדיקה בלבד");
      return;
    }

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
        setTestCount((prev) => prev + 1);
        alert("הודעת בדיקה נשלחה בהצלחה");
        setTestPhone("");
      } else {
        alert(data?.error || "שגיאה בשליחת הודעת בדיקה");
      }
    } catch {
      alert("שגיאה בשליחה");
    } finally {
      setSendingTest(false);
    }
  };

  const reminderAlreadySent = !!reminderSentAt;

  if (loading) {
    return (
      <div className={`${CARD} p-6 text-center text-sm text-[#7A6E63]`}>
        טוען אורחים…
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* HEADER */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="relative p-6 sm:p-7">
          <div className="absolute left-0 top-0 h-full w-24 bg-gradient-to-b from-[#F5DE9F]/40 to-transparent" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className={GOLD_BADGE}>
                <span>📩</span>
                <span>שליחת תזכורת SMS</span>
              </div>

              <h2 className="mt-3 text-2xl font-black text-[#1F1A2E]">
                הודעת תזכורת עם שולחן וניווט
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7A6E63]">
                ההודעה תישלח למוזמנים שאישרו הגעה. הנתונים של שם האורח,
                השולחן והניווט מתעדכנים אוטומטית בזמן השליחה.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-[24px] border border-[#E8DFD2] bg-[#FCFAF7] p-3 text-center">
              <div>
                <div className="text-lg font-black text-[#1F1A2E]">
                  {confirmedGuests.length}
                </div>
                <div className="text-[11px] font-bold text-[#8C8178]">
                  אישרו
                </div>
              </div>

              <div>
                <div className="text-lg font-black text-[#1F1A2E]">
                  {guestsWithTable.length}
                </div>
                <div className="text-[11px] font-bold text-[#8C8178]">
                  עם שולחן
                </div>
              </div>

              <div>
                <div className="text-lg font-black text-[#1F1A2E]">
                  {guestsToSend.length}
                </div>
                <div className="text-[11px] font-bold text-[#8C8178]">
                  לשליחה
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AUDIENCE */}
      <div className={`${CARD} p-5 sm:p-6`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-[#1F1A2E]">
              בחירת קהל יעד
            </h3>
            <p className="mt-1 text-sm text-[#7A6E63]">
              בחרי למי לשלוח את התזכורת.
            </p>
          </div>

          <span className={GOLD_BADGE}>👥 מוזמנים</span>
        </div>

        <AudienceFilterSelector
          value={audienceType}
          onChange={(value) => setAudienceType(value as AudienceType)}
          totalCount={confirmedGuests.length}
          withTableCount={guestsWithTable.length}
        />
      </div>

      {/* EDIT MESSAGE */}
      <div className={`${CARD} p-5 sm:p-6 space-y-4`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-[#1F1A2E]">
              ✏️ עריכת תוכן ההודעה
            </h3>
            <p className="mt-1 text-sm text-[#7A6E63]">
              אפשר לערוך את הנוסח. המשתנים יוחלפו אוטומטית לכל אורח.
            </p>
          </div>

          <span className={GOLD_BADGE}>SMS</span>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={7}
          className={`${INPUT} min-h-[180px] resize-y leading-7`}
        />

        <div className={`${SOFT_CARD} p-4`}>
          <p className="mb-2 text-xs font-bold text-[#7A6E63]">
            משתנים אוטומטיים:
          </p>

          <div className="flex flex-wrap gap-2 text-xs">
            {[
              "{{name}}",
              "{{invitationTitle}}",
              "{{tableName}}",
              "{{navigationLink}}",
            ].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#E2C98F]/60 bg-white px-3 py-1 font-mono font-bold text-[#8A6A22]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* PREVIEW */}
      {preview && (
        <div className={`${CARD} p-5 sm:p-6`}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-[#1F1A2E]">
                תצוגה מקדימה
              </h3>
              <p className="mt-1 text-sm text-[#7A6E63]">
                כך ההודעה תיראה לאורחים.
              </p>
            </div>

            <div className="text-left text-xs text-[#7A6E63]">
              <div>
                תווים:{" "}
                <span className="font-black text-[#1F1A2E]">
                  {preview.totalChars}
                </span>
              </div>
              <div>
                חלקים:{" "}
                <span className="font-black text-[#1F1A2E]">
                  {preview.parts}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative h-[520px] w-[260px] rounded-[48px] bg-[#141414] p-3 shadow-2xl">
              <div className="absolute left-1/2 top-3 h-[22px] w-[120px] -translate-x-1/2 rounded-b-2xl bg-[#141414]" />

              <div className="relative h-full w-full overflow-hidden rounded-[38px] bg-[#F5F2EC]">
                <div className="border-b border-[#E6DED4] bg-white/80 py-2 text-center text-[11px] font-black text-[#7A6E63]">
                  INVISTIMO · SMS
                </div>

                <div className="flex h-full items-center justify-center p-4">
                  <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-[26px] bg-white px-4 py-3 text-right text-sm leading-6 text-[#1F1A2E] shadow-sm">
                    {preview.text}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {preview.blocked && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              ההודעה חסומה לשליחה לפי בדיקת השרת.
            </div>
          )}
        </div>
      )}

      {/* GIFT LINK */}
      {preview && (
        <div className={`${CARD} p-5 sm:p-6 space-y-4`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-[#1F1A2E]">
                🎁 קישור מתנה באשראי
              </h3>
              <p className="mt-1 text-sm text-[#7A6E63]">
                אפשר לצרף להודעה קישור לתשלום מתנה באשראי.
              </p>
            </div>

            <span className={GOLD_BADGE}>אופציונלי</span>
          </div>

          <label className={`${SOFT_CARD} flex cursor-pointer items-center gap-3 p-4`}>
            <input
              type="checkbox"
              checked={includeGiftLink}
              onChange={(e) => setIncludeGiftLink(e.target.checked)}
              className="h-5 w-5 accent-[#C8A45D]"
            />

            <span className="text-sm font-bold text-[#1F1A2E]">
              הוספת קישור מתנה באשראי להודעה
            </span>
          </label>

          {includeGiftLink && (
            <div>
              <label className="mb-2 block text-sm font-bold text-[#7A6E63]">
                קישור למתנה באשראי
              </label>

              <input
                type="url"
                value={giftLink}
                onChange={(e) => setGiftLink(e.target.value)}
                placeholder="https://..."
                className={INPUT}
              />
            </div>
          )}
        </div>
      )}

      {/* TEST MESSAGE */}
      {preview && (
        <div className={`${CARD} p-5 sm:p-6 space-y-4`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-[#1F1A2E]">
                🧪 שליחת הודעה לבדיקה
              </h3>
              <p className="mt-1 text-sm leading-6 text-[#7A6E63]">
                ההודעה תישלח למספר נייד לבדיקה בלבד — בדיוק כמו שתישלח
                לאורחים באירוע.
              </p>
            </div>

            <span className={GOLD_BADGE}>
              {testCount}/{MAX_TEST_MESSAGES}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="tel"
              inputMode="numeric"
              dir="ltr"
              placeholder="05XXXXXXXX"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className={INPUT}
            />

            <button
              onClick={sendTestMessage}
              disabled={
                !testPhone ||
                preview?.blocked ||
                sendingTest ||
                testCount >= MAX_TEST_MESSAGES
              }
              className="rounded-2xl bg-[#1F1A2E] px-6 py-3 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:scale-[1.01] hover:bg-[#2B2440] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testCount >= MAX_TEST_MESSAGES
                ? "הגעת למגבלת בדיקות"
                : sendingTest
                ? "שולח..."
                : "שלח לבדיקה"}
            </button>
          </div>

          <div
            className={`text-xs font-bold ${
              testCount >= MAX_TEST_MESSAGES
                ? "text-red-500"
                : "text-[#7A6E63]"
            }`}
          >
            נשלחו {testCount} מתוך {MAX_TEST_MESSAGES} הודעות בדיקה
          </div>
        </div>
      )}

      {/* TIMING */}
      <div className={`${CARD} p-5 sm:p-6 space-y-5`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-[#1F1A2E]">
              ⏱️ מועד שליחה
            </h3>
            <p className="mt-1 text-sm text-[#7A6E63]">
              בחרי אם לשלוח עכשיו או לתזמן שליחה מראש.
            </p>
          </div>

          <span className={GOLD_BADGE}>תזמון</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSendTiming("now")}
            className={`rounded-[24px] border p-4 text-right transition ${
              sendTiming === "now"
                ? "border-[#C8A45D] bg-[#FFF8E7] shadow-[0_12px_30px_rgba(200,164,93,0.18)]"
                : "border-[#EEE7DD] bg-[#FCFAF7] hover:border-[#D8C7A3]"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                  sendTiming === "now"
                    ? "border-[#C8A45D] bg-[#C8A45D]"
                    : "border-[#CFC7BE] bg-white"
                }`}
              >
                {sendTiming === "now" && (
                  <span className="h-2 w-2 rounded-full bg-white" />
                )}
              </span>

              <div>
                <div className="font-black text-[#1F1A2E]">
                  🚀 שליחה מיידית
                </div>
                <div className="mt-1 text-xs font-medium text-orange-600">
                  ההודעה תישלח מיד ולא ניתן יהיה לבטל
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSendTiming("scheduled")}
            className={`rounded-[24px] border p-4 text-right transition ${
              sendTiming === "scheduled"
                ? "border-[#C8A45D] bg-[#FFF8E7] shadow-[0_12px_30px_rgba(200,164,93,0.18)]"
                : "border-[#EEE7DD] bg-[#FCFAF7] hover:border-[#D8C7A3]"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                  sendTiming === "scheduled"
                    ? "border-[#C8A45D] bg-[#C8A45D]"
                    : "border-[#CFC7BE] bg-white"
                }`}
              >
                {sendTiming === "scheduled" && (
                  <span className="h-2 w-2 rounded-full bg-white" />
                )}
              </span>

              <div>
                <div className="font-black text-[#1F1A2E]">
                  📅 שליחה מתוזמנת
                </div>
                <div className="mt-1 text-xs font-medium text-green-700">
                  ניתן לערוך או לבטל עד מועד השליחה
                </div>
              </div>
            </div>
          </button>
        </div>

        {sendTiming === "scheduled" && (
          <div className={`${SOFT_CARD} grid grid-cols-1 gap-4 p-4 sm:grid-cols-2`}>
            <div>
              <label className="mb-2 block text-sm font-bold text-[#7A6E63]">
                תאריך שליחה
              </label>

              <input
                type="date"
                min={new Date().toLocaleDateString("en-CA")}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className={INPUT}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#7A6E63]">
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
                className={INPUT}
              />
            </div>
          </div>
        )}
      </div>

      {/* SEND BUTTON */}
      <div className={`${CARD} p-5 sm:p-6 space-y-4`}>
        <SendButton
          channel="sms"
          type="reminder"
          invitationId={invitationId}
          audience={guestsToSend.map((g) => g._id)}
          scheduledAt={scheduledAt}
          includeGiftLink={includeGiftLink}
          giftLink={giftLink}
          messageOverride={message}
          onAfterSend={async () => {
            if (sendTiming === "now") {
              setReminderSentAt(new Date());
            }

            await loadScheduledMessages();
          }}
          disabled={
            (reminderAlreadySent && reminderLocked) ||
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

        {(user?.role === "admin" || (user as any)?.impersonatedByAdmin) && (
          <button
            onClick={() => toggleMessageLock(reminderLocked)}
            className={`w-full rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg transition hover:scale-[1.01] ${
              reminderLocked
                ? "bg-orange-500 shadow-orange-500/20"
                : "bg-green-600 shadow-green-600/20"
            }`}
          >
            {reminderLocked ? "🔓 פתח תזכורת" : "🔒 סגור תזכורת"}
          </button>
        )}
      </div>

      {/* OPEN SCHEDULED MODAL BUTTON */}
      {scheduledMessages.length > 0 && (
        <div className="flex w-full justify-center">
          <button
            onClick={async () => {
              await loadScheduledMessages();
              setShowScheduled(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#E8DFD2] bg-white px-6 py-3 text-sm font-black text-[#1F1A2E] shadow-[0_14px_35px_rgba(31,27,46,0.08)] transition hover:scale-[1.01] hover:bg-[#FCFAF7]"
          >
            <span>📅</span>
            <span>צפייה בהודעות מתוזמנות</span>
          </button>
        </div>
      )}

      {/* MODAL */}
      {showScheduled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="relative max-h-[85vh] w-[95%] max-w-[950px] overflow-hidden rounded-[32px] border border-[#E8DFD2] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#EEE7DD] bg-white/95 px-6 py-5 backdrop-blur">
              <div>
                <h2 className="text-xl font-black text-[#1F1A2E]">
                  📅 הודעות מתוזמנות
                </h2>

                <p className="mt-1 text-sm text-[#7A6E63]">
                  כאן אפשר לראות, לערוך או לבטל הודעות שתוזמנו.
                </p>
              </div>

              <button
                onClick={() => setShowScheduled(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8DFD2] bg-[#FCFAF7] text-lg font-black text-[#1F1A2E] transition hover:bg-[#F3EEE7]"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[calc(85vh-92px)] overflow-y-auto p-6">
              <ScheduledMessagesTable
                messages={scheduledMessages}
                onChange={loadScheduledMessages}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}