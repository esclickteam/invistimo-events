"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import AudienceFilterSelector from "../shared/AudienceFilterSelector";
import SendButton from "../shared/SendButton";
import WhatsappTemplatePreview from "../shared/WhatsappTemplatePreview";
import { useAuth } from "@/context/AuthContext";

/* ================= TYPES ================= */

type Guest = {
  _id: string;
  name: string;
  phone: string;
  rsvp?: "yes" | "no" | "pending";
};

type Props = {
  invitationId: string;
  invitationTitle: string;
  eventDate: string;
  eventLocation: string;
  headerImageUrl?: string;
};

type GiftOptions = {
  creditEnabled: boolean;
  creditUrl: string;
  payboxEnabled: boolean;
  payboxUrl: string;
};

type SendTiming = "now" | "scheduled";
type HalfType = "first" | "second" | null;
type RoundNumber = 1 | 2;

/* ================= CONSTANTS ================= */

const RSVP_ROUND1_TEMPLATE = "rsvp_invitation_media";
const RSVP_ROUND2_TEMPLATE = "rsvp_reminder_invistimo";

/* ================= HELPERS ================= */

function getRsvpPreviewText({
  invitationTitle,
  eventDate,
  eventLocation,
}: {
  invitationTitle: string;
  eventDate: string;
  eventLocation: string;
}) {
  return `משפחה וחברים יקרים,
הנכם מוזמנים ל־${invitationTitle} 🤍

📅 תאריך: ${eventDate}
📍 מיקום: ${eventLocation}

לאישור הגעה לחצו על הכפתור למטה 👇

מחכים לשמוח איתכם 💖`;
}

function getRsvpReminderPreviewText(invitationTitle: string) {
  return `משפחה וחברים יקרים,

תזכורת קצרה לאישור הגעה ל־${invitationTitle} 💜

לאישור הגעה לחצו על הכפתור למטה 👇

מחכים לשמוח איתכם 💖`;
}

function normalizeGiftOptions(raw: any): GiftOptions {
  const g = raw ?? {};

  return {
    creditEnabled: !!g.creditEnabled,
    creditUrl: String(g.creditUrl ?? ""),
    payboxEnabled: !!g.payboxEnabled,
    payboxUrl: String(g.payboxUrl ?? ""),
  };
}

function splitByHalf<T>(list: T[], half: HalfType) {
  if (!half) return list;

  const mid = Math.ceil(list.length / 2);

  if (half === "first") {
    return list.slice(0, mid);
  }

  return list.slice(mid);
}

function formatScheduleDate(value: any) {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return `${d.toLocaleDateString("he-IL")} בשעה ${d.toLocaleTimeString(
    "he-IL",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  )}`;
}

/* ================= COMPONENT ================= */

export default function RsvpTab({
  invitationId,
  invitationTitle,
  eventDate,
  eventLocation,
  headerImageUrl,
}: Props) {
  const { user } = useAuth();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  const [round, setRound] = useState<RoundNumber>(1);
  const [half, setHalf] = useState<HalfType>(null);

  const [sendTiming, setSendTiming] = useState<SendTiming>("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

  const [existingSchedule, setExistingSchedule] = useState<any | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [round1SentAt, setRound1SentAt] = useState<Date | null>(null);
  const [round2SentAt, setRound2SentAt] = useState<Date | null>(null);

  const [round1Locked, setRound1Locked] = useState(true);
  const [round2Locked, setRound2Locked] = useState(true);

  const [eventData, setEventData] = useState<{
    title: string;
    date: string;
    location: string;
  } | null>(null);

  const [waStats, setWaStats] = useState<{
    total: number;
    delivered: number;
    pending: number;
    failed: number;
  } | null>(null);

  const [giftOptions, setGiftOptions] = useState<GiftOptions>({
    creditEnabled: false,
    creditUrl: "",
    payboxEnabled: false,
    payboxUrl: "",
  });

  const [savingGift, setSavingGift] = useState(false);
  const [giftSaveError, setGiftSaveError] = useState<string>("");

  const giftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInitGift = useRef(false);

  /* ================= SCHEDULE DATE BUILD ================= */

  useEffect(() => {
    if (sendTiming !== "scheduled" || !scheduledDate || !scheduledTime) {
      setScheduledAt(null);
      return;
    }

    const [year, month, day] = scheduledDate.split("-").map(Number);
    const [hour, minute] = scheduledTime.split(":").map(Number);

    setScheduledAt(new Date(year, month - 1, day, hour, minute, 0, 0));
  }, [sendTiming, scheduledDate, scheduledTime]);

  /* ================= LOAD WHATSAPP STATS ================= */

  async function loadWhatsappStats() {
    try {
      const res = await fetch(
        `/api/whatsapp/stats?invitationId=${invitationId}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (data?.success) {
        setWaStats({
          total: data.total,
          delivered: data.delivered,
          pending: data.pending,
          failed: data.failed,
        });
      }
    } catch (e) {
      console.error("❌ Failed to load WhatsApp stats", e);
    }
  }

  useEffect(() => {
    if (!round1SentAt && !round2SentAt) return;

    loadWhatsappStats();

    const interval = setInterval(() => {
      loadWhatsappStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [round1SentAt, round2SentAt, invitationId]);

  /* ================= CANCEL SCHEDULE ================= */

  async function handleCancelSchedule() {
    if (!existingSchedule?._id) return;

    const ok = confirm("לבטל את התזמון?");
    if (!ok) return;

    setCancelLoading(true);

    try {
      const res = await fetch("/api/scheduled/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: existingSchedule._id,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setExistingSchedule(null);
      setScheduledDate("");
      setScheduledTime("");
      setScheduledAt(null);
      setSendTiming("now");
    } catch (err: any) {
      alert(err.message || "שגיאה בביטול התזמון");
    } finally {
      setCancelLoading(false);
    }
  }

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    async function loadData() {
      if (!invitationId) return;

      try {
        setLoading(true);

        const [guestsRes, invitationRes] = await Promise.all([
          fetch(`/api/guests?invitation=${invitationId}`, {
            cache: "no-store",
          }),
          fetch(`/api/invitations/${invitationId}`, {
            cache: "no-store",
          }),
        ]);

        const scheduleRes = await fetch(
          `/api/scheduled/by-invitation?invitationId=${invitationId}&type=rsvp&round=${round}`,
          { cache: "no-store" }
        );

        const scheduleData = await scheduleRes.json();

        if (scheduleData?.schedule) {
          setExistingSchedule(scheduleData.schedule);

          if (scheduleData.schedule.scheduledAt) {
            const d = new Date(scheduleData.schedule.scheduledAt);

            setScheduledDate(d.toISOString().slice(0, 10));
            setScheduledTime(d.toISOString().slice(11, 16));
            setSendTiming("scheduled");
          }
        } else {
          setExistingSchedule(null);
          setScheduledDate("");
          setScheduledTime("");
          setScheduledAt(null);
          setSendTiming("now");
        }

        const guestsData = await guestsRes.json();
        const invitationData = await invitationRes.json();

        if (Array.isArray(guestsData.guests)) {
          setGuests(guestsData.guests);
        }

        const inv = invitationData?.invitation;

        const round1 =
          inv?.rsvpRound1SentAt ||
          inv?.rsvpSmsRound1SentAt ||
          inv?.rsvpSmsRound1ScheduledAt ||
          inv?.rsvpWhatsappRound1ScheduledAt;

        const round2 =
          inv?.rsvpRound2SentAt ||
          inv?.rsvpSmsRound2SentAt ||
          inv?.rsvpSmsRound2ScheduledAt ||
          inv?.rsvpWhatsappRound2ScheduledAt;

        setRound1SentAt(round1 ? new Date(round1) : null);
        setRound2SentAt(round2 ? new Date(round2) : null);

        setRound1Locked(inv?.messageLocks?.rsvpWhatsappRound1 ?? true);
        setRound2Locked(inv?.messageLocks?.rsvpWhatsappRound2 ?? true);

        setGiftOptions(normalizeGiftOptions(inv?.giftOptions));
        didInitGift.current = true;

        if (inv) {
          setEventData({
            title: inv.title ?? invitationTitle,
            date: inv.eventDate
              ? new Date(inv.eventDate).toLocaleDateString("he-IL")
              : eventDate,
            location: inv.location?.address ?? eventLocation,
          });
        }
      } catch (err) {
        console.error("❌ Failed to load RSVP data", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [invitationId, invitationTitle, eventDate, eventLocation, round]);

  /* ================= SAVE GIFT OPTIONS ================= */

  useEffect(() => {
    if (!didInitGift.current || !invitationId) return;

    if (giftSaveTimer.current) clearTimeout(giftSaveTimer.current);

    giftSaveTimer.current = setTimeout(async () => {
      try {
        setSavingGift(true);
        setGiftSaveError("");

        const payload: GiftOptions = {
          creditEnabled: !!giftOptions.creditEnabled,
          creditUrl: giftOptions.creditEnabled
            ? giftOptions.creditUrl.trim()
            : "",
          payboxEnabled: !!giftOptions.payboxEnabled,
          payboxUrl: giftOptions.payboxEnabled
            ? giftOptions.payboxUrl.trim()
            : "",
        };

        const res = await fetch(`/api/invitations/${invitationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ giftOptions: payload }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "FAILED_TO_SAVE_GIFT_OPTIONS");
        }
      } catch (e: any) {
        console.error("❌ Failed to save giftOptions", e);
        setGiftSaveError("לא הצלחנו לשמור את הגדרות המתנה. נסי שוב.");
      } finally {
        setSavingGift(false);
      }
    }, 500);

    return () => {
      if (giftSaveTimer.current) clearTimeout(giftSaveTimer.current);
    };
  }, [giftOptions, invitationId]);

  /* ================= ADMIN LOCK ================= */

  async function toggleMessageLock(key: string, current: boolean) {
    try {
      const res = await fetch("/api/admin/toggle-message-lock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitationId,
          key,
          value: !current,
        }),
      });

      if (!res.ok) {
        throw new Error("FAILED");
      }

      if (key === "rsvpWhatsappRound1") {
        setRound1Locked(!current);
      }

      if (key === "rsvpWhatsappRound2") {
        setRound2Locked(!current);
      }
    } catch (err) {
      console.error(err);
      alert("שגיאה בעדכון הסבב");
    }
  }

  /* ================= DERIVED ================= */

  const baseGuests = useMemo(() => {
    return round === 1
      ? guests
      : guests.filter((g) => g.rsvp === "pending");
  }, [guests, round]);

  const sortedGuests = useMemo(() => {
    return [...baseGuests].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "he")
    );
  }, [baseGuests]);

  const guestsToSend = useMemo(() => {
    return splitByHalf(sortedGuests, half);
  }, [sortedGuests, half]);

  const mid = Math.ceil(sortedGuests.length / 2);
  const firstHalfCount = sortedGuests.slice(0, mid).length;
  const secondHalfCount = sortedGuests.slice(mid).length;

  const totalCount = guests.length;
  const pendingCount = guests.filter((g) => g.rsvp === "pending").length;
  const yesCount = guests.filter((g) => g.rsvp === "yes").length;
  const noCount = guests.filter((g) => g.rsvp === "no").length;

  const noAudience = guestsToSend.length === 0;
  const missingHeaderImage = !headerImageUrl;

  const currentRoundSentAt = round === 1 ? round1SentAt : round2SentAt;
  const currentRoundLocked = round === 1 ? round1Locked : round2Locked;

  const hasExistingScheduled =
    existingSchedule?.status === "scheduled" &&
    existingSchedule?.scheduledAt &&
    !isNaN(new Date(existingSchedule.scheduledAt).getTime());

  const blocked =
    loading ||
    noAudience ||
    missingHeaderImage ||
    (sendTiming === "scheduled" && !scheduledAt) ||
    hasExistingScheduled ||
    !!currentRoundSentAt;

  const previewText = useMemo(() => {
    if (!eventData) return "";

    if (round === 1) {
      return getRsvpPreviewText({
        invitationTitle: eventData.title,
        eventDate: eventData.date,
        eventLocation: eventData.location,
      });
    }

    return getRsvpReminderPreviewText(eventData.title);
  }, [eventData, round]);

  const templateName =
    round === 1 ? RSVP_ROUND1_TEMPLATE : RSVP_ROUND2_TEMPLATE;

  const mainButtonText = currentRoundSentAt
    ? "⏳ תהליך שליחה החל"
    : sendTiming === "scheduled"
    ? `📅 תזמן אישור הגעה – סבב ${round}`
    : `📲 שלח עכשיו – סבב ${round}`;

  const selectedAudienceLabel =
    round === 1 ? "כל המוזמנים" : "מי שטרם אישר";

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-[520px] flex items-center justify-center bg-[#FBFAF8]"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-gray-500">
            טוען אורחים ונתוני שליחה...
          </p>
        </div>
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div
      dir="rtl"
      className="
        relative
        overflow-hidden
        bg-[#FBFAF8]
      "
    >
      {/* Decorative background */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-[#E9D6A7]/40 blur-3xl" />

      <div className="relative p-5 md:p-8 space-y-7">
        {/* Top hero */}
        <section
          className="
            rounded-[32px]
            border
            border-white
            bg-white/85
            shadow-[0_24px_70px_rgba(31,41,55,0.08)]
            p-5
            md:p-6
            backdrop-blur
          "
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                <span>✅</span>
                <span>אישור הגעה</span>
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-[#1F2937]">
                ניהול סבבי אישורי הגעה
              </h2>

              <p className="text-sm md:text-base text-gray-500 leading-7">
                בחרי סבב, הגדירי קהל יעד, תזמון וקישורי מתנה — והמערכת תשלח
                בדיוק לפי ההגדרות הקיימות שלך.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 min-w-full lg:min-w-[420px]">
              <StatCard label="סה״כ מוזמנים" value={totalCount} icon="👥" />
              <StatCard label="טרם אישרו" value={pendingCount} icon="⏳" />
              <StatCard label="אישרו הגעה" value={yesCount} icon="💙" />
            </div>
          </div>
        </section>

        {/* Round selector */}
        <section
          className="
            rounded-[28px]
            bg-white
            border
            border-[#EEE8DD]
            shadow-[0_18px_50px_rgba(31,41,55,0.06)]
            p-3
          "
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RoundButton
              roundNumber={1}
              title="סבב 1"
              subtitle="נשלח לכל המוזמנים"
              active={round === 1}
              sentAt={round1SentAt}
              count={totalCount}
              onClick={() => {
                setRound(1);
                setHalf(null);
              }}
            />

            <RoundButton
              roundNumber={2}
              title="סבב 2"
              subtitle="נשלח רק למי שטרם אישר"
              active={round === 2}
              sentAt={round2SentAt}
              count={pendingCount}
              onClick={() => {
                setRound(2);
                setHalf(null);
              }}
            />
          </div>
        </section>

        {/* Main layout */}
        <section className="grid grid-cols-1 xl:grid-cols-[1.08fr_0.92fr] gap-7 items-start">
          {/* Form side */}
          <div className="space-y-5">
            {/* Audience */}
            <PremiumCard
              icon="👥"
              title="קהל יעד"
              subtitle={`סבב ${round} מיועד ל־${selectedAudienceLabel}`}
            >
              <AudienceFilterSelector
                value={round === 1 ? "all" : "pending"}
                onChange={() => {}}
                totalCount={totalCount}
                pendingCount={pendingCount}
                readOnly
              />

              <div className="mt-4 rounded-2xl border border-[#E9EDF5] bg-[#F8FAFC] p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-black text-[#1F2937]">
                      📊 שליחה לפי חצי רשימה
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      לא חובה לפצל. החצי נקבע לפי סדר אלפביתי של הרשימה.
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700 border border-blue-100">
                    {guestsToSend.length} נמענים
                  </span>
                </div>

                <select
                  value={half ?? ""}
                  onChange={(e) =>
                    setHalf(
                      e.target.value === ""
                        ? null
                        : (e.target.value as HalfType)
                    )
                  }
                  className="
                    w-full
                    rounded-2xl
                    border
                    border-[#DDE3EE]
                    bg-white
                    px-4
                    py-3.5
                    text-sm
                    font-bold
                    text-[#1F2937]
                    outline-none
                    transition
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-100
                  "
                >
                  <option value="">
                    כולם ללא פיצול – {sortedGuests.length}
                  </option>

                  <option value="first">
                    חצי ראשון של הרשימה – {firstHalfCount}
                  </option>

                  <option value="second">
                    חצי שני של הרשימה – {secondHalfCount}
                  </option>
                </select>
              </div>
            </PremiumCard>

            {/* Gift options */}
            <PremiumCard
              icon="🎁"
              title="קישור למתנה"
              subtitle="הקישורים נשמרים בהזמנה ומתעדכנים בדף האישי"
              rightSlot={
                <span
                  className={`
                    rounded-full
                    px-3
                    py-1
                    text-xs
                    font-black
                    ${
                      savingGift
                        ? "bg-yellow-50 text-yellow-700"
                        : giftSaveError
                        ? "bg-red-50 text-red-600"
                        : "bg-green-50 text-green-700"
                    }
                  `}
                >
                  {savingGift ? "שומר..." : giftSaveError ? "שגיאה" : "נשמר"}
                </span>
              }
            >
              {giftSaveError && (
                <div className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                  {giftSaveError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <GiftOptionCard
                  icon="💳"
                  title="מתנה באשראי"
                  checked={giftOptions.creditEnabled}
                  onCheckedChange={(checked) =>
                    setGiftOptions((p) => ({
                      ...p,
                      creditEnabled: checked,
                      creditUrl: checked ? p.creditUrl : "",
                    }))
                  }
                >
                  {giftOptions.creditEnabled && (
                    <input
                      value={giftOptions.creditUrl}
                      onChange={(e) =>
                        setGiftOptions((p) => ({
                          ...p,
                          creditUrl: e.target.value,
                        }))
                      }
                      placeholder="הדביקי כאן קישור לתשלום באשראי"
                      className="
                        w-full
                        rounded-2xl
                        border
                        border-[#DDE3EE]
                        bg-white
                        px-4
                        py-3
                        text-sm
                        outline-none
                        focus:border-blue-500
                        focus:ring-4
                        focus:ring-blue-100
                      "
                      dir="ltr"
                      inputMode="url"
                    />
                  )}
                </GiftOptionCard>

                <GiftOptionCard
                  icon="💰"
                  title="מתנה ב-PayBox"
                  checked={giftOptions.payboxEnabled}
                  onCheckedChange={(checked) =>
                    setGiftOptions((p) => ({
                      ...p,
                      payboxEnabled: checked,
                      payboxUrl: checked ? p.payboxUrl : "",
                    }))
                  }
                >
                  {giftOptions.payboxEnabled && (
                    <input
                      value={giftOptions.payboxUrl}
                      onChange={(e) =>
                        setGiftOptions((p) => ({
                          ...p,
                          payboxUrl: e.target.value,
                        }))
                      }
                      placeholder="הדביקי כאן קישור ל-PayBox"
                      className="
                        w-full
                        rounded-2xl
                        border
                        border-[#DDE3EE]
                        bg-white
                        px-4
                        py-3
                        text-sm
                        outline-none
                        focus:border-blue-500
                        focus:ring-4
                        focus:ring-blue-100
                      "
                      dir="ltr"
                      inputMode="url"
                    />
                  )}
                </GiftOptionCard>
              </div>
            </PremiumCard>

            {/* Timing */}
            <PremiumCard
              icon="⏱️"
              title="מועד שליחה"
              subtitle="שליחה מיידית או תזמון מראש"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TimingOption
                  title="שליחה מיידית"
                  subtitle="ההודעה תישלח עכשיו לפי הסבב שנבחר"
                  icon="🚀"
                  active={sendTiming === "now"}
                  onClick={() => {
                    setSendTiming("now");
                    setScheduledDate("");
                    setScheduledTime("");
                    setScheduledAt(null);
                  }}
                />

                <TimingOption
                  title="שליחה מתוזמנת"
                  subtitle="קבעי תאריך ושעה לשליחה אוטומטית"
                  icon="📅"
                  active={sendTiming === "scheduled"}
                  onClick={() => setSendTiming("scheduled")}
                />
              </div>

              {sendTiming === "scheduled" && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="
                      rounded-2xl
                      border
                      border-[#DDE3EE]
                      bg-white
                      px-4
                      py-3.5
                      text-sm
                      font-bold
                      outline-none
                      focus:border-blue-500
                      focus:ring-4
                      focus:ring-blue-100
                    "
                  />

                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="
                      rounded-2xl
                      border
                      border-[#DDE3EE]
                      bg-white
                      px-4
                      py-3.5
                      text-sm
                      font-bold
                      outline-none
                      focus:border-blue-500
                      focus:ring-4
                      focus:ring-blue-100
                    "
                  />
                </div>
              )}

              {hasExistingScheduled && (
                <div
                  className="
                    mt-4
                    rounded-2xl
                    border
                    border-blue-100
                    bg-blue-50
                    p-4
                    space-y-3
                  "
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-blue-800">
                        ההודעה מתוזמנת
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        {formatScheduleDate(existingSchedule.scheduledAt)}
                      </p>
                    </div>

                    <span className="text-2xl">📌</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelSchedule}
                    disabled={cancelLoading}
                    className="
                      w-full
                      rounded-2xl
                      bg-red-500
                      px-5
                      py-3
                      text-sm
                      font-black
                      text-white
                      shadow-[0_12px_26px_rgba(239,68,68,0.24)]
                      transition
                      hover:bg-red-600
                      disabled:opacity-60
                    "
                  >
                    {cancelLoading ? "מבטל..." : "❌ בטל תזמון"}
                  </button>
                </div>
              )}
            </PremiumCard>

            {/* CTA */}
            <div
              className="
                rounded-[28px]
                bg-white
                border
                border-[#EEE8DD]
                shadow-[0_20px_60px_rgba(31,41,55,0.08)]
                p-4
                space-y-3
              "
            >
              {missingHeaderImage && (
                <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">
                  חסרה תמונת Header להזמנת WhatsApp. צריך להעלות תמונה לפני שליחה.
                </div>
              )}

              {noAudience && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                  אין נמענים לשליחה בסבב זה.
                </div>
              )}

              {currentRoundSentAt && (
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-bold text-gray-600">
                  סבב {round} כבר התחיל בתהליך שליחה.
                </div>
              )}

              <SendButton
                key={`${invitationId}-${templateName}-${
                  round === 1
                    ? round1SentAt?.toISOString() ?? "null"
                    : round2SentAt?.toISOString() ?? "null"
                }`}
                channel="whatsapp"
                type="rsvp"
                invitationId={invitationId}
                templateName={templateName}
                audience={guestsToSend.map((g) => g._id)}
                scheduledAt={scheduledAt}
                disabled={blocked}
              >
                {mainButtonText}
              </SendButton>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 px-1">
                <span>נמענים לשליחה: {guestsToSend.length}</span>
                <span>סטטוס: {sendTiming === "now" ? "מיידי" : "מתוזמן"}</span>
              </div>

              {(user?.role === "admin" || (user as any)?.impersonatedByAdmin) && (
                <button
                  type="button"
                  onClick={() =>
                    toggleMessageLock(
                      round === 1
                        ? "rsvpWhatsappRound1"
                        : "rsvpWhatsappRound2",
                      currentRoundLocked
                    )
                  }
                  className={`
                    w-full
                    rounded-2xl
                    px-5
                    py-3
                    text-sm
                    font-black
                    text-white
                    transition
                    ${
                      currentRoundLocked
                        ? "bg-orange-500 hover:bg-orange-600"
                        : "bg-green-600 hover:bg-green-700"
                    }
                  `}
                >
                  {currentRoundLocked ? "🔓 פתח סבב" : "🔒 סגור סבב"}
                </button>
              )}
            </div>
          </div>

          {/* Preview side */}
          <aside className="space-y-5 xl:sticky xl:top-6">
            <PremiumCard
              icon="✨"
              title="תצוגה מקדימה"
              subtitle="כך ההודעה תיראה לפני השליחה"
            >
              <div
                className="
                  rounded-[30px]
                  bg-gradient-to-b
                  from-[#F8FAFF]
                  to-[#F6F1E8]
                  border
                  border-[#EEE8DD]
                  p-3
                  md:p-5
                "
              >
                <WhatsappTemplatePreview
                  templateKey={templateName}
                  previewText={previewText}
                  headerImageUrl={headerImageUrl}
                />
              </div>
            </PremiumCard>

            {waStats && (
              <PremiumCard
                icon="📡"
                title="סטטוס שליחה"
                subtitle="נתוני WhatsApp מתעדכנים אוטומטית"
              >
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="סה״כ" value={waStats.total} />
                  <MiniStat label="נמסרו" value={waStats.delivered} />
                  <MiniStat label="בתהליך" value={waStats.pending} />
                  <MiniStat label="נכשלו" value={waStats.failed} danger />
                </div>
              </PremiumCard>
            )}

            <PremiumCard
              icon="🛡️"
              title="בדיקת שליחה"
              subtitle="סיכום מהיר לפני שליחה"
            >
              <div className="space-y-3 text-sm">
                <SummaryRow label="סבב נבחר" value={`סבב ${round}`} />
                <SummaryRow label="קהל יעד" value={selectedAudienceLabel} />
                <SummaryRow
                  label="מספר נמענים"
                  value={`${guestsToSend.length}`}
                />
                <SummaryRow
                  label="מועד"
                  value={sendTiming === "now" ? "שליחה מיידית" : "מתוזמן"}
                />
                <SummaryRow
                  label="לא אישרו"
                  value={`${pendingCount}`}
                />
                <SummaryRow
                  label="לא מגיעים"
                  value={`${noCount}`}
                />
              </div>
            </PremiumCard>
          </aside>
        </section>
      </div>
    </div>
  );
}

/* ================= SMALL UI COMPONENTS ================= */

function PremiumCard({
  icon,
  title,
  subtitle,
  rightSlot,
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="
        rounded-[28px]
        bg-white
        border
        border-[#EEE8DD]
        shadow-[0_18px_50px_rgba(31,41,55,0.06)]
        p-5
      "
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-2xl
              bg-gradient-to-br
              from-blue-50
              to-[#F6EBC8]
              text-xl
              shadow-inner
            "
          >
            {icon}
          </div>

          <div>
            <h3 className="text-lg font-black text-[#1F2937]">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1 leading-6">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {rightSlot}
      </div>

      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div
      className="
        rounded-3xl
        bg-gradient-to-b
        from-white
        to-[#F8FAFC]
        border
        border-[#EEF2F7]
        p-4
        shadow-[0_12px_30px_rgba(31,41,55,0.05)]
      "
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-black text-[#1F2937]">{value}</span>
      </div>

      <p className="mt-2 text-xs font-bold text-gray-500">{label}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div
      className={`
        rounded-2xl
        border
        p-4
        ${
          danger
            ? "bg-red-50 border-red-100 text-red-700"
            : "bg-[#F8FAFC] border-[#E8EEF7] text-[#1F2937]"
        }
      `}
    >
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-xs font-bold opacity-75">{label}</div>
    </div>
  );
}

function RoundButton({
  roundNumber,
  title,
  subtitle,
  active,
  sentAt,
  count,
  onClick,
}: {
  roundNumber: number;
  title: string;
  subtitle: string;
  active: boolean;
  sentAt: Date | null;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group
        relative
        overflow-hidden
        rounded-[24px]
        border
        p-5
        text-right
        transition-all
        duration-200
        ${
          active
            ? "border-blue-500 bg-gradient-to-l from-blue-600 to-blue-700 text-white shadow-[0_18px_36px_rgba(37,99,235,0.26)]"
            : "border-[#E5E7EB] bg-[#F8FAFC] text-[#1F2937] hover:bg-white hover:shadow-[0_14px_30px_rgba(31,41,55,0.08)]"
        }
      `}
    >
      <div className="relative flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-full
                text-sm
                font-black
                ${
                  active
                    ? "bg-white text-blue-700"
                    : "bg-blue-50 text-blue-700"
                }
              `}
            >
              {roundNumber}
            </span>

            <span className="text-lg font-black">{title}</span>
          </div>

          <p
            className={`text-sm ${
              active ? "text-blue-50" : "text-gray-500"
            }`}
          >
            {subtitle}
          </p>
        </div>

        <div className="text-left">
          <div className="text-2xl font-black">{count}</div>
          <div className={`text-xs ${active ? "text-blue-50" : "text-gray-500"}`}>
            נמענים
          </div>
        </div>
      </div>

      {sentAt && (
        <div
          className={`
            relative
            mt-4
            rounded-2xl
            px-3
            py-2
            text-xs
            font-bold
            ${
              active
                ? "bg-white/15 text-white"
                : "bg-green-50 text-green-700"
            }
          `}
        >
          נשלח / תהליך החל: {formatScheduleDate(sentAt)}
        </div>
      )}
    </button>
  );
}

function GiftOptionCard({
  icon,
  title,
  checked,
  onCheckedChange,
  children,
}: {
  icon: string;
  title: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`
        rounded-3xl
        border
        p-4
        transition
        ${
          checked
            ? "border-blue-300 bg-blue-50/60"
            : "border-[#E5E7EB] bg-[#F8FAFC]"
        }
      `}
    >
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span className="flex items-center gap-2 text-sm font-black text-[#1F2937]">
          <span className="text-lg">{icon}</span>
          {title}
        </span>

        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="h-5 w-5 accent-blue-600"
        />
      </label>

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function TimingOption({
  title,
  subtitle,
  icon,
  active,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        rounded-3xl
        border
        p-4
        text-right
        transition-all
        ${
          active
            ? "border-blue-500 bg-blue-50 shadow-[0_12px_28px_rgba(37,99,235,0.12)]"
            : "border-[#E5E7EB] bg-[#F8FAFC] hover:bg-white"
        }
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-black text-[#1F2937]">
            <span>{icon}</span>
            <span>{title}</span>
          </div>

          <p className="mt-1 text-xs leading-5 text-gray-500">{subtitle}</p>
        </div>

        <span
          className={`
            mt-1
            h-5
            w-5
            rounded-full
            border
            ${
              active
                ? "border-blue-600 bg-blue-600 shadow-[inset_0_0_0_4px_white]"
                : "border-gray-300 bg-white"
            }
          `}
        />
      </div>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#EEF2F7] pb-3 last:border-b-0 last:pb-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-black text-[#1F2937]">{value}</span>
    </div>
  );
}