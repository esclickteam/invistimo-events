"use client";

import { useLiveSeating } from "./LiveSeatingProvider";
import type { LiveGuest } from "./types";

export default function GuestListLive() {
  const { state, markArrived } = useLiveSeating();

  const guests = state?.guests ?? [];

  return (
    <div className="w-80 border-r p-4">
      <h3 className="font-bold mb-2">אורחים</h3>

      {guests.length === 0 ? (
        <div className="text-sm text-gray-500">
          אין עדיין אורחים בלייב. ייבאי מוזמנים + הושבה כדי להתחיל.
        </div>
      ) : (
        guests.map((g: LiveGuest) => {
          // ✅ תמיכה גם ב-id ישן וגם ב-_id החדש (כדי שלא יישבר לך כלום)
          const guestId = (g as any)._id ?? (g as any).id;

          // ✅ שמות שדות עקביים לתצוגה
          const name = (g as any).fullName ?? (g as any).name ?? "";
          const approved =
            (g as any).approvedCount ?? (g as any).approved ?? 0;

          const arrived = (g as any).arrived ?? 0;

          return (
            <div
              key={guestId}
              className={`p-2 mb-2 rounded ${
                arrived > 0 ? "bg-green-100" : "bg-gray-100"
              }`}
            >
              <div className="font-medium">{name}</div>

              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={approved}
                  value={arrived}
                  onChange={(e) =>
                    markArrived(guestId, Number(e.target.value))
                  }
                  className="w-20 rounded border px-2 py-1"
                />
                <span className="text-sm text-gray-600">/ {approved}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
