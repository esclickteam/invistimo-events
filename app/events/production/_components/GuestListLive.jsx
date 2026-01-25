"use client";

import { useLiveGuests } from "./LiveGuestsProvider";
import { useSeatingStore } from "@/store/seatingStore";

export default function GuestListLive() {
  const { guests, markArrived } = useLiveGuests();

  // 🔄 סנכרון ללייב Seating (צרכן בלבד)
  const updateGuestArrived = useSeatingStore(
    (s) => s.updateGuestArrived
  );

  if (!guests || !guests.length) {
    return (
      <div className="p-4 text-gray-500">
        אין אורחים להצגה
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto border rounded">
      {guests.map((guest) => {
        const canDecrease = guest.arrived > 0;
        const canIncrease = guest.arrived < guest.approved;

        return (
          <div
            key={guest.id}
            className="flex items-center justify-between px-4 py-3 border-b last:border-b-0"
          >
            {/* 👤 פרטי אורח */}
            <div className="min-w-0">
              <div className="font-semibold truncate">
                {guest.name}
              </div>
              {guest.phone && (
                <div className="text-xs text-gray-500">
                  {guest.phone}
                </div>
              )}
            </div>

            {/* 📊 לייב – הגיעו בפועל */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                {guest.approved} מגיעים
              </span>

              <button
                disabled={!canDecrease}
                onClick={() => {
                  const next = guest.arrived - 1;
                  markArrived(guest.id, next);
                  updateGuestArrived(guest.id, next);
                }}
                className="w-7 h-7 rounded border text-sm disabled:opacity-40"
              >
                −
              </button>

              <span className="w-6 text-center font-semibold">
                {guest.arrived}
              </span>

              <button
                disabled={!canIncrease}
                onClick={() => {
                  const next = guest.arrived + 1;
                  markArrived(guest.id, next);
                  updateGuestArrived(guest.id, next);
                }}
                className="w-7 h-7 rounded border text-sm disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
