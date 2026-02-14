"use client";

import { ReactNode, useState } from "react";

type Props = {
  channel: "sms" | "whatsapp";
  type: "rsvp" | "reminder" | "thankyou";

  audience: string[];          // IDs של אורחים בסבב הנוכחי
  scheduledAt: Date | null;    // null = שליחה מיידית

  // 👇 חובה ל־WhatsApp RSVP
  templateName?: string;

  disabled?: boolean;
  children: ReactNode;
};

export default function SendButton({
  channel,
  type,
  audience,
  scheduledAt,
  templateName,
  disabled,
  children,
}: Props) {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (disabled || sending) return;

    // 🔹 אין נמענים – חסום
    if (audience.length === 0) {
      alert("❌ אין נמענים לשליחה בסבב זה");
      return;
    }

    // 🔹 WhatsApp RSVP חייב template
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
          channel,        // sms | whatsapp
          type,           // rsvp | reminder | thankyou
          templateName,   // רק ל־WhatsApp RSVP
          audience,       // guestIds של הסבב
          scheduledAt,    // null = מיידית
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
      {sending ? "שולח..." : children}
    </button>
  );
}
