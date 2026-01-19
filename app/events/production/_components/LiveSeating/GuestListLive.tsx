"use client";

import { useSeatingStore } from "@/store/seatingStore";
import type { LiveGuest } from "./types";

export default function GuestListLive() {
  const guests = useSeatingStore((s) => s.guests);
  const updateGuestArrived = useSeatingStore(
    (s) => s.updateGuestArrived
  );

  return (
    <div className="w-80 border-r p-4 overflow-y-auto">
      <h3 className="font-bold mb-3">אורחים</h3>

      {guests.length === 0 ? (
        <div className="text-sm text-gray-500">
          אין עדיין אורחים בלייב. ייבאי מוזמנים + הושבה כדי להתחיל.
        </div>
      ) : (
        guests.map((g: LiveGuest) => {
          // 🔑 מזהה בטוח
          const guestId = (g as any)._id ?? (g as any).id;

          // 🧾 שדות עקביים
          const name =
            (g as any).fullName ??
            (g as any).name ??
            "אורח";

          const approved =
            (g as any).approvedCount ??
            (g as any).approved ??
            0;

          const arrived = (g as any).arrived ?? 0;

          return (
            <div
              key={guestId}
              className={`p-3 mb-2 rounded-lg transition ${
                arrived > 0
                  ? "bg-green-100"
                  : "bg-gray-100"
              }`}
            >
              <div className="font-medium mb-1">
                {name}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={approved}
                  value={arrived}
                  onChange={(e) =>
                    updateGuestArrived(
                      guestId,
                      Number(e.target.value)
                    )
                  }
                  className="w-20 rounded border px-2 py-1 text-sm"
                />
                <span className="text-sm text-gray-600">
                  / {approved}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
