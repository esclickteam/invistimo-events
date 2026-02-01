"use client";

export default function CallRoundsModal({ guest, onClose, onUpdated }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-xl w-full max-w-md p-6">

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            📞 מעקב שיחות
          </h2>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          {guest.name} · {guest.phone}
        </div>

        {[1, 2, 3].map((round) => (
          <div key={round} className="border rounded-lg p-3 mb-3">
            <div className="font-medium mb-2">
              סבב {round}
            </div>

            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-1">
                <input type="radio" name={`r${round}`} />
                ענה
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" name={`r${round}`} />
                לא ענה
              </label>
            </div>

            <textarea
              placeholder="הערות…"
              className="w-full border rounded-md p-2 text-sm"
              rows={2}
            />
          </div>
        ))}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
