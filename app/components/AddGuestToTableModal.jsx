"use client";

import { useState, useMemo } from "react";
import { useSeatingStore } from "@/store/seatingStore";

/**
 * AddGuestToTableModal
 * ממשק הושבה מבוסס כרטיסיות — בלי שולחן גרפי
 */
export default function AddGuestToTableModal({ table, guests, onClose }) {
  const assignGuestsToTable = useSeatingStore((s) => s.assignGuestsToTable);
  const removeGuestFromTable = useSeatingStore((s) => s.removeGuestFromTable);

  const seated = table.seatedGuests || [];
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [error, setError] = useState("");

  // חישוב כמה אורח תופס לפי אישורי הגעה
  const getPartySize = (guest, assignedItem) => {
    const raw =
      assignedItem?.confirmedGuestsCount ??
      guest?.confirmedGuestsCount ??
      guest?.guestsCount ??
      guest?.count ??
      1;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  };

  // ספירה מדויקת של מקומות תפוסים
  const occupied = useMemo(() => {
    return seated.reduce((sum, s) => {
      const g = guests.find(
        (guest) => String(guest.id ?? guest._id) === String(s.guestId)
      );
      return sum + (g ? getPartySize(g, s) : 1);
    }, 0);
  }, [seated, guests]);

  const freeSeats = Math.max(0, table.seats - occupied);

  // בניית מערך מקומות ישיבה (כיסאות)
  const seatsArray = useMemo(() => {
    const arr = Array.from({ length: table.seats }, (_, i) => ({
      index: i,
      guest: null,
    }));

    seated.forEach((s) => {
      const g = guests.find(
        (guest) => String(guest.id ?? guest._id) === String(s.guestId)
      );
      if (!g) return;
      const count = getPartySize(g, s);
      for (let j = 0; j < count; j++) {
        const idx = s.seatIndex + j;
        if (idx < arr.length) arr[idx].guest = g;
      }
    });

    return arr;
  }, [seated, guests, table.seats]);

  const handleAddGuest = (seatIndex) => {
    if (!selectedGuest) {
      setError("יש לבחור אורח מהרשימה");
      return;
    }

    const guest = selectedGuest;
    const count = getPartySize(guest);
    if (count > freeSeats) {
      setError("אין מספיק מקומות פנויים");
      return;
    }

    assignGuestsToTable(table.id, guest.id, count, seatIndex);
    setSelectedGuest(null);
    setError("");
  };

  const handleRemoveGuest = (guestId) => {
    removeGuestFromTable(table.id, guestId);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-[500px] p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-3 text-center">
          הושבה לשולחן {table.name}
        </h2>

        <p className="text-sm text-gray-600 text-center mb-4">
          {occupied}/{table.seats} מקומות תפוסים
        </p>

        {/* בחירת אורח */}
        <select
          className="w-full border rounded-lg p-2 mb-4"
          value={selectedGuest?.id || ""}
          onChange={(e) =>
            setSelectedGuest(
              guests.find((g) => String(g.id) === e.target.value)
            )
          }
        >
          <option value="">בחר אורח להושבה...</option>
          {guests
            .filter(
              (g) =>
                !seated.find(
                  (s) => String(s.guestId) === String(g.id ?? g._id)
                )
            )
            .map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} — {getPartySize(g)} מקומות
              </option>
            ))}
        </select>

        {error && (
          <div className="text-red-600 bg-red-50 text-center py-1 rounded mb-3">
            {error}
          </div>
        )}

        {/* כרטיסיות ישיבה */}
        <div className="grid grid-cols-6 gap-2 justify-items-center">
          {seatsArray.map((seat, i) => {
            const g = seat.guest;
            return (
              <div
                key={i}
                onClick={() =>
                  g
                    ? handleRemoveGuest(g.id)
                    : selectedGuest && handleAddGuest(i)
                }
                className={`w-20 h-20 rounded-xl border flex flex-col items-center justify-center text-center text-sm cursor-pointer transition ${
                  g
                    ? "bg-gray-100 border-gray-300 hover:bg-red-100"
                    : selectedGuest
                    ? "bg-blue-50 border-blue-300 hover:bg-blue-100"
                    : "bg-white border-gray-200"
                }`}
              >
                {g ? (
                  <>
                    <span className="font-medium text-gray-800 truncate w-[90%]">
                      {g.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({getPartySize(g)} מקומות)
                    </span>
                    <span className="text-xs text-red-500 mt-1">הסר</span>
                  </>
                ) : (
                  <span className="text-gray-400 text-xs">
                    הוסף<br />אורח
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* כפתור סגירה */}
        <div className="flex justify-center mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
