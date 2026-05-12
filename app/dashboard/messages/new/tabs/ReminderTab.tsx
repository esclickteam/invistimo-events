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

type AudienceType = "all" | "withTable";
type SendTiming = "now" | "scheduled";

/* ================= CONSTANTS ================= */

const MESSAGE_WITH_TABLE =
  "היי {{name}} 🌸\n" +
  "שמחים לראות אותך ב־{{invitationTitle}} 💛\n\n" +
  "השולחן שלך באירוע:\n" +
  "🪑 {{tableName}}\n\n" +
  "📍 ניווט:\n" +
  "{{navigationLink}}\n\n" +
  "נתראה!";

const MAX_TEST_MESSAGES = 2;

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
  const [audienceType, setAudienceType] =
    useState<AudienceType>("withTable");

  const [preview, setPreview] = useState<any>(null);

  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testCount, setTestCount] = useState(0);

  const [reminderSentAt, setReminderSentAt] =
    useState<Date | null>(null);
  const [reminderLocked, setReminderLocked] = useState(true);

  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [showScheduled, setShowScheduled] = useState(false);

  const [sendTiming, setSendTiming] = useState<SendTiming>("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  /* ================= SCHEDULED AT ================= */

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

  /* ================= LOAD SCHEDULED ================= */

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

  /* ================= LOAD GUESTS + INVITATION ================= */

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
          fetch(`/api/guests?invitation=${invitationId}`, {
            credentials: "include",
            cache: "no-store",
          }),
          fetch(`/api/invitations/${invitationId}`, {
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        const guestsData = await guestsRes.json();
        const invitationData = await invitationRes.json();

        setGuests(
          Array.isArray(guestsData.guests) ? guestsData.guests : []
        );

        const inv = invitationData?.invitation;

        if (inv?.reminderSentAt) {
          setReminderSentAt(new Date(inv.reminderSentAt));
        }

        setReminderLocked(inv?.messageLocks?.reminderSms ?? true);
      } catch (err) {
        console.error("❌ Failed to load reminder tab data", err);
        setGuests([]);
      } finally {
        setLoading(false);
      }
    }

    loadGuests();
  }, [invitationId]);

  /* ================= LOCK ================= */

  async function toggleMessageLock(current: boolean) {
    try {
      const res = await fetch("/api/admin/toggle-message-lock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
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

  const guestsWithoutTable = useMemo(
    () => confirmedGuests.filter((g) => !hasTable(g)),
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

  const reminderAlreadySent = !!reminderSentAt;

  const isAdmin =
    user?.role === "admin" || (user as any)?.impersonatedByAdmin;

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

  /* ================= TEST MESSAGE ================= */

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

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div
        dir="rtl"
        className="rounded-[32px] border border-[#E7DCCB] bg-[#F8F1E6] p-8 text-center text-sm text-[#7A6246]"
      >
        טוען תזכורות…
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-8 text-[#3E2D20]">
      {/* HERO */}
      <section
        className="
          rounded-[34px]
          border border-[#E7DCCB]
          bg-gradient-to-br from-[#FFF8EE] via-[#F6EBD9] to-[#E7D4B6]
          p-6 sm:p-8
          shadow-[0_18px_60px_rgba(95,68,34,0.12)]
        "
      >
        <div
          className="
            rounded-[30px]
            border border-[#E8D9C4]
            bg-[#FFF9EF]/80
            px-6 py-7
            shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]
          "
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 items-center">
            <div className="text-center lg:text-right space-y-3">
              <div
                className="
                  inline-flex items-center gap-2
                  rounded-full
                  border border-[#D9B978]
                  bg-white/70
                  px-5 py-2
                  text-xs font-black text-[#8A642B]
                "
              >
                <span>💌</span>
                <span>ניהול תזכורת לאורחים</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#3B2A1D]">
                שליחת תזכורת
              </h2>

              <p className="max-w-xl text-sm sm:text-base leading-8 text-[#7A6246] mx-auto lg:mx-0">
                שלחו לאורחים שאישרו הגעה תזכורת עם מספר שולחן,
                ניווט לאולם וקישור למתנה באשראי לפי הצורך.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                value={confirmedGuests.length}
                label="מאשרים הגעה"
                icon="✅"
              />
              <StatCard
                value={guestsWithTable.length}
                label="עם שולחן"
                icon="🪑"
              />
              <StatCard
                value={guestsWithoutTable.length}
                label="ללא שולחן"
                icon="⚠️"
              />
              <StatCard
                value={scheduledMessages.length}
                label="מתוזמנות"
                icon="⏳"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ROUND / SEND CARDS */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ReminderSendCard
          active={audienceType === "withTable"}
          title="תזכורת עם שולחן"
          badge={`${guestsWithTable.length}`}
          subtitle="למי שאישרו הגעה ויש להם שולחן"
          channel="SMS"
          status={reminderAlreadySent ? "נשלחה" : "מוכנה לשליחה"}
          onClick={() => setAudienceType("withTable")}
        />

        <ReminderSendCard
          active={audienceType === "all"}
          title="תזכורת לכל המאשרים"
          badge={`${confirmedGuests.length}`}
          subtitle="לכל מי שאישרו הגעה"
          channel="SMS"
          status={reminderAlreadySent ? "נשלחה" : "מוכנה לשליחה"}
          onClick={() => setAudienceType("all")}
        />

        <ReminderSendCard
          active={false}
          title="הודעות מתוזמנות"
          badge={`${scheduledMessages.length}`}
          subtitle="צפייה, ביטול וניהול תזמונים"
          channel="Schedule"
          status={
            scheduledMessages.length > 0
              ? "יש הודעות מתוזמנות"
              : "אין תזמונים"
          }
          onClick={async () => {
            await loadScheduledMessages();
            setShowScheduled(true);
          }}
        />
      </section>

      {/* AUDIENCE FILTER - keeps your existing component */}
      <section
        className="
          rounded-[30px]
          border border-[#E7DCCB]
          bg-[#FFF9EF]
          p-5
          shadow-sm
        "
      >
        <AudienceFilterSelector
          value={audienceType}
          onChange={(value) => setAudienceType(value as AudienceType)}
          totalCount={confirmedGuests.length}
          withTableCount={guestsWithTable.length}
        />
      </section>

      {/* MAIN GRID */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* RIGHT SIDE */}
        <div className="space-y-6">
          {/* CHANNEL */}
          <GlassPanel
            title="ערוץ שליחה"
            subtitle="בחרו איך התזכורת תישלח לאורחים"
            icon="💬"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectableBox active>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-black">SMS</span>
                  <span className="text-xl">📩</span>
                </div>
                <p className="mt-2 text-xs leading-6 text-[#7A6246]">
                  שליחת הודעת טקסט עם פרטי שולחן וניווט.
                </p>
              </SelectableBox>

              <SelectableBox active={false} muted>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-black">WhatsApp</span>
                  <span className="text-xl">💬</span>
                </div>
                <p className="mt-2 text-xs leading-6 text-[#7A6246]">
                  שמור להמשך אם תרצי להפעיל תזכורת גם בוואטסאפ.
                </p>
              </SelectableBox>
            </div>
          </GlassPanel>

          {/* MESSAGE EDITOR */}
          <GlassPanel
            title="עריכת תוכן ההודעה"
            subtitle="הטקסט הזה יישלח לכל אורח עם המשתנים האישיים שלו"
            icon="✏️"
          >
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="
                w-full resize-none
                rounded-[24px]
                border border-[#E4D3BB]
                bg-white/80
                p-5
                text-sm leading-7
                text-[#3E2D20]
                shadow-inner
                outline-none
                focus:border-[#C79B45]
                focus:ring-4
                focus:ring-[#E8C878]/20
                transition
              "
            />

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {[
                "{{name}}",
                "{{invitationTitle}}",
                "{{tableName}}",
                "{{navigationLink}}",
              ].map((item) => (
                <span
                  key={item}
                  className="
                    rounded-full
                    border border-[#E2CFB5]
                    bg-[#FFF8EA]
                    px-3 py-1
                    font-mono text-[#8A642B]
                  "
                >
                  {item}
                </span>
              ))}
            </div>
          </GlassPanel>

          {/* GIFT LINK */}
          <GlassPanel
            title="קישור למתנה באשראי"
            subtitle="אפשר להוסיף קישור לתשלום/מתנה בסוף ההודעה"
            icon="🎁"
          >
            <label
              className="
                flex cursor-pointer items-center justify-between gap-4
                rounded-[24px]
                border border-[#E4D3BB]
                bg-white/70
                p-4
              "
            >
              <div>
                <div className="font-black text-[#3E2D20]">
                  הוסף קישור מתנה להודעה
                </div>
                <div className="mt-1 text-xs text-[#7A6246]">
                  הקישור יתווסף רק אם האפשרות מסומנת.
                </div>
              </div>

              <input
                type="checkbox"
                checked={includeGiftLink}
                onChange={(e) => setIncludeGiftLink(e.target.checked)}
                className="h-5 w-5 accent-[#B8862B]"
              />
            </label>

            {includeGiftLink && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-bold text-[#6B5138]">
                  קישור למתנה באשראי
                </label>
                <input
                  type="url"
                  value={giftLink}
                  onChange={(e) => setGiftLink(e.target.value)}
                  placeholder="https://..."
                  className="
                    w-full
                    rounded-[20px]
                    border border-[#E4D3BB]
                    bg-white
                    px-4 py-3
                    text-sm
                    outline-none
                    focus:border-[#C79B45]
                    focus:ring-4
                    focus:ring-[#E8C878]/20
                    transition
                  "
                />
              </div>
            )}
          </GlassPanel>

          {/* TIMING */}
          <GlassPanel
            title="תזמון שליחת ההודעה"
            subtitle="אפשר לשלוח עכשיו או לקבוע שליחה עתידית"
            icon="⏱️"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSendTiming("now")}
                className={timingButtonClass(sendTiming === "now")}
              >
                <span className="text-xl">⚡</span>
                <span className="font-black">שליחה מיידית</span>
                <span className="text-xs font-medium text-[#7A6246]">
                  ההודעה תישלח מיד ולא ניתן יהיה לבטל.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSendTiming("scheduled")}
                className={timingButtonClass(sendTiming === "scheduled")}
              >
                <span className="text-xl">📅</span>
                <span className="font-black">שליחה מתוזמנת</span>
                <span className="text-xs font-medium text-[#7A6246]">
                  אפשר לערוך או לבטל עד מועד השליחה.
                </span>
              </button>
            </div>

            {sendTiming === "scheduled" && (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[#6B5138]">
                    תאריך שליחה
                  </label>
                  <input
                    type="date"
                    min={new Date().toLocaleDateString("en-CA")}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[#6B5138]">
                    שעת שליחה
                  </label>
                  <input
                    type="time"
                    min={
                      scheduledDate ===
                      new Date().toLocaleDateString("en-CA")
                        ? new Date().toTimeString().slice(0, 5)
                        : undefined
                    }
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className={inputClassName}
                  />
                </div>
              </div>
            )}
          </GlassPanel>
        </div>

        {/* LEFT SIDE */}
        <div className="space-y-6">
          {/* PREVIEW */}
          <GlassPanel
            title="תצוגה מקדימה"
            subtitle="כך תיראה הודעת התזכורת לאורחים"
            icon="✨"
          >
            {preview ? (
              <div className="flex justify-center py-2">
                <div className="relative w-[290px] h-[560px] rounded-[52px] bg-black p-3 shadow-2xl">
                  <div className="absolute top-3 left-1/2 z-20 h-[22px] w-[122px] -translate-x-1/2 rounded-b-2xl bg-black" />

                  <div className="relative h-full w-full overflow-hidden rounded-[40px] bg-[#F7F1E8]">
                    <div
                      className="
                        border-b border-[#E5D7C5]
                        bg-[#EFE4D4]
                        py-3
                        text-center
                        text-[11px]
                        font-black
                        tracking-wide
                        text-[#6B5138]
                      "
                    >
                      INVISTIMO · SMS
                    </div>

                    <div className="flex h-[calc(100%-44px)] items-center justify-center p-4">
                      <div
                        className="
                          max-h-[410px]
                          max-w-[92%]
                          overflow-y-auto
                          whitespace-pre-wrap
                          break-words
                          rounded-[28px]
                          bg-white
                          px-4 py-4
                          text-right
                          text-sm
                          leading-7
                          text-[#3E2D20]
                          shadow-sm
                        "
                      >
                        {preview.text}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="אין הודעה לתצוגה"
                text="בחרי קהל יעד שיש בו אורחים כדי להציג תצוגה מקדימה."
              />
            )}

            {preview && (
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <MiniStat
                  label="תווים"
                  value={preview.totalChars || 0}
                />
                <MiniStat label="חלקי SMS" value={preview.parts || 1} />
                <MiniStat
                  label="נמענים"
                  value={guestsToSend.length}
                />
              </div>
            )}
          </GlassPanel>

          {/* TEST */}
          <GlassPanel
            title="שליחת הודעה לבדיקה"
            subtitle="הודעת בדיקה תישלח בדיוק כמו שתישלח לאורחים"
            icon="🧪"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="tel"
                inputMode="numeric"
                dir="ltr"
                placeholder="05XXXXXXXX"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className={inputClassName}
              />

              <button
                type="button"
                onClick={sendTestMessage}
                disabled={
                  !testPhone ||
                  preview?.blocked ||
                  sendingTest ||
                  testCount >= MAX_TEST_MESSAGES
                }
                className="
                  rounded-[20px]
                  bg-[#3E2D20]
                  px-6 py-3
                  text-sm font-black
                  text-white
                  shadow-lg
                  transition
                  hover:bg-[#5A3D25]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {testCount >= MAX_TEST_MESSAGES
                  ? "הגעת למגבלה"
                  : sendingTest
                  ? "שולח..."
                  : "שלח לבדיקה"}
              </button>
            </div>

            <div
              className={`mt-3 text-xs ${
                testCount >= MAX_TEST_MESSAGES
                  ? "font-bold text-red-500"
                  : "text-[#7A6246]"
              }`}
            >
              נשלחו {testCount} מתוך {MAX_TEST_MESSAGES} הודעות בדיקה
            </div>
          </GlassPanel>

          {/* SEND ACTION */}
          <div
            className="
              rounded-[30px]
              border border-[#D7BC8C]
              bg-gradient-to-br from-[#CDAA55] to-[#9B661E]
              p-5
              shadow-[0_18px_45px_rgba(120,78,24,0.22)]
            "
          >
            <div className="mb-4 text-white">
              <div className="text-xl font-black">
                {sendTiming === "scheduled"
                  ? "תזמון תזכורת"
                  : "שליחת תזכורת"}
              </div>

              <div className="mt-1 text-sm text-white/80">
                {sendTiming === "scheduled"
                  ? "ההודעה תיכנס לתור ותישלח בזמן שבחרת."
                  : "ההודעה תישלח מיד לכל הנמענים שנבחרו."}
              </div>
            </div>

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
                guestsToSend.length === 0 ||
                (sendTiming === "scheduled" && !scheduledAt)
              }
            >
              {reminderAlreadySent
                ? "✅ תזכורת נשלחה"
                : sendTiming === "scheduled"
                ? "⏱️ תזמן תזכורת"
                : `📩 שלח תזכורת (${guestsToSend.length})`}
            </SendButton>

            {(reminderAlreadySent && reminderLocked) && (
              <div className="mt-3 rounded-2xl bg-white/15 px-4 py-3 text-sm text-white">
                התזכורת כבר נשלחה ולכן השליחה נעולה.
              </div>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => toggleMessageLock(reminderLocked)}
                className={`
                  mt-4 w-full rounded-[20px] px-5 py-3
                  text-sm font-black text-white shadow-sm transition
                  ${
                    reminderLocked
                      ? "bg-orange-500 hover:bg-orange-600"
                      : "bg-green-600 hover:bg-green-700"
                  }
                `}
              >
                {reminderLocked
                  ? "🔓 פתח תזכורת"
                  : "🔒 סגור תזכורת"}
              </button>
            )}
          </div>

          {/* SCHEDULED */}
          {scheduledMessages.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                await loadScheduledMessages();
                setShowScheduled(true);
              }}
              className="
                w-full
                rounded-[24px]
                border border-[#E2CFB5]
                bg-white
                px-6 py-4
                text-sm font-black
                text-[#6B5138]
                shadow-sm
                transition
                hover:bg-[#FFF8EA]
                hover:shadow-md
              "
            >
              📅 צפייה בהודעות מתוזמנות
            </button>
          )}
        </div>
      </section>

      {/* MODAL */}
      {showScheduled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div
            className="
              relative
              max-h-[85vh]
              w-[95%]
              max-w-[950px]
              overflow-y-auto
              rounded-[30px]
              border border-[#E7DCCB]
              bg-[#FFF9EF]
              p-6
              shadow-2xl
            "
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[#3E2D20]">
                  📅 הודעות מתוזמנות
                </h2>
                <p className="mt-1 text-sm text-[#7A6246]">
                  כאן אפשר לראות, לערוך או לבטל הודעות שתוזמנו.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowScheduled(false)}
                className="
                  flex h-10 w-10 items-center justify-center
                  rounded-full
                  bg-white
                  text-lg font-black
                  text-[#6B5138]
                  shadow-sm
                  hover:bg-[#F6EBD9]
                "
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

/* ================= UI HELPERS ================= */

function StatCard({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: string;
}) {
  return (
    <div
      className="
        rounded-[22px]
        border border-[#E2CFB5]
        bg-white/65
        px-4 py-4
        shadow-sm
      "
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xl font-black text-[#3E2D20]">
          {value}
        </span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="mt-2 text-xs font-bold text-[#7A6246]">
        {label}
      </div>
    </div>
  );
}

function ReminderSendCard({
  active,
  title,
  badge,
  subtitle,
  channel,
  status,
  onClick,
}: {
  active: boolean;
  title: string;
  badge: string;
  subtitle: string;
  channel: string;
  status: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group text-right
        rounded-[28px]
        border
        p-5
        shadow-sm
        transition-all
        hover:-translate-y-0.5
        hover:shadow-lg
        ${
          active
            ? "border-[#B9862F] bg-gradient-to-br from-[#CDAA55] to-[#8D5A1C] text-white"
            : "border-[#E2CFB5] bg-[#FFF9EF] text-[#3E2D20]"
        }
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className={`
              mb-2 inline-flex h-8 min-w-8 items-center justify-center
              rounded-full px-3 text-sm font-black
              ${
                active
                  ? "bg-white text-[#8D5A1C]"
                  : "bg-[#F3E6D2] text-[#8A642B]"
              }
            `}
          >
            {badge}
          </div>

          <h3 className="text-lg font-black">{title}</h3>
          <p
            className={`mt-1 text-xs leading-6 ${
              active ? "text-white/80" : "text-[#7A6246]"
            }`}
          >
            {subtitle}
          </p>
        </div>

        <div
          className={`rounded-full px-3 py-1 text-xs font-black ${
            active
              ? "bg-white/20 text-white"
              : "bg-white text-[#8A642B]"
          }`}
        >
          {channel}
        </div>
      </div>

      <div
        className={`mt-5 rounded-full px-4 py-2 text-center text-xs font-black ${
          active
            ? "bg-white/15 text-white"
            : "bg-[#E8F7EA] text-green-700"
        }`}
      >
        {status}
      </div>
    </button>
  );
}

function GlassPanel({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        rounded-[30px]
        border border-[#E7DCCB]
        bg-[#FFF9EF]/90
        p-5 sm:p-6
        shadow-[0_14px_40px_rgba(95,68,34,0.08)]
      "
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-[#3E2D20]">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1 text-sm leading-6 text-[#7A6246]">
              {subtitle}
            </p>
          )}
        </div>

        {icon && (
          <div
            className="
              flex h-12 w-12 shrink-0 items-center justify-center
              rounded-[18px]
              bg-gradient-to-br from-white to-[#EBD8B6]
              text-xl
              shadow-sm
            "
          >
            {icon}
          </div>
        )}
      </div>

      {children}
    </div>
  );
}

function SelectableBox({
  active,
  muted,
  children,
}: {
  active: boolean;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`
        rounded-[24px]
        border
        p-5
        transition
        ${
          active
            ? "border-[#C79B45] bg-[#FFF2D8] shadow-sm"
            : "border-[#E4D3BB] bg-white/70"
        }
        ${muted ? "opacity-60" : ""}
      `}
    >
      {children}
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-[18px] bg-white/80 px-3 py-3 shadow-sm">
      <div className="text-lg font-black text-[#3E2D20]">
        {value}
      </div>
      <div className="mt-1 text-[11px] font-bold text-[#7A6246]">
        {label}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div
      className="
        rounded-[24px]
        border border-dashed border-[#D8C2A4]
        bg-white/50
        px-5 py-10
        text-center
      "
    >
      <div className="text-lg font-black text-[#3E2D20]">
        {title}
      </div>
      <div className="mt-2 text-sm text-[#7A6246]">
        {text}
      </div>
    </div>
  );
}

function timingButtonClass(active: boolean) {
  return `
    flex min-h-[125px] flex-col items-start gap-2
    rounded-[24px]
    border
    p-5
    text-right
    transition
    ${
      active
        ? "border-[#C79B45] bg-[#FFF2D8] shadow-sm"
        : "border-[#E4D3BB] bg-white/70 hover:bg-white"
    }
  `;
}

const inputClassName = `
  w-full
  rounded-[20px]
  border border-[#E4D3BB]
  bg-white
  px-4 py-3
  text-sm
  outline-none
  transition
  focus:border-[#C79B45]
  focus:ring-4
  focus:ring-[#E8C878]/20
`;