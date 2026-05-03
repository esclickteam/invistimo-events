"use client";

import React, { useState, useEffect } from "react";

/* ================= TYPES ================= */

type ScheduleStatus = "pending" | "sent" | "cancelled";

type ExistingSchedule = {
  _id: string;
  scheduledAt: string;
  status: ScheduleStatus;
  lockedAt?: string | null;
};

type Props = {
  invitationId: string;
  type: "rsvp" | "reminder" | "thankyou";
  existingSchedule?: ExistingSchedule | null;
  audience?: string[];
  round?: 1 | 2;
  onUpdated?: (data: any) => void;
};

/* ================= COMPONENT ================= */

export default function WhatsAppScheduleManager({
  invitationId,
  type,
  existingSchedule,
  audience = [],
  round,
  onUpdated,
}: Props) {
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [loading, setLoading] = useState(false);

  /* ================= SYNC EXISTING ================= */

  useEffect(() => {
    if (existingSchedule?.scheduledAt) {
      setScheduledAt(
        new Date(existingSchedule.scheduledAt)
          .toISOString()
          .slice(0, 16)
      );
    } else {
      setScheduledAt("");
    }
  }, [existingSchedule]);

  const isEditable =
    !existingSchedule ||
    (existingSchedule.status === "pending" && !existingSchedule.lockedAt);

  /* ================= CREATE / UPDATE ================= */

  async function handleSave() {
    if (!scheduledAt) return alert("בחרי תאריך");

    setLoading(true);

    try {
      const res = await fetch("/api/scheduled-messages/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId,
          type,
          channel: "whatsapp",
          audience,
          scheduledAt: new Date(scheduledAt),
          round: round ?? 1, // 🔥 תיקון
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "שגיאה בשמירה");

      alert("נשמר בהצלחה");
      onUpdated?.(data);
    } catch (err: any) {
      alert("שגיאה: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  /* ================= CANCEL ================= */

  async function handleCancel() {
    if (!existingSchedule?._id) return;
    if (!confirm("לבטל את ההודעה המתוזמנת?")) return;

    setLoading(true);

    try {
      const res = await fetch(
        `/api/scheduled-messages/${existingSchedule._id}/cancel`,
        { method: "POST" }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "שגיאה בביטול");

      alert("בוטל");
      onUpdated?.(null);
    } catch (err: any) {
      alert("שגיאה: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  /* ================= UI ================= */

  return (
    <div className="border rounded-xl p-4 space-y-4 bg-white">
      <h3 className="font-semibold text-lg">תזמון הודעת WhatsApp</h3>

      {/* מצב קיים */}
      {existingSchedule && (
        <div className="text-sm text-gray-600">
          סטטוס:{" "}
          <span className="font-semibold">
            {existingSchedule.status === "pending" && "מתוזמן"}
            {existingSchedule.status === "sent" && "נשלח"}
            {existingSchedule.status === "cancelled" && "בוטל"}
          </span>
        </div>
      )}

      {/* בחירת זמן */}
      <input
        type="datetime-local"
        value={scheduledAt}
        onChange={(e) => setScheduledAt(e.target.value)}
        disabled={!isEditable || loading}
        className="border rounded-lg p-2 w-full"
      />

      {/* כפתורים */}
      <div className="flex gap-2">
        {isEditable && (
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            {existingSchedule ? "עדכן מועד" : "קבע תזמון"}
          </button>
        )}

        {existingSchedule &&
          existingSchedule.status === "pending" &&
          !existingSchedule.lockedAt && (
            <button
              onClick={handleCancel}
              disabled={loading}
              className="bg-red-500 text-white px-4 py-2 rounded-lg"
            >
              בטל הודעה
            </button>
          )}
      </div>
    </div>
  );
}