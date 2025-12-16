"use client";

import { useState, useMemo } from "react";
import { useSeatingStore } from "@/store/seatingStore";

/**
 * AddGuestToTableModal – גרסה מלאה
 * ניהול הושבה מבוסס כרטיסיות בלבד
 */
export default function AddGuestToTableModal({ table, guests, onClose }) {
  const assignGuestsToTable = useSeatingStore((s) => s.assignGuestsToTable);
  const removeGuestFromTable = useSeatingStore((s) => s.removeGuestFromTable);

  const seated = table.seatedGuests || [];
  const [openSeat, setOpenSeat] = useState(null); // index פתוח לבחירת אורח
  const [error, setError] = useState("");

  // כמה מקומות אורח תופס בפועל
  const getPartySize = (guest) => {
    const raw =
      guest?.confirmedGuestsCount ??
      guest?.guestsCount ??
      guest?.count ??
      1;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  };

  // ספירת מקומות תפוסים בפועל
  const occupied = useMemo(() => {
    return seated.reduce((sum, s) => {
      const g = guests.find(
        (guest) => String(guest.id ?? guest._id) === String(s.guestId)
      );
      return sum + (g ? getPartySize(g) : 1);
    }, 0);
  }, [seated, guests]);

  const freeSeats = Math.max(0, table.seats - occupied);

  // בניית מערך כרטיסיות
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
      const count = getPartySize(g);
      for (let j = 0; j < count; j++) {
        const idx = s.seatIndex + j;
        if (idx < arr.length) arr[idx].guest = g;
      }
    });

    return arr;
  }, [seated, guests, table.seats]);

  // הושבת אורח
  const handleSeatGuest = (seatIndex, guest) => {
    const count = getPartySize(guest);
    if (count > freeSeats) {
      setError("אין מספיק מקומות פנויים");
      return;
    }

    assignGuestsToTable(table.id, guest.id, count, seatIndex);
    setOpenSeat(null);
    setError("");
  };

  // הסרת אורח
  const handleRemoveGuest = (guestId) => {
    removeGuestFromTable(table.id, guestId);
  };

  // אורחים שעדיין לא הושבו
  const availableGuests = guests.filter(
    (g) => !seated.find((s) => String(s.guestId) === String(g.id ?? g._id))
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-[520px] p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-3 text-center">
          הושבה לשולחן {table.name}
        </h2>

        <p className="text-sm text-gray-600 text-center mb-4">
          {occupied}/{table.seats} מקומות תפוסים
        </p>

        {error && (
          <div className="text-red-600 bg-red-50 text-center py-1 rounded mb-3">
            {error}
          </div>
        )}

        {/* רשת הכיסאות */}
        <div className="grid grid-cols-6 gap-3 justify-items-center">
          {seatsArray.map((seat, i) => {
            const g = seat.guest;
            const isOpen = openSeat === i;

            return (
              <div
                key={i}
                className={`relative w-20 h-20 rounded-xl border flex flex-col items-center justify-center text-center text-sm cursor-pointer transition ${
                  g
                    ? "bg-gray-100 border-gray-400"
                    : "bg-white border-gray-200 hover:bg-blue-50"
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
                    <button
                      onClick={() => handleRemoveGuest(g.id)}
                      className="text-xs text-red-600 mt-1 hover:underline"
                    >
                      הסר הושבה
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      onClick={() => setOpenSeat(isOpen ? null : i)}
                      className="text-gray-400 text-xs"
                    >
                      הושב<br />אורח
                    </span>

                    {/* תפריט בחירה קטן שמופיע רק כשנבחר */}
                    {isOpen && (
                      <div className="absolute top-full mt-2 bg-white border shadow-lg rounded-md w-40 z-50 max-h-56 overflow-y-auto">
                        {availableGuests.length === 0 && (
                          <div className="p-2 text-xs text-gray-400 text-center">
                            אין אורחים זמינים
                          </div>
                        )}
                        {availableGuests.map((g2) => (
                          <div
                            key={g2.id}
                            onClick={() => handleSeatGuest(i, g2)}
                            className="p-2 hover:bg-blue-50 cursor-pointer text-xs text-gray-700"
                          >
                            {g2.name} – {getPartySize(g2)} מקומות
                          </div>
                        ))}
                      </div>
                    )}
                  </>
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
