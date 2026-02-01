"use client";

import { useState } from "react";

const STATUS_OPTIONS = [
  { value: "answered", label: "ענה" },
  { value: "no_answer", label: "לא ענה" },
  { value: "will_reply", label: "ישיב בהודעה" },
];

export default function CallRoundsModal({ guest, onClose, onUpdated }) {
  const [rounds, setRounds] = useState(() => {
    // אם כבר יש סבבים ב־DB – נטען אותם
    if (Array.isArray(guest.callRounds) && guest.callRounds.length) {
      return [1, 2, 3].map((i) => {
        const existing = guest.callRounds.find(
          (r) => r.roundNumber === i
        );
        return (
          existing || {
            roundNumber: i,
            status: null,
            notes: "",
          }
        );
      });
    }

    // אחרת – ברירת מחדל
    return [1, 2, 3].map((i) => ({
      roundNumber: i,
      status: null,
      notes: "",
    }));
  });

  const updateRound = (index, patch) => {
    setRounds((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, ...patch } : r
      )
    );
  };

  const save = async () => {
    const res = await fetch(`/api/guests/${guest._id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callRounds: rounds.map((r) => ({
          ...r,
          calledAt: r.status ? new Date().toISOString() : null,
        })),
      }),
    });

    const data = await res.json();

    if (data.success) {
      onUpdated?.(data.guest);
      onClose();
    } else {
      alert("❌ שגיאה בשמירת סבבי השיחה");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-xl w-full max-w-md p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">📞 מעקב שיחות</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          {guest.name} · {guest.phone}
        </div>

        {/* Rounds */}
        {rounds.map((round, index) => (
          <div key={round.roundNumber} className="border rounded-lg p-3 mb-3">
            <div className="font-medium mb-2">
              סבב {round.roundNumber}
            </div>

            <div className="flex gap-4 mb-2 flex-wrap">
              {STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-1 text-sm"
                >
                  <input
                    type="radio"
                    name={`round-${round.roundNumber}`}
                    checked={round.status === opt.value}
                    onChange={() =>
                      updateRound(index, { status: opt.value })
                    }
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            <textarea
              placeholder="הערות…"
              className="w-full border rounded-md p-2 text-sm"
              rows={2}
              value={round.notes}
              onChange={(e) =>
                updateRound(index, { notes: e.target.value })
              }
            />
          </div>
        ))}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border"
          >
            סגור
          </button>
          <button
            onClick={save}
            className="px-4 py-2 rounded-md bg-black text-white"
          >
            שמור
          </button>
        </div>
      </div>
    </div>
  );
}
