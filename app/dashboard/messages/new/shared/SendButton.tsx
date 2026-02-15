"use client";

import { ReactNode, useState } from "react";

/* ================= TYPES ================= */

type Props = {
  channel: "sms" | "whatsapp";
  type: "rsvp" | "reminder" | "thankyou";

  invitationId?: string;
  audience: string[];
  scheduledAt: Date | null;

  templateName?: string;
  disabled?: boolean;
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
  onAfterSend,
  children,
}) => {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (disabled || sending) return;

    if (audience.length === 0) {
      alert("❌ אין נמענים לשליחה בסבב זה");
      return;
    }

    /* ===== WhatsApp RSVP validations ===== */
    if (channel === "whatsapp" && type === "rsvp") {
      if (!templateName) {
        alert("❌ חסרה תבנית WhatsApp לאישור הגעה");
        return;
      }
      if (!invitationId) {
        alert("❌ חסר מזהה הזמנה (invitationId)");
        return;
      }
    }

    setSending(true);

    try {
      let endpoint = "";
      let payload: any = {};

      /* ================= SMS ================= */
      if (channel === "sms") {
        endpoint = "/api/sms/send";

        payload = {
          invitationId,
          templateKey: type === "reminder" ? "table" : type,
          guestIds: audience,
          scheduledAt,
        };
      }

      /* ================= WHATSAPP RSVP ================= */
      if (channel === "whatsapp" && type === "rsvp") {
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

      /* ================= SERVER BLOCKS ================= */

      if (
        res.status === 409 ||
        data?.error === "RSVP_ALREADY_SENT" ||
        data?.error === "RSVP_ROUND_ALREADY_SENT"
      ) {
        alert("ℹ️ סבב זה כבר נשלח ולא ניתן לשלוח שוב");
        onAfterSend?.();
        return;
      }

      if (!res.ok || !data?.success) {
        alert(data?.error || "❌ שליחת ההודעות נכשלה");
        return;
      }

      /* ================= SUCCESS ================= */

      alert(
        scheduledAt
          ? "⏱️ ההודעות תוזמנו בהצלחה"
          : `✅ נשלחו ${data.sent ?? audience.length} הודעות בהצלחה`
      );

      onAfterSend?.();
    } catch (err) {
      console.error("SEND ERROR:", err);
      alert("❌ שגיאה בשליחה");
    } finally {
      setSending(false);
    }
  };

  /* ================= RENDER ================= */

  return (
    <button
      onClick={handleSend}
      disabled={disabled || sending || audience.length === 0}
      className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-semibold
                 disabled:opacity-50 disabled:cursor-not-allowed transition"
    >
      {sending ? "שולח..." : children}
    </button>
  );
};

export default SendButton;
