"use client";

import { useState } from "react";

export default function AddMeetingModal({ date, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("12:00");
  const [type, setType] = useState("couple");
  const [notes, setNotes] = useState("");

  function handleSave() {
    const start = new Date(date);
    const [h, m] = time.split(":");
    start.setHours(h, m);

    onSave({
      title,
      start,
      color:
        type === "couple"
          ? "#2563eb"
          : type === "supplier"
          ? "#16a34a"
          : "#f97316",
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
        <h4 className="font-semibold text-lg">פגישה חדשה</h4>

        <input
          className="border rounded p-2 w-full"
          placeholder="נושא הפגישה"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          type="time"
          className="border rounded p-2 w-full"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />

        <select
          className="border rounded p-2 w-full"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="couple">פגישה עם הזוג</option>
          <option value="supplier">פגישה עם ספק</option>
          <option value="general">פגישה כללית</option>
        </select>

        <textarea
          className="border rounded p-2 w-full"
          placeholder="הערות"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="text-gray-500">
            ביטול
          </button>
          <button
            onClick={handleSave}
            className="bg-black text-white px-4 py-2 rounded"
          >
            שמור
          </button>
        </div>
      </div>
    </div>
  );
}
