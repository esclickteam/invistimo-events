"use client";

import { useState } from "react";

type Guest = {
  name?: string;
  token: string;
  rsvp?: "yes" | "no" | "pending" | null;
  guestsCount?: number;
};

type Props = {
  shareId: string;
  guest: Guest;
};

export default function WeddingGuestRsvpBar({ shareId, guest }: Props) {
  const [rsvp, setRsvp] = useState(guest.rsvp || "pending");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(nextRsvp: "yes" | "no") {
    if (saving) return;

    try {
      setSaving(true);
      setMessage("");

      const res = await fetch(`/api/invite/${shareId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: guest.token,
          rsvp: nextRsvp,
          arrivedCount: nextRsvp === "yes" ? guest.guestsCount || 1 : 0,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || "RSVP_FAILED");
      }

      setRsvp(nextRsvp);
      setMessage(nextRsvp === "yes" ? "אישור ההגעה נשמר. מחכים לכם!" : "עדכנו שלא תוכלו להגיע.");
    } catch {
      setMessage("לא הצלחנו לשמור את האישור. נסו שוב.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-white/20 bg-black/75 px-4 py-4 text-white backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black">{guest.name ? `היי ${guest.name}` : "אישור הגעה"}</p>
          <p className="mt-1 text-xs text-white/70">
            {rsvp === "yes"
              ? "אישרתם הגעה"
              : rsvp === "no"
                ? "סימנתם שלא מגיעים"
                : "אשרו הגעה ישירות מהאתר האישי"}
          </p>
          {message ? <p className="mt-1 text-xs text-[#E8D5A8]">{message}</p> : null}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => submit("yes")}
            className="rounded-full bg-white px-5 py-2 text-sm font-black text-black disabled:opacity-60"
          >
            מגיעים
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => submit("no")}
            className="rounded-full border border-white/40 px-5 py-2 text-sm font-black text-white disabled:opacity-60"
          >
            לא מגיעים
          </button>
        </div>
      </div>
    </div>
  );
}
