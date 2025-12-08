"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  invitationId: string;
}

export default function AddGuestModal({ onClose, onSuccess, invitationId }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);

    const res = await fetch(`/api/invitations/${invitationId}/guests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      onSuccess();
      onClose();
    } else {
      alert("שגיאה בשמירת מוזמן");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-96">
        <h2 className="text-xl font-semibold mb-4">הוספת מוזמן חדש</h2>

        <label className="text-sm">שם מלא</label>
        <input
          className="border w-full rounded px-3 py-2 mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="text-sm">טלפון</label>
        <input
          className="border w-full rounded px-3 py-2 mb-4"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
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
