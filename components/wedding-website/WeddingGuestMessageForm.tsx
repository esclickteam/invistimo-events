"use client";

import { useState } from "react";

type Props = {
  shareId: string;
  token: string;
  title?: string;
  description?: string;
};

export default function WeddingGuestMessageForm({
  shareId,
  token,
  title = "השאירו לנו כמה מילים ❤️",
  description = "נשמח לקרוא ברכה, איחול או הודעה מכם.",
}: Props) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function submitMessage() {
    if (saving) return;
    const text = message.trim();
    if (!text) {
      setError("כתבו הודעה לפני השליחה");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const res = await fetch(`/api/w/${shareId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, message: text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || "MESSAGE_FAILED");
      }

      setMessage("");
      setSaved(true);
    } catch {
      setError("לא הצלחנו לשלוח את ההודעה. נסו שוב.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div dir="rtl" id="guestbook" data-live="1" className="mx-auto max-w-lg px-4 pb-8">
      <div className="rounded-[32px] border border-black/10 bg-white/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
        <h2 className="text-center text-3xl font-black" data-ww-path="guestMessageTitle" data-ww-label="כותרת הודעה לזוג">
          {title}
        </h2>
        <p className="mt-2 text-center text-sm font-semibold text-black/55" data-ww-path="guestMessageDescription" data-ww-label="תיאור הודעה לזוג">
          {description}
        </p>

        {saved ? (
          <p className="mt-6 rounded-3xl bg-rose-50 px-5 py-6 text-center text-lg font-black text-rose-800">
            ההודעה נשלחה לזוג ❤️
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, 1000))}
              rows={3}
              maxLength={1000}
              placeholder="כתבו כאן..."
              className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm"
            />
            <p className="text-left text-xs text-black/35">{message.length}/1000</p>
            {error ? <p className="text-center text-sm font-bold text-red-600">{error}</p> : null}
            <button
              type="button"
              disabled={saving}
              onClick={submitMessage}
              className="min-h-[54px] w-full rounded-2xl bg-black text-base font-black text-white disabled:opacity-60"
            >
              {saving ? "שולח..." : "שליחת הודעה"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
