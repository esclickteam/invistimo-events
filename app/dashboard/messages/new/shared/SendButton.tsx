"use client";

import React, { ReactNode, useRef, useState } from "react";

/* ================= TYPES ================= */

type Props = {
  channel: "sms" | "whatsapp";
  type: "rsvp" | "reminder" | "thankyou";

  invitationId?: string;
  audience: string[];
  scheduledAt: Date | null;

  templateName?: string;
  disabled?: boolean;

  includeGiftLink?: boolean;
  giftLink?: string;

  messageOverride?: string;

  onAfterSend?: () => void;

  children: ReactNode;
};

/* ================= COMPONENT ================= */

const SendButton: React.FC<Props> = ({
  channel,
  type,
  invitationId,
  audience,
  scheduledAt,
  templateName,
  disabled,

  includeGiftLink,
  giftLink,

  messageOverride,

  onAfterSend,
  children,
}) => {
  const channelLabel = channel === "sms" ? "SMS" : "WhatsApp";

  // ⛔️ בזמן שליחה
  const [sending, setSending] = useState(false);

  // ✅ אחרי הצלחה/חסימה מהשרת – נשאר חסום בלי רענון
  const [sent, setSent] = useState(false);

  // 🔒 נעילה מיידית נגד דאבל-קליק (גם לפני שהסטייט מתעדכן)
  const inFlightRef = useRef(false);

  const handleSend = async () => {
    // ⛔️ אם כבר נשלח / חסום / באמצע — לא עושים כלום
    if (disabled || sent || sending || inFlightRef.current) return;

    if (!invitationId) {
      alert("❌ חסר invitationId");
      return;
    }

    if (!audience || audience.length === 0) {
      alert("❌ אין נמענים לשליחה");
      return;
    }

    // 🔒 ננעל מיידית
    inFlightRef.current = true;
    setSending(true);

    try {
      let endpoint = "";
      let payload: any = {};

      /* ================= SMS ================= */

      if (channel === "sms") {
        endpoint = "/api/sms/send";

        const mapTemplate: Record<string, string> = {
          rsvp: "rsvp",
          reminder: "table",
          thankyou: "custom",
        };

        payload = {
          invitationId,
          templateKey: mapTemplate[type],
          guestIds: audience,
          scheduledAt,

          includeGiftLink,
          giftLink,
          messageOverride,
        };
      }

      /* ================= WHATSAPP ================= */

      if (channel === "whatsapp") {
        endpoint = "/api/whatsapp/send-template";

        payload = {
          invitationId,
          templateName,
          audience,
          scheduledAt,
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      /* ================= SERVER BLOCK STATES ================= */

      if (
        res.status === 409 ||
        data?.error === "RSVP_ALREADY_SENT" ||
        data?.error === "RSVP_ROUND_ALREADY_SENT" ||
        data?.error === "REMINDER_ALREADY_SENT" ||
        data?.error === "THANKYOU_ALREADY_SENT"
      ) {
        alert("ℹ️ הודעה זו כבר נשלחה ולא ניתן לשלוח שוב");

        // ✅ נשאר חסום בלי רענון
        setSent(true);
        onAfterSend?.();
        return;
      }

      if (!res.ok || !data?.success) {
        alert(data?.error || "❌ שליחת ההודעות נכשלה");

        // ❌ נכשל → משחררים כדי שתוכלי לנסות שוב
        inFlightRef.current = false;
        setSending(false);
        return;
      }

      /* ================= SUCCESS ================= */

      if (scheduledAt) {
        alert("⏱️ ההודעות תוזמנו ונכנסו לתהליך שליחה");
      } else {
        const count = data.queued ?? data.sent ?? audience.length;
        alert(`📤 ${count} הודעות נכנסו לתהליך שליחה ב-${channelLabel}`);
      }

      // ✅ הצליח → ננעל קבוע (בלי רענון)
      setSent(true);

      /* ================= UPDATE PARENT ================= */

      onAfterSend?.();
    } catch (err) {
      console.error("SEND ERROR:", err);
      alert("❌ שגיאה בשליחה");

      // ❌ שגיאה → משחררים כדי שתוכלי לנסות שוב
      inFlightRef.current = false;
      setSending(false);
      return;
    } finally {
      // אם נשלח בהצלחה וננעל ב-sent, אין צורך להציג sending
      setSending(false);
      // שימי לב: inFlightRef נשאר true רק אם sent=true, אחרת שחררנו אותו בנקודות הכשל
      if (sent === false) {
        // אם משום מה sent לא עודכן (מצבים נדירים), נוודא שחרור
        // (אבל במקרי הצלחה הוא מתעדכן לפני ה-finally)
      }
    }
  };

  const isDisabled =
    disabled || sent || sending || inFlightRef.current || !audience || audience.length === 0;

  /* ================= RENDER ================= */

  return (
    <button
      onClick={handleSend}
      disabled={isDisabled}
      className="
        w-full
        bg-green-600
        text-white
        py-4
        rounded-xl
        text-lg
        font-semibold
        disabled:opacity-50
        disabled:cursor-not-allowed
        transition
      "
    >
      {sent ? "נשלח ✓" : sending ? "שולח..." : children}
    </button>
  );
};

export default SendButton;