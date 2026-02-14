"use client";

import { ReactNode, useState } from "react";

type Props = {
  channel: "sms" | "whatsapp";
  type: "rsvp" | "reminder" | "thankyou";

  audience: string[];
  scheduledAt: Date | null;

  templateName?: string;
  disabled?: boolean;
  children: ReactNode;
};

// השתמש ב־React.FC<Props> כדי TypeScript ידע שיש children
const SendButton: React.FC<Props> = ({
  channel,
  type,
  audience,
  scheduledAt,
  templateName,
  disabled,
  children,
}) => {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (disabled || sending) return;
    if (audience.length === 0) {
      alert("❌ אין נמענים לשליחה בסבב זה");
      return;
    }
    if (channel === "whatsapp" && type === "rsvp" && !templateName) {
      alert("❌ חסרה תבנית WhatsApp לאישור הגעה");
      return;
    }

    setSending(true);

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          type,
          templateName,
          audience,
          scheduledAt,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        alert(data?.error || "❌ שליחת ההודעות נכשלה");
        return;
      }

      alert(
        scheduledAt
          ? "⏱️ ההודעות תוזמנו בהצלחה"
          : `✅ נשלחו ${audience.length} הודעות בהצלחה`
      );
    } catch (err) {
      console.error("SEND ERROR:", err);
      alert("❌ שגיאה בשליחה");
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      onClick={handleSend}
      disabled={disabled || sending || audience.length === 0}
      className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
    >
      {sending ? "שולח..." : children}
    </button>
  );
};

export default SendButton;
