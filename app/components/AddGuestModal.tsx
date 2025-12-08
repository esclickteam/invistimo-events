"use client";

import { useState } from "react";

interface AddGuestModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddGuestModal({ onClose, onSuccess }: AddGuestModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!name || !phone) return alert("נא למלא שם וטלפון");

    setLoading(true);

    const res = await fetch("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      alert(data.error || "שגיאה לא צפויה");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-[400px] animate-fadeIn">

        <h2 className="text-xl font-bold mb-4 text-center">הוספת מוזמן חדש</h2>

        <label className="text-sm text-gray-600">שם מלא</label>
        <input
          className="w-full border rounded px-3 py-2 mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="לדוגמה: דני כהן"
        />

        <label className="text-sm text-gray-600">טלפון</label>
        <input
          className="w-full border rounded px-3 py-2 mb-4"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="לדוגמה: 0501234567"
        />

        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 bg-gray-200 rounded"
            onClick={onClose}
          >
            ביטול
          </button>

          <button
            className="px-4 py-2 bg-black text-white rounded"
            onClick={save}
            disabled={loading}
          >
            {loading ? "שומר..." : "שמור"}
          </button>
        </div>

      </div>
    </div>
  );
}
