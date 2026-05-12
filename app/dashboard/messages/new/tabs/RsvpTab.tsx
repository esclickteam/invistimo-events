"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import AudienceFilterSelector from "../shared/AudienceFilterSelector";
import SendButton from "../shared/SendButton";
import WhatsappTemplatePreview from "../shared/WhatsappTemplatePreview";
import TextMessagePreview from "../shared/TextMessagePreview";
import ScheduledMessagesTable from "@/app/components/ScheduledMessagesTable";
import { useAuth } from "@/context/AuthContext";

/* ================= TYPES ================= */

type Guest = {
  _id: string;
  name: string;
  phone: string;
  rsvp?: "yes" | "no" | "pending";
  token?: string;
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

type Channel = "whatsapp" | "sms";
type RoundNumber = 1 | 2 | 3;
type SendTiming = "now" | "scheduled";

/* ================= CONSTANTS ================= */

const RSVP_ROUND1_TEMPLATE = "rsvp_invitation_media";
const RSVP_REMINDER_TEMPLATE = "rsvp_reminder_invistimo";

const RSVP_SMS_TEMPLATES: Record<RoundNumber, string> = {
  1:
    "היי {{name}},\n" +
    "נשמח לדעת אם תגיעו ל־{{invitationTitle}} 🎉\n\n" +
    "לאישור הגעה לחצו כאן:\n" +
    "{{rsvpLink}}\n\n" +
    "מחכים לכם באהבה 💖",

  2:
    "היי {{name}},\n" +
    "תזכורת קצרה לאישור הגעה ל־{{invitationTitle}} 🎉\n\n" +
    "לאישור לחצו כאן:\n" +
    "{{rsvpLink}}\n\n" +
    "מחכים לכם 💖",

  3:
    "היי {{name}},\n" +
    "תזכורת אחרונה לאישור הגעה ל־{{invitationTitle}} 🎉\n\n" +
    "עדיין לא קיבלנו מענה.\n" +
    "לאישור הגעה לחצו כאן:\n" +
    "{{rsvpLink}}\n\n" +
    "נשמח לעדכון 💖",
};

/* ================= HELPERS ================= */

function normalizeGiftOptions(raw: any): GiftOptions {
  const g = raw ?? {};

  return {
    creditEnabled: !!g.creditEnabled,
    creditUrl: String(g.creditUrl ?? ""),
    payboxEnabled: !!g.payboxEnabled,
    payboxUrl: String(g.payboxUrl ?? ""),
  };
}

function ensureHttp(u: string) {
  const s = (u ?? "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

function formatDateTime(value: any) {
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

function getWhatsappTemplateByRound(round: RoundNumber) {
  return round === 1 ? RSVP_ROUND1_TEMPLATE : RSVP_REMINDER_TEMPLATE;
}

function getRoundAudienceLabel(round: RoundNumber) {
  return round === 1 ? "כל המוזמנים" : "מי שטרם אישר";
}

function getRoundSubtitle(round: RoundNumber) {
  if (round === 1) return "נשלח לכל המוזמנים";
  if (round === 2) return "נשלח רק למי שטרם אישר";
  return "תזכורת אחרונה למי שעדיין לא אישר";
}

function getWhatsappPreviewText({
  round,
  invitationTitle,
  eventDate,
  eventLocation,
}: {
  round: RoundNumber;
  invitationTitle: string;
  eventDate: string;
  eventLocation: string;
}) {
  if (round === 1) {
    return `משפחה וחברים יקרים,
הנכם מוזמנים ל־${invitationTitle} 🤍

📅 תאריך: ${eventDate}
📍 מיקום: ${eventLocation}

לאישור הגעה לחצו על הכפתור למטה 👇

מחכים לשמוח איתכם 💖`;
  }

  if (round === 2) {
    return `משפחה וחברים יקרים,

תזכורת קצרה לאישור הגעה ל־${invitationTitle} 💜

לאישור הגעה לחצו על הכפתור למטה 👇

מחכים לשמוח איתכם 💖`;
  }

  return `משפחה וחברים יקרים,

תזכורת אחרונה לאישור הגעה ל־${invitationTitle} ✨

עדיין לא קיבלנו מענה.
לאישור הגעה לחצו על הכפתור למטה 👇

נשמח לעדכון 💖`;
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

  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<Guest[]>([]);

  const [round, setRound] = useState<RoundNumber>(1);

  const [roundChannels, setRoundChannels] = useState<
    Record<RoundNumber, Channel>
  >({
    1: "whatsapp",
    2: "whatsapp",
    3: "whatsapp",
  });

  const selectedChannel = roundChannels[round];

  const [sendTiming, setSendTiming] = useState<SendTiming>("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const [existingSchedule, setExistingSchedule] = useState<any | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [showScheduled, setShowScheduled] = useState(false);

  const [smsMessages, setSmsMessages] = useState<Record<RoundNumber, string>>({
    1: RSVP_SMS_TEMPLATES[1],
    2: RSVP_SMS_TEMPLATES[2],
    3: RSVP_SMS_TEMPLATES[3],
  });

  const [round1Sent, setRound1Sent] = useState(false);
  const [round2Sent, setRound2Sent] = useState(false);
  const [round3Sent, setRound3Sent] = useState(false);

  const [round1Scheduled, setRound1Scheduled] = useState(false);
  const [round2Scheduled, setRound2Scheduled] = useState(false);
  const [round3Scheduled, setRound3Scheduled] = useState(false);

  const [round1Locked, setRound1Locked] = useState(true);
  const [round2Locked, setRound2Locked] = useState(true);
  const [round3Locked, setRound3Locked] = useState(true);

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
  const [giftSaveError, setGiftSaveError] = useState("");

  const giftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInitGift = useRef(false);

  /* ================= SCHEDULED DATE ================= */

  const scheduledAt = useMemo(() => {
    if (sendTiming !== "scheduled" || !scheduledDate || !scheduledTime) {
      return null;
    }

    const [year, month, day] = scheduledDate.split("-").map(Number);
    const [hour, minute] = scheduledTime.split(":").map(Number);

    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }, [sendTiming, scheduledDate, scheduledTime]);

  /* ================= CURRENT ROUND STATE ================= */

  const currentSmsMessage = smsMessages[round];

  const currentRoundSent =
    round === 1 ? round1Sent : round === 2 ? round2Sent : round3Sent;

  const currentRoundScheduled =
    round === 1
      ? round1Scheduled
      : round === 2
      ? round2Scheduled
      : round3Scheduled;

  const currentRoundLocked =
    round === 1
      ? round1Locked
      : round === 2
      ? round2Locked
      : round3Locked;

  const hasExistingSchedule =
    existingSchedule?.status === "scheduled" &&
    existingSchedule?.scheduledAt &&
    !Number.isNaN(new Date(existingSchedule.scheduledAt).getTime());

  /* ================= LOAD SCHEDULED MESSAGES ================= */

  async function loadScheduledMessages() {
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
    } catch {
      setScheduledMessages([]);
    }
  }

  useEffect(() => {
    loadScheduledMessages();
  }, []);

  /* ================= LOAD EXISTING SCHEDULE ================= */

  useEffect(() => {
    async function loadExistingSchedule() {
      if (!invitationId) return;

      try {
        const res = await fetch(
          `/api/scheduled/by-invitation?invitationId=${invitationId}&type=rsvp&round=${round}&channel=${selectedChannel}`,
          { cache: "no-store" }
        );

        const data = await res.json();

        if (data?.schedule) {
          setExistingSchedule(data.schedule);

          if (data.schedule.scheduledAt) {
            const d = new Date(data.schedule.scheduledAt);

            setScheduledDate(d.toISOString().slice(0, 10));
            setScheduledTime(d.toISOString().slice(11, 16));
            setSendTiming("scheduled");
          }
        } else {
          setExistingSchedule(null);
          setScheduledDate("");
          setScheduledTime("");
          setSendTiming("now");
        }
      } catch {
        setExistingSchedule(null);
      }
    }

    loadExistingSchedule();
  }, [invitationId, round, selectedChannel]);

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

        const guestsData = await guestsRes.json();
        const invitationData = await invitationRes.json();

        setGuests(Array.isArray(guestsData?.guests) ? guestsData.guests : []);

        const inv = invitationData?.invitation;

        const r1Sent =
          inv?.rsvpRound1SentAt ||
          inv?.rsvpSmsRound1SentAt ||
          inv?.rsvpWhatsappRound1SentAt;

        const r2Sent =
          inv?.rsvpRound2SentAt ||
          inv?.rsvpSmsRound2SentAt ||
          inv?.rsvpWhatsappRound2SentAt;

        const r3Sent =
          inv?.rsvpRound3SentAt ||
          inv?.rsvpSmsRound3SentAt ||
          inv?.rsvpWhatsappRound3SentAt;

        const r1Scheduled =
          inv?.rsvpSmsRound1ScheduledAt ||
          inv?.rsvpWhatsappRound1ScheduledAt;

        const r2Scheduled =
          inv?.rsvpSmsRound2ScheduledAt ||
          inv?.rsvpWhatsappRound2ScheduledAt;

        const r3Scheduled =
          inv?.rsvpSmsRound3ScheduledAt ||
          inv?.rsvpWhatsappRound3ScheduledAt;

        setRound1Sent(!!r1Sent);
        setRound2Sent(!!r2Sent);
        setRound3Sent(!!r3Sent);

        setRound1Scheduled(!!r1Scheduled);
        setRound2Scheduled(!!r2Scheduled);
        setRound3Scheduled(!!r3Scheduled);

        setRound1Locked(
          selectedChannel === "sms"
            ? inv?.messageLocks?.rsvpSmsRound1 ?? true
            : inv?.messageLocks?.rsvpWhatsappRound1 ?? true
        );

        setRound2Locked(
          selectedChannel === "sms"
            ? inv?.messageLocks?.rsvpSmsRound2 ?? true
            : inv?.messageLocks?.rsvpWhatsappRound2 ?? true
        );

        setRound3Locked(
          selectedChannel === "sms"
            ? inv?.messageLocks?.rsvpSmsRound3 ?? true
            : inv?.messageLocks?.rsvpWhatsappRound3 ?? true
        );

        setGiftOptions(normalizeGiftOptions(inv?.giftOptions));
        didInitGift.current = true;
      } catch (err) {
        console.error("❌ Failed to load RSVP data", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [invitationId, selectedChannel]);

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
            ? ensureHttp(giftOptions.creditUrl)
            : "",
          payboxEnabled: !!giftOptions.payboxEnabled,
          payboxUrl: giftOptions.payboxEnabled
            ? ensureHttp(giftOptions.payboxUrl)
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
      } catch (e) {
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

  /* ================= WHATSAPP STATS ================= */

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
    if (selectedChannel !== "whatsapp") return;
    if (!round1Sent && !round2Sent && !round3Sent) return;

    loadWhatsappStats();

    const interval = setInterval(() => {
      loadWhatsappStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedChannel, round1Sent, round2Sent, round3Sent, invitationId]);

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

      if (!res.ok) throw new Error(data?.error || "FAILED_TO_CANCEL");

      setExistingSchedule(null);
      setScheduledDate("");
      setScheduledTime("");
      setSendTiming("now");

      if (round === 1) setRound1Scheduled(false);
      if (round === 2) setRound2Scheduled(false);
      if (round === 3) setRound3Scheduled(false);

      await loadScheduledMessages();
    } catch (err: any) {
      alert(err.message || "שגיאה בביטול התזמון");
    } finally {
      setCancelLoading(false);
    }
  }

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

      if (!res.ok) throw new Error("FAILED");

      if (key.includes("Round1")) setRound1Locked(!current);
      if (key.includes("Round2")) setRound2Locked(!current);
      if (key.includes("Round3")) setRound3Locked(!current);
    } catch (err) {
      console.error(err);
      alert("שגיאה בעדכון הסבב");
    }
  }

  function getCurrentLockKey() {
    const prefix = selectedChannel === "sms" ? "rsvpSms" : "rsvpWhatsapp";
    return `${prefix}Round${round}`;
  }

  /* ================= DERIVED ================= */

  const totalCount = guests.length;

  const pendingGuests = useMemo(
    () => guests.filter((g) => g.rsvp === "pending"),
    [guests]
  );

  const yesCount = useMemo(
    () => guests.filter((g) => g.rsvp === "yes").length,
    [guests]
  );

  const noCount = useMemo(
    () => guests.filter((g) => g.rsvp === "no").length,
    [guests]
  );

  const guestsToSend = useMemo(() => {
    const base = round === 1 ? guests : pendingGuests;

    return [...base].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "he")
    );
  }, [round, guests, pendingGuests]);

  const noAudience = guestsToSend.length === 0;
  const missingHeaderImage = selectedChannel === "whatsapp" && !headerImageUrl;

  const blocked =
    noAudience ||
    missingHeaderImage ||
    (sendTiming === "scheduled" && !scheduledAt) ||
    (hasExistingSchedule && currentRoundLocked) ||
    ((currentRoundSent || currentRoundScheduled) && currentRoundLocked);

  const whatsappPreviewText = useMemo(() => {
    return getWhatsappPreviewText({
      round,
      invitationTitle,
      eventDate,
      eventLocation,
    });
  }, [round, invitationTitle, eventDate, eventLocation]);

  const smsPreviewText = useMemo(() => {
    const g = guestsToSend[0];

    const fallbackName = "אורח/ת יקר/ה";
    const fallbackToken = "preview-token";

    const rsvpLink = `https://www.invistimo.com/invite/${invitationId}?token=${
      g?.token || fallbackToken
    }`;

    return currentSmsMessage
      .replace(/{{name}}/g, g?.name || fallbackName)
      .replace(/{{invitationTitle}}/g, invitationTitle || "")
      .replace(/{{rsvpLink}}/g, rsvpLink);
  }, [guestsToSend, invitationId, invitationTitle, currentSmsMessage]);

  const templateName = getWhatsappTemplateByRound(round);

  const sendButtonProps: any =
    selectedChannel === "whatsapp"
      ? {
          channel: "whatsapp",
          type: "rsvp",
          invitationId,
          templateName,
          audience: guestsToSend.map((g) => g._id),
          scheduledAt,
          disabled: blocked,
        }
      : {
          channel: "sms",
          type: "rsvp",
          invitationId,
          audience: guestsToSend.map((g) => g._id),
          scheduledAt,
          messageOverride: currentSmsMessage,
          round,
          disabled: blocked,
        };

  const mainButtonText = currentRoundSent
    ? `✔ סבב ${round} כבר נשלח`
    : currentRoundScheduled || hasExistingSchedule
    ? `⏱️ סבב ${round} כבר מתוזמן`
    : sendTiming === "scheduled"
    ? `⏱️ תזמן סבב ${round} ב-${
        selectedChannel === "sms" ? "SMS" : "WhatsApp"
      }`
    : `🚀 שלח עכשיו סבב ${round} ב-${
        selectedChannel === "sms" ? "SMS" : "WhatsApp"
      }`;

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-[520px] flex items-center justify-center bg-[#FBFAF8]"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
          <p className="text-sm font-bold text-gray-500">
            טוען אורחים ונתוני שליחה...
          </p>
        </div>
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div dir="rtl" className="relative overflow-hidden bg-[#FBFAF8]">
      <div className="pointer-events-none absolute -top-28 -right-24 h-96 w-96 rounded-full bg-blue-100/70 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-24 h-96 w-96 rounded-full bg-[#E9D6A7]/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/3 h-80 w-80 rounded-full bg-purple-100/30 blur-3xl" />

      <div className="relative p-5 md:p-8 space-y-7">
        {/* HERO */}
        <section className="rounded-[38px] border border-white bg-white/90 p-5 md:p-7 shadow-[0_28px_80px_rgba(31,41,55,0.09)] backdrop-blur">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                <span>✅</span>
                <span>אישור הגעה</span>
              </div>

              <h2 className="text-2xl md:text-4xl font-black text-[#1F2937] tracking-tight">
                סבבי אישורי הגעה חכמים
              </h2>

              <p className="max-w-2xl text-sm md:text-base leading-7 text-gray-500">
                סבב 1 נשלח לכל המוזמנים. סבב 2 וסבב 3 נשלחים למי שטרם אישר.
                בכל סבב אפשר לבחור מחדש WhatsApp או SMS ולתזמן מראש.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-full xl:min-w-[560px]">
              <StatCard label="סה״כ מוזמנים" value={totalCount} icon="👥" />
              <StatCard
                label="טרם אישרו"
                value={pendingGuests.length}
                icon="⏳"
              />
              <StatCard label="אישרו" value={yesCount} icon="💙" />
              <StatCard label="לא מגיעים" value={noCount} icon="🤍" />
            </div>
          </div>
        </section>

        {/* ROUND SELECTOR */}
        <section className="rounded-[34px] border border-[#EEE8DD] bg-white p-3 shadow-[0_18px_50px_rgba(31,41,55,0.06)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((r) => (
              <RoundButton
                key={r}
                roundNumber={r as RoundNumber}
                active={round === r}
                title={`סבב ${r}`}
                subtitle={getRoundSubtitle(r as RoundNumber)}
                count={r === 1 ? totalCount : pendingGuests.length}
                channel={roundChannels[r as RoundNumber]}
                sent={
                  r === 1
                    ? round1Sent
                    : r === 2
                    ? round2Sent
                    : round3Sent
                }
                scheduled={
                  r === 1
                    ? round1Scheduled
                    : r === 2
                    ? round2Scheduled
                    : round3Scheduled
                }
                onClick={() => {
                  setRound(r as RoundNumber);
                }}
              />
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[0.94fr_1.06fr] gap-7 items-start">
          {/* PREVIEW - now first side */}
          <aside className="space-y-5 xl:sticky xl:top-6">
            <PremiumCard
              icon="✨"
              title="תצוגה מקדימה"
              subtitle={
                selectedChannel === "sms"
                  ? "כך תיראה הודעת ה-SMS"
                  : "כך תיראה הודעת ה-WhatsApp"
              }
            >
              <div className="rounded-[34px] border border-[#EEE8DD] bg-gradient-to-b from-[#F8FAFF] via-white to-[#F6F1E8] p-3 md:p-5 shadow-inner">
                {selectedChannel === "whatsapp" ? (
                  <WhatsappTemplatePreview
                    templateKey={templateName}
                    previewText={whatsappPreviewText}
                    headerImageUrl={headerImageUrl}
                  />
                ) : (
                  <TextMessagePreview channel="sms" text={smsPreviewText} />
                )}
              </div>
            </PremiumCard>

            <PremiumCard
              icon="🛡️"
              title="סיכום לפני שליחה"
              subtitle="בדיקה מהירה לפני אישור הפעולה"
            >
              <div className="space-y-3 text-sm">
                <SummaryRow label="סבב" value={`סבב ${round}`} />
                <SummaryRow
                  label="ערוץ"
                  value={selectedChannel === "sms" ? "SMS" : "WhatsApp"}
                />
                <SummaryRow
                  label="קהל יעד"
                  value={getRoundAudienceLabel(round)}
                />
                <SummaryRow label="נמענים" value={`${guestsToSend.length}`} />
                <SummaryRow
                  label="מועד"
                  value={sendTiming === "now" ? "שליחה מיידית" : "מתוזמן"}
                />
                <SummaryRow
                  label="טרם אישרו"
                  value={`${pendingGuests.length}`}
                />
              </div>
            </PremiumCard>

            {selectedChannel === "whatsapp" && waStats && (
              <PremiumCard
                icon="📡"
                title="סטטוס WhatsApp"
                subtitle="נתונים מתעדכנים אוטומטית"
              >
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="סה״כ" value={waStats.total} />
                  <MiniStat label="נמסרו" value={waStats.delivered} />
                  <MiniStat label="בתהליך" value={waStats.pending} />
                  <MiniStat label="נכשלו" value={waStats.failed} danger />
                </div>
              </PremiumCard>
            )}
          </aside>

          {/* SEND SETTINGS */}
          <div className="space-y-5">
            {/* CHANNEL */}
            <PremiumCard
              icon="📡"
              title={`ערוץ שליחה לסבב ${round}`}
              subtitle="אפשר לבחור מחדש בכל סבב בין WhatsApp ל-SMS"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ChannelOption
                  icon="💬"
                  title="WhatsApp"
                  subtitle="שליחה דרך תבנית WhatsApp Business"
                  active={selectedChannel === "whatsapp"}
                  onClick={() =>
                    setRoundChannels((p) => ({ ...p, [round]: "whatsapp" }))
                  }
                />

                <ChannelOption
                  icon="📩"
                  title="SMS"
                  subtitle="שליחת הודעת טקסט עם קישור אישי"
                  active={selectedChannel === "sms"}
                  onClick={() =>
                    setRoundChannels((p) => ({ ...p, [round]: "sms" }))
                  }
                />
              </div>
            </PremiumCard>

            {/* AUDIENCE */}
            <PremiumCard
              icon="👥"
              title="קהל יעד"
              subtitle={`סבב ${round}: ${getRoundAudienceLabel(round)}`}
            >
              <AudienceFilterSelector
                value={round === 1 ? "all" : "pending"}
                onChange={() => {}}
                totalCount={totalCount}
                pendingCount={pendingGuests.length}
                readOnly
              />

              <div className="mt-4 rounded-3xl border border-blue-100 bg-gradient-to-l from-blue-50 to-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-[#1F2937]">
                      🎯 שליחה אוטומטית לפי הסבב
                    </h3>
                    <p className="mt-1 text-xs leading-6 text-gray-500">
                      אין יותר פיצול רשימה. המערכת קובעת לבד את הקהל לפי הסבב.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-black text-blue-700">
                    {guestsToSend.length} נמענים
                  </span>
                </div>
              </div>
            </PremiumCard>

            {/* SMS EDITOR */}
            {selectedChannel === "sms" && (
              <PremiumCard
                icon="✏️"
                title={`עריכת הודעת SMS - סבב ${round}`}
                subtitle="אפשר לערוך את נוסח ההודעה בלי לשנות את הקישור האישי"
              >
                <textarea
                  value={currentSmsMessage}
                  onChange={(e) =>
                    setSmsMessages((p) => ({
                      ...p,
                      [round]: e.target.value,
                    }))
                  }
                  rows={7}
                  className="w-full rounded-3xl border border-[#DDE3EE] bg-[#F8FAFC] px-4 py-4 text-sm leading-7 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />

                <p className="mt-3 text-xs leading-6 text-gray-500">
                  משתנים אוטומטיים:
                  <span className="mx-1 rounded-lg bg-gray-100 px-2 py-1 font-mono">
                    {"{{name}}"}
                  </span>
                  <span className="mx-1 rounded-lg bg-gray-100 px-2 py-1 font-mono">
                    {"{{invitationTitle}}"}
                  </span>
                  <span className="mx-1 rounded-lg bg-gray-100 px-2 py-1 font-mono">
                    {"{{rsvpLink}}"}
                  </span>
                </p>
              </PremiumCard>
            )}

            {/* GIFT OPTIONS */}
            <PremiumCard
              icon="🎁"
              title="קישור למתנה"
              subtitle="הקישורים נשמרים בהזמנה ומתעדכנים בדף האישי"
              rightSlot={
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    savingGift
                      ? "bg-yellow-50 text-yellow-700"
                      : giftSaveError
                      ? "bg-red-50 text-red-600"
                      : "bg-green-50 text-green-700"
                  }`}
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
                      className="w-full rounded-2xl border border-[#DDE3EE] bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
                      className="w-full rounded-2xl border border-[#DDE3EE] bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      dir="ltr"
                      inputMode="url"
                    />
                  )}
                </GiftOptionCard>
              </div>
            </PremiumCard>

            {/* TIMING */}
            <PremiumCard
              icon="⏱️"
              title="מועד שליחה"
              subtitle="אפשר לשלוח עכשיו או לתזמן מראש כל סבב בנפרד"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TimingOption
                  title="שליחה מיידית"
                  subtitle="ההודעה תישלח עכשיו לפי הסבב והערוץ שנבחרו"
                  icon="🚀"
                  active={sendTiming === "now"}
                  onClick={() => {
                    setSendTiming("now");
                    setScheduledDate("");
                    setScheduledTime("");
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
                    className="rounded-2xl border border-[#DDE3EE] bg-white px-4 py-3.5 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />

                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="rounded-2xl border border-[#DDE3EE] bg-white px-4 py-3.5 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              )}

              {hasExistingSchedule && (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-blue-800">
                        סבב {round} מתוזמן
                      </p>
                      <p className="mt-1 text-sm text-blue-700">
                        {formatDateTime(existingSchedule.scheduledAt)}
                      </p>
                    </div>

                    <span className="text-2xl">📌</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelSchedule}
                    disabled={cancelLoading}
                    className="w-full rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(239,68,68,0.24)] transition hover:bg-red-600 disabled:opacity-60"
                  >
                    {cancelLoading ? "מבטל..." : "❌ בטל תזמון"}
                  </button>
                </div>
              )}
            </PremiumCard>

            {/* SEND */}
            <div className="rounded-[34px] border border-[#EEE8DD] bg-white p-4 shadow-[0_22px_65px_rgba(31,41,55,0.09)] space-y-3">
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

              <SendButton
                key={`${invitationId}-${selectedChannel}-${round}-${templateName}-${currentRoundSent}-${currentRoundScheduled}-${hasExistingSchedule}`}
                {...sendButtonProps}
                onAfterSend={async () => {
                  await loadScheduledMessages();

                  if (sendTiming === "scheduled") {
                    if (round === 1) setRound1Scheduled(true);
                    if (round === 2) setRound2Scheduled(true);
                    if (round === 3) setRound3Scheduled(true);
                  } else {
                    if (round === 1) setRound1Sent(true);
                    if (round === 2) setRound2Sent(true);
                    if (round === 3) setRound3Sent(true);
                  }
                }}
              >
                {mainButtonText}
              </SendButton>

              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-gray-500">
                <span>נמענים לשליחה: {guestsToSend.length}</span>
                <span>
                  ערוץ: {selectedChannel === "sms" ? "SMS" : "WhatsApp"}
                </span>
                <span>
                  מועד: {sendTiming === "now" ? "מיידי" : "מתוזמן"}
                </span>
              </div>

              {(user?.role === "admin" || (user as any)?.impersonatedByAdmin) && (
                <button
                  type="button"
                  onClick={() =>
                    toggleMessageLock(getCurrentLockKey(), currentRoundLocked)
                  }
                  className={`w-full rounded-2xl px-5 py-3 text-sm font-black text-white transition ${
                    currentRoundLocked
                      ? "bg-orange-500 hover:bg-orange-600"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {currentRoundLocked ? "🔓 פתח סבב" : "🔒 סגור סבב"}
                </button>
              )}
            </div>

            {scheduledMessages.length > 0 && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    await loadScheduledMessages();
                    setShowScheduled(true);
                  }}
                  className="rounded-2xl border border-[#DDE3EE] bg-white px-6 py-3 text-sm font-black text-[#1F2937] shadow-sm transition hover:bg-[#F8FAFC]"
                >
                  📅 צפייה בהודעות מתוזמנות
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* SCHEDULED MODAL */}
      {showScheduled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-[980px] overflow-hidden rounded-[30px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <h2 className="text-xl font-black text-[#1F2937]">
                📅 הודעות מתוזמנות
              </h2>

              <button
                type="button"
                onClick={() => setShowScheduled(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg font-black hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[75vh] overflow-auto p-6">
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

/* ================= UI COMPONENTS ================= */

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
  rightSlot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[34px] border border-[#EEE8DD] bg-white/95 p-5 shadow-[0_18px_50px_rgba(31,41,55,0.06)] backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 via-white to-[#F6EBC8] text-xl shadow-inner">
            {icon}
          </div>

          <div>
            <h3 className="text-lg font-black text-[#1F2937]">{title}</h3>
            {subtitle && (
              <p className="mt-1 text-sm leading-6 text-gray-500">
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
    <div className="rounded-3xl border border-[#EEF2F7] bg-gradient-to-b from-white to-[#F8FAFC] p-4 shadow-[0_12px_30px_rgba(31,41,55,0.05)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-black text-[#1F2937]">{value}</span>
      </div>

      <p className="mt-2 text-xs font-bold text-gray-500">{label}</p>
    </div>
  );
}

function RoundButton({
  roundNumber,
  title,
  subtitle,
  active,
  count,
  channel,
  sent,
  scheduled,
  onClick,
}: {
  roundNumber: RoundNumber;
  title: string;
  subtitle: string;
  active: boolean;
  count: number;
  channel: Channel;
  sent: boolean;
  scheduled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden rounded-[28px] border p-5 text-right transition-all duration-200 ${
        active
          ? "border-blue-500 bg-gradient-to-l from-blue-600 to-blue-700 text-white shadow-[0_18px_36px_rgba(37,99,235,0.26)]"
          : "border-[#E5E7EB] bg-[#F8FAFC] text-[#1F2937] hover:bg-white hover:shadow-[0_14px_30px_rgba(31,41,55,0.08)]"
      }`}
    >
      {active && (
        <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
      )}

      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                active ? "bg-white text-blue-700" : "bg-blue-50 text-blue-700"
              }`}
            >
              {roundNumber}
            </span>

            <span className="text-lg font-black">{title}</span>
          </div>

          <p className={`text-sm ${active ? "text-blue-50" : "text-gray-500"}`}>
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

      <div
        className={`relative mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${
          active ? "bg-white/15 text-white" : "bg-white text-gray-600"
        }`}
      >
        {channel === "sms" ? "📩 SMS" : "💬 WhatsApp"}
      </div>

      {(sent || scheduled) && (
        <div
          className={`relative mt-3 rounded-2xl px-3 py-2 text-xs font-bold ${
            active ? "bg-white/15 text-white" : "bg-green-50 text-green-700"
          }`}
        >
          {sent ? "נשלח" : "מתוזמן"}
        </div>
      )}
    </button>
  );
}

function ChannelOption({
  icon,
  title,
  subtitle,
  active,
  onClick,
}: {
  icon: string;
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border p-4 text-right transition-all ${
        active
          ? "border-blue-500 bg-blue-50 shadow-[0_12px_28px_rgba(37,99,235,0.12)]"
          : "border-[#E5E7EB] bg-[#F8FAFC] hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-black text-[#1F2937]">
            <span className="text-lg">{icon}</span>
            <span>{title}</span>
          </div>

          <p className="mt-1 text-xs leading-5 text-gray-500">{subtitle}</p>
        </div>

        <span
          className={`mt-1 h-5 w-5 rounded-full border ${
            active
              ? "border-blue-600 bg-blue-600 shadow-[inset_0_0_0_4px_white]"
              : "border-gray-300 bg-white"
          }`}
        />
      </div>
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
  children?: ReactNode;
}) {
  return (
    <div
      className={`rounded-3xl border p-4 transition ${
        checked
          ? "border-blue-300 bg-blue-50/60"
          : "border-[#E5E7EB] bg-[#F8FAFC]"
      }`}
    >
      <label className="flex cursor-pointer items-center justify-between gap-3">
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
      className={`rounded-3xl border p-4 text-right transition-all ${
        active
          ? "border-blue-500 bg-blue-50 shadow-[0_12px_28px_rgba(37,99,235,0.12)]"
          : "border-[#E5E7EB] bg-[#F8FAFC] hover:bg-white"
      }`}
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
          className={`mt-1 h-5 w-5 rounded-full border ${
            active
              ? "border-blue-600 bg-blue-600 shadow-[inset_0_0_0_4px_white]"
              : "border-gray-300 bg-white"
          }`}
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
      className={`rounded-2xl border p-4 ${
        danger
          ? "border-red-100 bg-red-50 text-red-700"
          : "border-[#E8EEF7] bg-[#F8FAFC] text-[#1F2937]"
      }`}
    >
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-xs font-bold opacity-75">{label}</div>
    </div>
  );
}