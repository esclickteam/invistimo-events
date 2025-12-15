"use client";

import { useState } from "react";

export default function EventDetailsModal({
  invitation,
  onClose,
  onSaved,
}: {
  invitation: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: invitation.title || "",
    type: invitation.type || "",
    date: invitation.date?.slice(0, 10) || "",
    time: invitation.time || "",
    location: invitation.location || "",
  });

  async function save() {
    await fetch(`/api/invitations/${invitation._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4">✏️ עריכת פרטי האירוע</h2>

        <div className="grid grid-cols-1 gap-3">
          <input
            placeholder="שם האירוע"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="border rounded-full px-4 py-3"
          />

          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="border rounded-full px-4 py-3"
          />

          <input
            type="time"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
            className="border rounded-full px-4 py-3"
          />

          <input
            placeholder="מיקום האירוע"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="border rounded-full px-4 py-3"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="text-gray-500">
            ביטול
          </button>
          <button
            onClick={save}
            className="bg-[#c9b48f] text-white px-6 py-2 rounded-full font-semibold"
          >
            שמירה
          </button>
        </div>
      </div>
    </div>
  );
}
