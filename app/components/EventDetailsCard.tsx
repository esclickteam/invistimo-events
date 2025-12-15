"use client";

import { useState } from "react";

export default function EventDetailsCard({
  invitation,
  onSaved,
}: {
  invitation: any;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: invitation.title || "",
    eventType: invitation.eventType || "",
    date: invitation.eventDate
      ? invitation.eventDate.slice(0, 10)
      : "",
  });

  async function save() {
    try {
      setSaving(true);

      // מחברים date לשדה האמיתי במודל
      const payload: any = {
        title: form.title,
        eventType: form.eventType,
      };

      if (form.date) {
        payload.eventDate = new Date(form.date).toISOString();
      }

      const res = await fetch(`/api/invitations/${invitation._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        alert("❌ שגיאה בשמירת פרטי האירוע");
        return;
      }

      setEditing(false);
      onSaved(); // 🔄 רענון הזמנה → מפעיל EventCountdown
    } catch (err) {
      console.error(err);
      alert("❌ שגיאת שרת");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border rounded-2xl p-6 mb-10 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">📋 פרטי האירוע</h2>

        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-[#8f7a67] hover:underline"
          >
            ✏️ עריכה
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => {
                setEditing(false);
                setForm({
                  title: invitation.title || "",
                  eventType: invitation.eventType || "",
                  date: invitation.eventDate
                    ? invitation.eventDate.slice(0, 10)
                    : "",
                });
              }}
              className="text-sm text-gray-500 hover:underline"
            >
              ביטול
            </button>

            <button
              onClick={save}
              disabled={saving}
              className="text-sm font-semibold text-[#c9b48f]"
            >
              {saving ? "שומר..." : "שמירה"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* שם האירוע */}
        <input
          value={form.title}
          onChange={(e) =>
            setForm({ ...form, title: e.target.value })
          }
          placeholder="שם האירוע"
          readOnly={!editing}
          className={`border rounded-full px-4 py-3 ${
            editing ? "bg-white" : "bg-gray-50"
          }`}
        />

        {/* סוג אירוע */}
        {editing ? (
          <select
            value={form.eventType}
            onChange={(e) =>
              setForm({ ...form, eventType: e.target.value })
            }
            className="border rounded-full px-4 py-3 bg-white"
          >
            <option value="">סוג אירוע</option>
            <option value="wedding">חתונה</option>
            <option value="bar">בר / בת מצווה</option>
            <option value="birthday">יום הולדת</option>
            <option value="business">אירוע עסקי</option>
            <option value="other">אחר</option>
          </select>
        ) : (
          <input
            value={form.eventType}
            readOnly
            placeholder="סוג אירוע"
            className="border rounded-full px-4 py-3 bg-gray-50"
          />
        )}

        {/* תאריך */}
        <input
          type="date"
          value={form.date}
          onChange={(e) =>
            setForm({ ...form, date: e.target.value })
          }
          readOnly={!editing}
          className={`border rounded-full px-4 py-3 ${
            editing ? "bg-white" : "bg-gray-50"
          }`}
        />
      </div>
    </div>
  );
}
