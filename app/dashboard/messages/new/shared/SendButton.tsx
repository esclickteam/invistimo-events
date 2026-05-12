"use client";

import React, { ReactNode, useRef, useState } from "react";

/* ================= TYPES ================= */

type Channel = "sms" | "whatsapp";
type MessageType = "rsvp" | "reminder" | "thankyou";
type RoundNumber = 1 | 2 | 3;

type Props = {
  channel: Channel;
  type: MessageType;

  invitationId?: string;
  audience?: string[];

  scheduledAt?: Date | string | null;

  templateName?: string;
  disabled?: boolean;

  includeGiftLink?: boolean;
  giftLink?: string;

  messageOverride?: string;

  round?: RoundNumber;
  roundNumber?: RoundNumber;

  onAfterSend?: () => void | Promise<void>;

  children: ReactNode;
};

/* ================= HELPERS ================= */

function normalizeRound(value: any): RoundNumber {
  const n = Number(value);

  if (n === 2) return 2;
  if (n === 3) return 3;

  return 1;
}

function normalizeScheduledAt(value: Date | string | null | undefined) {
  if (!value) return undefined;

  const d = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(d.getTime())) return undefined;

  return d.toISOString();
}

/* ================= COMPONENT ================= */

const SendButton: React.FC<Props> = ({
  channel,
  type,
  invitationId,
  audience = [],
  scheduledAt,
  templateName,
  disabled,

  includeGiftLink,
  giftLink,

  messageOverride,

  onAfterSend,
  children,

  round,
  roundNumber,
}) => {
  const channelLabel = channel === "sms" ? "SMS" : "WhatsApp";

  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const inFlightRef = useRef(false);

  const finalRound = normalizeRound(round ?? roundNumber);
  const finalScheduledAt = normalizeScheduledAt(scheduledAt);
  const isScheduled = !!finalScheduledAt;

  const handleSend = async () => {
    if (disabled || sending || inFlightRef.current || done) return;

    if (!invitationId) {
      alert("❌ חסר invitationId");
      return;
    }

    /**
     * בשליחה מיידית כן חייבים שיהיו נמענים להצגה/בדיקה.
     * בתזמון אפשר לאפשר גם בלי audience כי השרת/worker ישלוף בזמן השליחה.
     */
    if (!isScheduled && (!audience || audience.length === 0)) {
      alert("❌ אין נמענים לשליחה");
      return;
    }

    inFlightRef.current = true;
    setSending(true);

    try {
      let endpoint = "";
      let payload: any = {};

      /* ================= SMS ================= */

      if (channel === "sms") {
        endpoint = "/api/sms/send";

        const mapTemplate: Record<MessageType, string> = {
          rsvp: "rsvp",
          reminder: "table",
          thankyou: "custom",
        };

        payload = {
          invitationId,
          templateKey: mapTemplate[type],

          // נשאר לתאימות, אבל ב-RSVP השרת לא משתמש בזה כמקור אמת לסבב 2/3
          guestIds: audience,
          audience,

          scheduledAt: finalScheduledAt,

          includeGiftLink,
          giftLink,
          messageOverride,

          round: finalRound,
          roundNumber: finalRound,
        };
      }

      /* ================= WHATSAPP ================= */

      if (channel === "whatsapp") {
        endpoint = "/api/whatsapp/send-template";

        if (!templateName) {
          alert("❌ חסרה תבנית WhatsApp");
          inFlightRef.current = false;
          setSending(false);
          return;
        }

        payload = {
          invitationId,
          templateName,

          // נשאר לתאימות, אבל ב-RSVP השרת קובע לפי הסבב
          audience,
          guestIds: audience,

          scheduledAt: finalScheduledAt,

          type,
          round: finalRound,
          roundNumber: finalRound,
        };
      }

      if (!endpoint) {
        alert("❌ ערוץ שליחה לא תקין");
        inFlightRef.current = false;
        setSending(false);
        return;
      }

      console.log("📤 SendButton request:", {
        endpoint,
        payload,
      });

      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      console.log("📥 SendButton response:", {
        status: res.status,
        data,
      });

      /* ================= SERVER BLOCK STATES ================= */

      if (
        res.status === 409 ||
        data?.error === "RSVP_ALREADY_SENT" ||
        data?.error === "RSVP_ROUND_ALREADY_SENT" ||
        data?.error?.includes?.("ALREADY_SENT") ||
        data?.error === "REMINDER_ALREADY_SENT" ||
        data?.error === "THANKYOU_ALREADY_SENT"
      ) {
        alert("ℹ️ הודעה זו כבר נשלחה ולא ניתן לשלוח שוב");

        setDone(true);
        await onAfterSend?.();
        return;
      }

      if (!res.ok || !data?.success) {
        alert(data?.error || "❌ שליחת ההודעות נכשלה");

        inFlightRef.current = false;
        setSending(false);
        return;
      }

      /* ================= SUCCESS ================= */

      if (isScheduled || data?.scheduled) {
        alert("⏱️ ההודעות תוזמנו בהצלחה");
      } else {
        const count = data?.queued ?? data?.sent ?? audience.length;
        alert(`📤 ${count} הודעות נכנסו לתהליך שליחה ב-${channelLabel}`);
      }

      setDone(true);
      await onAfterSend?.();
    } catch (err) {
      console.error("❌ SEND ERROR:", err);
      alert("❌ שגיאה בשליחה");

      inFlightRef.current = false;
      setSending(false);
      return;
    } finally {
      setSending(false);
    }
  };

  const isDisabled =
    !!disabled ||
    done ||
    sending ||
    inFlightRef.current ||
    (!isScheduled && (!audience || audience.length === 0));

  /* ================= RENDER ================= */

  return (
    <button
      type="button"
      onClick={handleSend}
      disabled={isDisabled}
      className="
        w-full
        rounded-2xl
        bg-[#9F7A3F]
        px-6
        py-4
        text-lg
        font-black
        text-white
        shadow-[0_14px_34px_rgba(120,83,38,0.25)]
        transition
        hover:bg-[#87652F]
        disabled:cursor-not-allowed
        disabled:opacity-50
      "
    >
      {done ? "נשלח ✓" : sending ? "שולח..." : children}
    </button>
  );
};

export default SendButton;