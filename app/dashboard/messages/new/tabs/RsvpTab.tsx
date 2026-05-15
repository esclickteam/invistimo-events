"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import AudienceFilterSelector from "../shared/AudienceFilterSelector";
import SendButton from "../shared/SendButton";
import WhatsappTemplatePreview from "../shared/WhatsappTemplatePreview";
import TextMessagePreview from "../shared/TextMessagePreview";
import ScheduledMessagesTable from "@/app/components/ScheduledMessagesTable";


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

type InvitationPreviewData = {
  title: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  headerImageUrl: string;
  shareId: string;
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
    "תזכורת נוספת לאישור הגעה ל־{{invitationTitle}} 🎉\n\n" +
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

function getInvitationLocation(inv: any, fallback = "") {
  if (!inv) return fallback || "";

  if (typeof inv.location === "string") {
    return inv.location;
  }

  return (
    inv.location?.address ||
    inv.location?.name ||
    inv.address ||
    inv.eventLocation ||
    fallback ||
    ""
  );
}

function getInvitationHeaderImage(inv: any, fallback = "") {
  if (!inv) return fallback || "";

  return (
    inv.headerImage ||
    inv.previewImage ||
    inv.headerImageUrl ||
    inv.imageUrl ||
    inv.invitationImage ||
    inv.design?.headerImage ||
    inv.canvasData?.headerImage ||
    fallback ||
    ""
  );
}

function normalizeEventDate(inv: any, fallback = "") {
  return inv?.eventDate || inv?.date || fallback || "";
}

function formatDateOnly(value: any) {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString("he-IL");
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

function isActiveSchedule(schedule: any) {
  return (
    schedule?.status === "scheduled" &&
    schedule?.scheduledAt &&
    !Number.isNaN(new Date(schedule.scheduledAt).getTime())
  );
}

function getScheduleChannel(schedule: any): Channel | null {
  const channel = String(schedule?.channel ?? "").toLowerCase();

  if (channel === "whatsapp") return "whatsapp";
  if (channel === "sms") return "sms";

  const templateName = String(schedule?.templateName ?? "").toLowerCase();
  const content = String(schedule?.content ?? schedule?.message ?? "").toLowerCase();

  if (
    templateName.includes("rsvp_invitation_media") ||
    templateName.includes("rsvp_reminder_invistimo") ||
    templateName.includes("whatsapp") ||
    content.includes("whatsapp:")
  ) {
    return "whatsapp";
  }

  if (templateName.includes("sms") || content.includes("sms:")) {
    return "sms";
  }

  return null;
}

function getWhatsappTemplateByRound(round: RoundNumber) {
  return round === 1 ? RSVP_ROUND1_TEMPLATE : RSVP_REMINDER_TEMPLATE;
}

function getRoundAudienceLabel(round: RoundNumber) {
  return round === 1 ? "כל המוזמנים" : "מי שטרם אישר";
}

function getRoundSubtitle(round: RoundNumber) {
  if (round === 1) return "לכל המוזמנים";
  if (round === 2) return "למי שטרם אישר";
  return "למי שטרם אישר";
}

function getWhatsappPreviewText({
  round,
  invitationTitle,
  eventDate,
  eventTime,
  eventLocation,
}: {
  round: RoundNumber;
  invitationTitle: string;
  eventDate: string;
  eventTime?: string;
  eventLocation: string;
}) {
  const title = invitationTitle || "האירוע";
  const dateText = formatDateOnly(eventDate);
  const timeText = eventTime || "";
  const locationText = eventLocation || "";

  if (round === 1) {
    return `משפחה וחברים יקרים,
הנכם מוזמנים ל־${title} 🤍

${dateText ? `📅 תאריך: ${dateText}` : ""}
${timeText ? `🕘 שעה: ${timeText}` : ""}
${locationText ? `📍 מיקום: ${locationText}` : ""}

לאישור הגעה לחצו על הכפתור למטה 👇

מחכים לשמוח איתכם 💖`;
  }

  if (round === 2) {
    return `משפחה וחברים יקרים,

תזכורת קצרה לאישור הגעה ל־${title} 🤍

לאישור הגעה לחצו על הכפתור למטה 👇

מחכים לשמוח איתכם 💖`;
  }

  return `משפחה וחברים יקרים,

תזכורת נוספת לאישור הגעה ל־${title} ✨

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
 

  const [loading, setLoading] = useState(true);
  const [sendingNow, setSendingNow] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);

  const [invitationPreview, setInvitationPreview] =
    useState<InvitationPreviewData>({
      title: invitationTitle || "",
      eventDate: eventDate || "",
      eventTime: "",
      eventLocation: eventLocation || "",
      headerImageUrl: headerImageUrl || "",
      shareId: "",
    });

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

  const [activeSchedulesByRound, setActiveSchedulesByRound] = useState<
    Record<RoundNumber, boolean>
  >({
    1: false,
    2: false,
    3: false,
  });

  const [activeScheduleChannelByRound, setActiveScheduleChannelByRound] =
    useState<Record<RoundNumber, Channel | null>>({
      1: null,
      2: null,
      3: null,
    });

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

  const sendingResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  /* ================= CLEANUP ================= */

  useEffect(() => {
    return () => {
      if (giftSaveTimer.current) clearTimeout(giftSaveTimer.current);
      if (sendingResetTimerRef.current) {
        clearTimeout(sendingResetTimerRef.current);
      }
    };
  }, []);

  /* ================= SCHEDULED DATE ================= */

  const scheduledAt = useMemo(() => {
    if (sendTiming !== "scheduled" || !scheduledDate || !scheduledTime) {
      return null;
    }

    const [year, month, day] = scheduledDate.split("-").map(Number);
    const [hour, minute] = scheduledTime.split(":").map(Number);

    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }, [sendTiming, scheduledDate, scheduledTime]);

  /* ================= CURRENT ROUND ================= */

  const currentSmsMessage = smsMessages[round];

  const currentRoundSent =
    round === 1 ? round1Sent : round === 2 ? round2Sent : round3Sent;

  const currentRoundScheduled = activeSchedulesByRound[round];

  const currentRoundScheduledChannel = activeScheduleChannelByRound[round];

  const currentRoundScheduledInAnotherChannel =
    currentRoundScheduled &&
    !!currentRoundScheduledChannel &&
    currentRoundScheduledChannel !== selectedChannel;

  const currentRoundLocked =
    round === 1
      ? round1Locked
      : round === 2
      ? round2Locked
      : round3Locked;

  const hasExistingSchedule = isActiveSchedule(existingSchedule);

  const existingScheduleChannelLabel =
    currentRoundScheduledChannel === "sms" ? "SMS" : "WhatsApp";

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
          `/api/scheduled/by-invitation?invitationId=${invitationId}&type=rsvp&round=${round}`,
          { cache: "no-store" }
        );

        const data = await res.json();
        const activeSchedule = isActiveSchedule(data?.schedule);
        const scheduleChannel = activeSchedule
          ? getScheduleChannel(data.schedule)
          : null;

        setActiveSchedulesByRound((prev) => ({
          ...prev,
          [round]: activeSchedule,
        }));

        setActiveScheduleChannelByRound((prev) => ({
          ...prev,
          [round]: scheduleChannel,
        }));

        if (activeSchedule) {
          setExistingSchedule(data.schedule);

          const d = new Date(data.schedule.scheduledAt);

          setScheduledDate(d.toISOString().slice(0, 10));
          setScheduledTime(d.toISOString().slice(11, 16));
          setSendTiming("scheduled");
        } else {
          setExistingSchedule(null);
          setScheduledDate("");
          setScheduledTime("");
          setSendTiming("now");

          if (round === 1) setRound1Scheduled(false);
          if (round === 2) setRound2Scheduled(false);
          if (round === 3) setRound3Scheduled(false);
        }
      } catch {
        setExistingSchedule(null);
        setScheduledDate("");
        setScheduledTime("");
        setSendTiming("now");

        setActiveSchedulesByRound((prev) => ({
          ...prev,
          [round]: false,
        }));

        setActiveScheduleChannelByRound((prev) => ({
          ...prev,
          [round]: null,
        }));
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

        setInvitationPreview({
          title: inv?.title || invitationTitle || "",
          eventDate: normalizeEventDate(inv, eventDate),
          eventTime: inv?.eventTime || "",
          eventLocation: getInvitationLocation(inv, eventLocation),
          headerImageUrl: getInvitationHeaderImage(inv, headerImageUrl || ""),
          shareId: inv?.shareId || "",
        });

        const r1Sent = Boolean(inv?.rsvpRoundSent?.round1);
const r2Sent = Boolean(inv?.rsvpRoundSent?.round2);
const r3Sent = Boolean(inv?.rsvpRoundSent?.round3);

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

        setRound1Locked(Boolean(inv?.rsvpRoundSent?.round1));
setRound2Locked(Boolean(inv?.rsvpRoundSent?.round2));
setRound3Locked(Boolean(inv?.rsvpRoundSent?.round3));

        setGiftOptions(normalizeGiftOptions(inv?.giftOptions));
        didInitGift.current = true;
      } catch (err) {
        console.error("❌ Failed to load RSVP data", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [
    invitationId,
    selectedChannel,
    invitationTitle,
    eventDate,
    eventLocation,
    headerImageUrl,
  ]);

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
        setGiftSaveError("לא הצלחנו לשמור את הגדרות המתנה. נסו שוב.");
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

      setActiveSchedulesByRound((prev) => ({
        ...prev,
        [round]: false,
      }));

      setActiveScheduleChannelByRound((prev) => ({
        ...prev,
        [round]: null,
      }));

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


  /* ================= DOUBLE CLICK LOCK ================= */

  function lockSendImmediately() {
    if (sendingNow) return;

    setSendingNow(true);

    if (sendingResetTimerRef.current) {
      clearTimeout(sendingResetTimerRef.current);
    }

    sendingResetTimerRef.current = setTimeout(() => {
      setSendingNow(false);
    }, 30000);
  }

  function unlockSendButton() {
    if (sendingResetTimerRef.current) {
      clearTimeout(sendingResetTimerRef.current);
      sendingResetTimerRef.current = null;
    }

    setSendingNow(false);
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

  const missingHeaderImage =
    selectedChannel === "whatsapp" && !invitationPreview.headerImageUrl;

  const blocked =
  (sendTiming === "now" && noAudience) ||
  missingHeaderImage ||
  (sendTiming === "scheduled" && !scheduledAt) ||
  currentRoundSent ||
  currentRoundScheduledInAnotherChannel;

  const whatsappPreviewText = useMemo(() => {
    return getWhatsappPreviewText({
      round,
      invitationTitle: invitationPreview.title || invitationTitle,
      eventDate: invitationPreview.eventDate || eventDate,
      eventTime: invitationPreview.eventTime,
      eventLocation: invitationPreview.eventLocation || eventLocation,
    });
  }, [round, invitationPreview, invitationTitle, eventDate, eventLocation]);

  const smsPreviewText = useMemo(() => {
    const g = guestsToSend[0];

    const fallbackName = "אורח/ת יקר/ה";
    const fallbackToken = "preview-token";

    const rsvpLink = `https://www.invistimo.com/invite/${invitationId}?token=${
      g?.token || fallbackToken
    }`;

    return currentSmsMessage
      .replace(/{{name}}/g, g?.name || fallbackName)
      .replace(
        /{{invitationTitle}}/g,
        invitationPreview.title || invitationTitle || ""
      )
      .replace(/{{rsvpLink}}/g, rsvpLink);
  }, [
    guestsToSend,
    invitationId,
    invitationTitle,
    invitationPreview.title,
    currentSmsMessage,
  ]);

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
          round,
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
    ? `⏱️ עדכן תזמון - סבב ${round}`
    : sendTiming === "scheduled"
    ? `תזמן שליחה - סבב ${round}`
    : `שלח עכשיו - סבב ${round}`;

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-[520px] flex items-center justify-center bg-[#F6EFE6]"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full border-4 border-[#E8D8BE] border-t-[#A87937] animate-spin" />
          <p className="text-sm font-bold text-[#7A5A3A]">
            טוען אורחים ונתוני שליחה...
          </p>
        </div>
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div dir="rtl" className="relative overflow-hidden bg-[#F6EFE6]">
      <div className="pointer-events-none absolute -top-32 -right-28 h-[420px] w-[420px] rounded-full bg-[#E9D4AC]/70 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-24 h-[380px] w-[380px] rounded-full bg-[#B9894D]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/3 h-80 w-80 rounded-full bg-[#7B4E2E]/10 blur-3xl" />

      <div className="relative p-5 md:p-8 space-y-7">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[38px] border border-[#E9D8BE] bg-gradient-to-br from-[#FFF8EF] via-[#F9EFE2] to-[#EFE0CB] p-5 md:p-7 shadow-[0_28px_80px_rgba(78,49,27,0.13)]">
          <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-[#C99A4A]/20 blur-2xl" />
          <div className="pointer-events-none absolute right-10 bottom-0 h-32 w-32 rounded-full bg-white/50 blur-2xl" />

          <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E5C88E] bg-white/70 px-4 py-2 text-sm font-black text-[#8A5A25] shadow-sm">
                <span>✉️</span>
                <span>ניהול אישורי הגעה</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-[#3A2417]">
                שליחת הודעות
              </h2>

              <p className="max-w-2xl text-sm md:text-base leading-7 text-[#7A5A3A]">
                בחרו סבב, ערוץ שליחה ומועד. סבב 1 נשלח לכל המוזמנים,
                וסבבים 2–3 נשלחים למי שטרם אישר במועד השליחה.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-full xl:min-w-[560px]">
              <StatCard label="סה״כ מוזמנים" value={totalCount} icon="👥" />
              <StatCard
                label="טרם אישרו"
                value={pendingGuests.length}
                icon="⏳"
              />
              <StatCard label="רשומות שאישרו" value={yesCount} icon="✓" />
              <StatCard label="לא מגיעים" value={noCount} icon="—" />
            </div>
          </div>
        </section>

        {/* ROUND SELECTOR */}
        <section className="rounded-[34px] border border-[#E6D6BC] bg-[#FFF9F1]/90 p-3 shadow-[0_18px_50px_rgba(78,49,27,0.08)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((r) => (
              <RoundButton
                key={r}
                roundNumber={r as RoundNumber}
                active={round === r}
                title={`סבב ${r}`}
                subtitle={getRoundSubtitle(r as RoundNumber)}
                count={r === 1 ? totalCount : pendingGuests.length}
                channel={
                  activeScheduleChannelByRound[r as RoundNumber] ??
                  roundChannels[r as RoundNumber]
                }
                sent={
                  r === 1
                    ? round1Sent
                    : r === 2
                    ? round2Sent
                    : round3Sent
                }
                scheduled={activeSchedulesByRound[r as RoundNumber]}
                onClick={() => {
                  if (sendingNow) return;
                  setRound(r as RoundNumber);
                }}
              />
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[0.94fr_1.06fr] gap-7 items-start">
          {/* PREVIEW */}
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
              <div className="rounded-[34px] border border-[#E6D6BC] bg-gradient-to-b from-[#FFF9F1] via-white to-[#EFE0CB] p-3 md:p-5 shadow-inner">
                {selectedChannel === "whatsapp" ? (
                  <WhatsappTemplatePreview
                    templateKey={templateName}
                    previewText={whatsappPreviewText}
                    headerImageUrl={invitationPreview.headerImageUrl}
                    invitationTitle={invitationPreview.title}
                    eventDate={invitationPreview.eventDate}
                    eventTime={invitationPreview.eventTime}
                    eventLocation={invitationPreview.eventLocation}
                    shareId={invitationPreview.shareId}
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
            <PremiumCard
              icon="📨"
              title={`ערוץ שליחה לסבב ${round}`}
              subtitle="אפשר לבחור מחדש בכל סבב בין WhatsApp ל-SMS"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ChannelOption
                  icon="💬"
                  title="WhatsApp"
                  subtitle="שליחה דרך תבנית WhatsApp Business"
                  active={selectedChannel === "whatsapp"}
                  disabled={sendingNow}
                  onClick={() =>
                    setRoundChannels((p) => ({ ...p, [round]: "whatsapp" }))
                  }
                />

                <ChannelOption
                  icon="📩"
                  title="SMS"
                  subtitle="שליחת הודעת טקסט עם קישור אישי"
                  active={selectedChannel === "sms"}
                  disabled={sendingNow}
                  onClick={() =>
                    setRoundChannels((p) => ({ ...p, [round]: "sms" }))
                  }
                />
              </div>
            </PremiumCard>

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

              <div className="mt-4 rounded-3xl border border-[#E6D6BC] bg-gradient-to-l from-[#FFF3DD] to-[#FFFDF9] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-[#3A2417]">
                      שליחה לפי סבב
                    </h3>
                    <p className="mt-1 text-xs leading-6 text-[#7A5A3A]">
                      אין בחירת פיצול. סבב 1 נשלח לכולם. סבבים 2–3 נשלחים למי
                      שטרם אישר.
                    </p>
                  </div>

                  <span className="rounded-full border border-[#E5C88E] bg-white px-4 py-2 text-xs font-black text-[#8A5A25]">
                    {guestsToSend.length} נמענים
                  </span>
                </div>
              </div>
            </PremiumCard>

            {selectedChannel === "sms" && (
              <PremiumCard
                icon="✏️"
                title={`עריכת הודעת SMS - סבב ${round}`}
                subtitle="אפשר לערוך את נוסח ההודעה בלי לשנות את הקישור האישי"
              >
                <textarea
                  value={currentSmsMessage}
                  disabled={sendingNow}
                  onChange={(e) =>
                    setSmsMessages((p) => ({
                      ...p,
                      [round]: e.target.value,
                    }))
                  }
                  rows={7}
                  className="w-full rounded-3xl border border-[#E6D6BC] bg-[#FFF9F1] px-4 py-4 text-sm leading-7 text-[#3A2417] outline-none transition focus:border-[#B9894D] focus:ring-4 focus:ring-[#E9D4AC] disabled:opacity-60"
                />

                <p className="mt-3 text-xs leading-6 text-[#7A5A3A]">
                  משתנים אוטומטיים:
                  <span className="mx-1 rounded-lg bg-[#F0E3D1] px-2 py-1 font-mono">
                    {"{{name}}"}
                  </span>
                  <span className="mx-1 rounded-lg bg-[#F0E3D1] px-2 py-1 font-mono">
                    {"{{invitationTitle}}"}
                  </span>
                  <span className="mx-1 rounded-lg bg-[#F0E3D1] px-2 py-1 font-mono">
                    {"{{rsvpLink}}"}
                  </span>
                </p>
              </PremiumCard>
            )}

            <PremiumCard
              icon="🎁"
              title="קישור למתנה"
              subtitle="הקישורים נשמרים בהזמנה ומתעדכנים בדף האישי"
              rightSlot={
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    savingGift
                      ? "bg-[#FFF3DD] text-[#8A5A25]"
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
                  disabled={sendingNow}
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
                      disabled={sendingNow}
                      onChange={(e) =>
                        setGiftOptions((p) => ({
                          ...p,
                          creditUrl: e.target.value,
                        }))
                      }
                      placeholder="הדביקו כאן קישור לתשלום באשראי"
                      className="w-full rounded-2xl border border-[#E6D6BC] bg-white px-4 py-3 text-sm outline-none focus:border-[#B9894D] focus:ring-4 focus:ring-[#E9D4AC] disabled:opacity-60"
                      dir="ltr"
                      inputMode="url"
                    />
                  )}
                </GiftOptionCard>

                <GiftOptionCard
                  icon="💰"
                  title="מתנה ב-PayBox"
                  checked={giftOptions.payboxEnabled}
                  disabled={sendingNow}
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
                      disabled={sendingNow}
                      onChange={(e) =>
                        setGiftOptions((p) => ({
                          ...p,
                          payboxUrl: e.target.value,
                        }))
                      }
                      placeholder="הדביקו כאן קישור ל-PayBox"
                      className="w-full rounded-2xl border border-[#E6D6BC] bg-white px-4 py-3 text-sm outline-none focus:border-[#B9894D] focus:ring-4 focus:ring-[#E9D4AC] disabled:opacity-60"
                      dir="ltr"
                      inputMode="url"
                    />
                  )}
                </GiftOptionCard>
              </div>
            </PremiumCard>

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
                  disabled={sendingNow}
                  onClick={() => {
                    setSendTiming("now");
                    setScheduledDate("");
                    setScheduledTime("");
                  }}
                />

                <TimingOption
                  title="שליחה מתוזמנת"
                  subtitle="קביעת תאריך ושעה לשליחה אוטומטית"
                  icon="📅"
                  active={sendTiming === "scheduled"}
                  disabled={sendingNow}
                  onClick={() => setSendTiming("scheduled")}
                />
              </div>

              {sendTiming === "scheduled" && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={scheduledDate}
                    disabled={sendingNow}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="rounded-2xl border border-[#E6D6BC] bg-white px-4 py-3.5 text-sm font-bold outline-none focus:border-[#B9894D] focus:ring-4 focus:ring-[#E9D4AC] disabled:opacity-60"
                  />

                  <input
                    type="time"
                    value={scheduledTime}
                    disabled={sendingNow}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="rounded-2xl border border-[#E6D6BC] bg-white px-4 py-3.5 text-sm font-bold outline-none focus:border-[#B9894D] focus:ring-4 focus:ring-[#E9D4AC] disabled:opacity-60"
                  />
                </div>
              )}

              {hasExistingSchedule && (
                <div className="mt-4 rounded-2xl border border-[#E5C88E] bg-[#FFF3DD] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-[#7B4E2E]">
                        סבב {round} מתוזמן ב־{existingScheduleChannelLabel}
                      </p>
                      <p className="mt-1 text-sm text-[#8A5A25]">
                        {formatDateTime(existingSchedule.scheduledAt)}
                      </p>
                    </div>

                    <span className="text-2xl">📌</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelSchedule}
                    disabled={cancelLoading || sendingNow}
                    className="w-full rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(239,68,68,0.24)] transition hover:bg-red-600 disabled:opacity-60"
                  >
                    {cancelLoading ? "מבטל..." : "❌ בטל תזמון"}
                  </button>
                </div>
              )}
            </PremiumCard>

            <div className="rounded-[34px] border border-[#E6D6BC] bg-gradient-to-br from-[#FFF9F1] to-white p-4 shadow-[0_22px_65px_rgba(78,49,27,0.11)] space-y-3">
              {missingHeaderImage && (
                <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">
                  חסרה תמונת Header להזמנת WhatsApp. צריך להעלות תמונה לפני
                  שליחה.
                </div>
              )}

              {sendTiming === "now" && noAudience && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                  אין נמענים לשליחה מיידית בסבב זה.
                </div>
              )}

              {currentRoundScheduledInAnotherChannel && (
                <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold leading-6 text-orange-700">
                  סבב {round} כבר מתוזמן ב־{existingScheduleChannelLabel}. כדי
                  לתזמן בערוץ אחר, צריך קודם לבטל את התזמון הקיים.
                </div>
              )}

              <SendButton
                key={`${invitationId}-${selectedChannel}-${round}-${templateName}-${currentRoundSent}-${currentRoundScheduled}-${hasExistingSchedule}-${currentRoundScheduledChannel}`}
                {...sendButtonProps}
                disabled={blocked}
                onAfterSend={async () => {
                  await loadScheduledMessages();

                  if (sendTiming === "scheduled") {
                    setActiveSchedulesByRound((prev) => ({
                      ...prev,
                      [round]: true,
                    }));

                    setActiveScheduleChannelByRound((prev) => ({
                      ...prev,
                      [round]: selectedChannel,
                    }));

                    if (round === 1) setRound1Scheduled(true);
                    if (round === 2) setRound2Scheduled(true);
                    if (round === 3) setRound3Scheduled(true);
                  } else {
                    if (round === 1) setRound1Sent(true);
                    if (round === 2) setRound2Sent(true);
                    if (round === 3) setRound3Sent(true);
                  }

                  unlockSendButton();
                }}
              >
                {mainButtonText}
              </SendButton>

              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[#7A5A3A]">
                <span>נמענים לשליחה: {guestsToSend.length}</span>
                <span>
                  ערוץ: {selectedChannel === "sms" ? "SMS" : "WhatsApp"}
                </span>
                <span>
                  מועד: {sendTiming === "now" ? "מיידי" : "מתוזמן"}
                </span>
              </div>
            </div>

            {scheduledMessages.length > 0 && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  disabled={sendingNow}
                  onClick={async () => {
                    await loadScheduledMessages();
                    setShowScheduled(true);
                  }}
                  className="rounded-2xl border border-[#E6D6BC] bg-[#FFF9F1] px-6 py-3 text-sm font-black text-[#3A2417] shadow-sm transition hover:bg-[#FFF3DD] disabled:opacity-60"
                >
                  📅 צפייה בהודעות מתוזמנות
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {showScheduled && (
        <div className="mt-4 rounded-[30px] border border-[#E6D6BC] bg-[#FFF9F1] shadow-[0_18px_50px_rgba(78,49,27,0.10)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#E6D6BC] px-5 py-4">
            <h2 className="text-lg font-black text-[#3A2417]">
              📅 הודעות מתוזמנות
            </h2>

            <button
              type="button"
              onClick={() => setShowScheduled(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0E3D1] text-base font-black text-[#3A2417] hover:bg-[#E6D6BC]"
            >
              ✕
            </button>
          </div>

          <div className="max-h-[420px] overflow-auto p-4">
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
    <section className="rounded-[34px] border border-[#E6D6BC] bg-[#FFF9F1]/95 p-5 shadow-[0_18px_50px_rgba(78,49,27,0.08)] backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFF3DD] via-white to-[#DDBB7A] text-xl shadow-inner">
            {icon}
          </div>

          <div>
            <h3 className="text-lg font-black text-[#3A2417]">{title}</h3>
            {subtitle && (
              <p className="mt-1 text-sm leading-6 text-[#7A5A3A]">
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
    <div className="rounded-3xl border border-[#E6D6BC] bg-gradient-to-b from-white to-[#FFF3DD] p-4 shadow-[0_12px_30px_rgba(78,49,27,0.07)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xl text-[#A87937]">{icon}</span>
        <span className="text-2xl font-black text-[#3A2417]">{value}</span>
      </div>

      <p className="mt-2 text-xs font-bold text-[#7A5A3A]">{label}</p>
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
          ? "border-[#C99A4A] bg-gradient-to-l from-[#8A5A25] via-[#A87937] to-[#C99A4A] text-white shadow-[0_18px_36px_rgba(138,90,37,0.30)]"
          : "border-[#E6D6BC] bg-[#FFF9F1] text-[#3A2417] hover:bg-white hover:shadow-[0_14px_30px_rgba(78,49,27,0.09)]"
      }`}
    >
      {active && (
        <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-white/20 blur-2xl" />
      )}

      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                active
                  ? "bg-white text-[#8A5A25]"
                  : "bg-[#FFF3DD] text-[#8A5A25]"
              }`}
            >
              {roundNumber}
            </span>

            <span className="text-lg font-black">{title}</span>
          </div>

          <p
            className={`text-sm ${
              active ? "text-white/85" : "text-[#7A5A3A]"
            }`}
          >
            {subtitle}
          </p>
        </div>

        <div className="text-left">
          <div className="text-2xl font-black">{count}</div>
          <div
            className={`text-xs ${
              active ? "text-white/80" : "text-[#7A5A3A]"
            }`}
          >
            נמענים
          </div>
        </div>
      </div>

      <div
        className={`relative mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${
          active ? "bg-white/18 text-white" : "bg-white text-[#7A5A3A]"
        }`}
      >
        {channel === "sms" ? "📩 SMS" : "💬 WhatsApp"}
      </div>

      {(sent || scheduled) && (
        <div
          className={`relative mt-3 rounded-2xl px-3 py-2 text-xs font-bold ${
            active ? "bg-white/18 text-white" : "bg-green-50 text-green-700"
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
  disabled,
  onClick,
}: {
  icon: string;
  title: string;
  subtitle: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-3xl border p-4 text-right transition-all disabled:opacity-60 ${
        active
          ? "border-[#C99A4A] bg-[#FFF3DD] shadow-[0_12px_28px_rgba(138,90,37,0.14)]"
          : "border-[#E6D6BC] bg-[#FFFDF9] hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-black text-[#3A2417]">
            <span className="text-lg">{icon}</span>
            <span>{title}</span>
          </div>

          <p className="mt-1 text-xs leading-5 text-[#7A5A3A]">{subtitle}</p>
        </div>

        <span
          className={`mt-1 h-5 w-5 rounded-full border ${
            active
              ? "border-[#A87937] bg-[#A87937] shadow-[inset_0_0_0_4px_white]"
              : "border-[#D8C3A3] bg-white"
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
  disabled,
  onCheckedChange,
  children,
}: {
  icon: string;
  title: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div
      className={`rounded-3xl border p-4 transition ${
        checked
          ? "border-[#C99A4A] bg-[#FFF3DD]"
          : "border-[#E6D6BC] bg-[#FFFDF9]"
      }`}
    >
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-black text-[#3A2417]">
          <span className="text-lg">{icon}</span>
          {title}
        </span>

        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="h-5 w-5 accent-[#A87937] disabled:opacity-60"
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
  disabled,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-3xl border p-4 text-right transition-all disabled:opacity-60 ${
        active
          ? "border-[#C99A4A] bg-[#FFF3DD] shadow-[0_12px_28px_rgba(138,90,37,0.14)]"
          : "border-[#E6D6BC] bg-[#FFFDF9] hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-black text-[#3A2417]">
            <span>{icon}</span>
            <span>{title}</span>
          </div>

          <p className="mt-1 text-xs leading-5 text-[#7A5A3A]">{subtitle}</p>
        </div>

        <span
          className={`mt-1 h-5 w-5 rounded-full border ${
            active
              ? "border-[#A87937] bg-[#A87937] shadow-[inset_0_0_0_4px_white]"
              : "border-[#D8C3A3] bg-white"
          }`}
        />
      </div>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#E6D6BC] pb-3 last:border-b-0 last:pb-0">
      <span className="text-[#7A5A3A]">{label}</span>
      <span className="font-black text-[#3A2417]">{value}</span>
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
          : "border-[#E6D6BC] bg-[#FFF3DD] text-[#3A2417]"
      }`}
    >
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-xs font-bold opacity-75">{label}</div>
    </div>
  );
}