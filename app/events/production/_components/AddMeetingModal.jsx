"use client";

import { useState } from "react";

export default function AddMeetingModal({
  eventId,
  date,
  onClose,
  onSave,
}) {
  const [entityName, setEntityName] = useState("");
  const [time, setTime] = useState("12:00");
  const [entityType, setEntityType] = useState("couple");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!entityName.trim()) {
      setError("יש להזין נושא / שם לפגישה");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // בניית תאריך yyyy-mm-dd
      const d = new Date(date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");

      const payload = {
        type: "meeting",
        entityType,
        entityName,
        date: `${yyyy}-${mm}-${dd}`,
        summary,
      };

      const res = await fetch(
        `/api/events/${eventId}/conversations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.error || "CREATE_FAILED");
      }

      // מחזירים את ה־conversation שנוצר
      onSave(data.conversation);
      onClose();
    } catch (err) {
      console.error("❌ create meeting failed:", err);
      setError("שגיאה ביצירת הפגישה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
        <h4 className="font-semibold text-lg">פגישה חדשה</h4>

        {/* Entity name */}
        <input
          className="border rounded p-2 w-full"
          placeholder="עם מי / נושא הפגישה"
          value={entityName}
          onChange={(e) => setEntityName(e.target.value)}
        />

        {/* Time (UI בלבד, לא נשמר כרגע) */}
        <input
          type="time"
          className="border rounded p-2 w-full"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />

        {/* Entity type */}
        <select
          className="border rounded p-2 w-full"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        >
          <option value="couple">פגישה עם הזוג</option>
          <option value="supplier">פגישה עם ספק</option>
          <option value="venue">פגישה עם אולם</option>
          <option value="other">אחר</option>
        </select>

        {/* Summary */}
        <textarea
          className="border rounded p-2 w-full"
          placeholder="סיכום / הערות"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />

        {error && (
          <div className="text-sm text-red-600">{error}</div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="text-gray-500"
            disabled={saving}
          >
            ביטול
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? "שומר…" : "שמור"}
          </button>
        </div>
      </div>
    </div>
  );
}
