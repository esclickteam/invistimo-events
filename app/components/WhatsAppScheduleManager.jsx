"use client";

import React, { useState } from "react";

export default function WhatsAppScheduleManager({
  invitationId,
  type, // "rsvp" | "reminder" | "thankyou"
  existingSchedule, // אובייקט מהשרת אם כבר קיים
  audience = [],
  onUpdated,
}) {
  const [scheduledAt, setScheduledAt] = useState(
    existingSchedule?.scheduledAt
      ? new Date(existingSchedule.scheduledAt).toISOString().slice(0, 16)
      : ""
  );

  const [loading, setLoading] = useState(false);

  const isEditable =
    !existingSchedule ||
    (existingSchedule.status === "pending" && !existingSchedule.lockedAt);

  // ================= CREATE / UPDATE =================

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
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      alert("נשמר בהצלחה");
      onUpdated?.(data);
    } catch (err) {
      alert("שגיאה: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ================= CANCEL =================

  async function handleCancel() {
    if (!confirm("לבטל את ההודעה המתוזמנת?")) return;

    setLoading(true);

    try {
      const res = await fetch(
        `/api/scheduled-messages/${existingSchedule._id}/cancel`,
        { method: "POST" }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("בוטל");
      onUpdated?.(null);
    } catch (err) {
      alert("שגיאה: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ================= UI =================

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
        disabled={!isEditable}
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