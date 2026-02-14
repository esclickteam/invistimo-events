"use client";

import { ReactNode, useState } from "react";

type Props = {
  channel: "sms" | "whatsapp";
  type: "rsvp" | "reminder" | "thankyou";

  audience: string[];          // IDs של אורחים
  scheduledAt: Date | null;    // null = שליחה מיידית

  disabled?: boolean;

  children: ReactNode;
};

export default function SendButton({
  channel,
  type,
  audience,
  scheduledAt,
  disabled,
  children,
}: Props) {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (disabled || sending) return;

    if (audience.length === 0) {
      alert("לא נבחרו אורחים לשליחה");
      return;
    }

    setSending(true);

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,          // sms | whatsapp
          type,             // rsvp | reminder | thankyou
          audience,         // guestIds
          scheduledAt,      // null או Date
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        alert(data?.error || "שליחת ההודעות נכשלה");
        return;
      }

      if (scheduledAt) {
        alert("⏱️ ההודעה תוזמנה בהצלחה");
      } else {
        alert("✅ ההודעות נשלחו בהצלחה");
      }
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
      disabled={disabled || sending}
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
