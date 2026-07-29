"use client";

import { useState } from "react";

type Channel = "whatsapp" | "sms";

type GuestLike = {
  _id: string;
  name?: string;
  phone?: string;
};

type Props = {
  guest: GuestLike;
  onClose: () => void;
};

export default function SendRsvpInviteModal({ guest, onClose }: Props) {
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/guests/${guest._id}/send-rsvp-invite`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        setError(
          data?.message ||
            data?.error ||
            "שליחת ההזמנה נכשלה. נסי שוב בעוד רגע."
        );
        return;
      }

      alert(
        channel === "whatsapp"
          ? `ההזמנה לאישור הגעה נשלחה בוואטסאפ ל-${guest.name || "האורח"}`
          : `ההזמנה לאישור הגעה נשלחה ב-SMS ל-${guest.name || "האורח"}`
      );

      onClose();
    } catch {
      setError("שליחת ההזמנה נכשלה. נסי שוב בעוד רגע.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1E1B2E]/55 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-lg font-bold text-gray-900">
          שליחת הזמנה לאישור הגעה
        </h3>

        <p className="mb-4 text-sm text-gray-600">
          שליחה מיידית ל-{guest.name || "האורח"} עם תבנית סבב 1 והקישור האישי.
          לא משפיע על סבבי ההודעות.
        </p>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setChannel("whatsapp")}
            className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
              channel === "whatsapp"
                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            WhatsApp
          </button>

          <button
            type="button"
            onClick={() => setChannel("sms")}
            className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
              channel === "sms"
                ? "border-sky-600 bg-sky-50 text-sky-800"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            SMS
          </button>
        </div>

        {error ? (
          <p className="mb-3 text-sm text-red-600">{error}</p>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSend}
            disabled={loading}
            className="flex-1 rounded-xl bg-[#1E1B2E] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "שולח..." : "שליחה מיידית"}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
