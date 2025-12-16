"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { useSeatingStore } from "@/store/seatingStore";

/**
 * מודאל הושבה מעוצב ומסונכרן לחלוטין
 * - מציג כיסאות אמיתיים לפי מצב השולחן מה־store
 * - בחירה מאורחים שטרם הושבו
 * - תפיסת רצף לפי מספר המקומות
 * - עדכון בזמן אמת עם השולחן
 */
export default function AddGuestToTableModal({ table, guests, onClose }) {
  const assignGuestsToTable = useSeatingStore((s) => s.assignGuestsToTable);
  const removeGuestFromTable = useSeatingStore((s) => s.removeGuestFromTable);

  // ✅ מאזין לשולחן המעודכן בזמן אמת
  const tableData = useSeatingStore(
    (s) => s.tables.find((t) => t.id === table.id)
  );
  const tableGuests = useSeatingStore((s) => s.guests);

  const [openSeat, setOpenSeat] = useState(null);
  const [error, setError] = useState("");

  const getPartySize = (guest) => {
    const n =
      guest?.confirmedGuestsCount ?? guest?.guestsCount ?? guest?.count ?? 1;
    return Number(n) > 0 ? Number(n) : 1;
  };

  // ✅ חישוב מושבים מעודכן בכל שינוי
  const seatsArray = useMemo(() => {
    if (!tableData) return [];
    const arr = Array.from({ length: tableData.seats }, (_, i) => ({
      index: i,
      guest: null,
    }));

    tableData.seatedGuests.forEach((seat) => {
      const g = tableGuests.find(
        (guest) => String(guest.id ?? guest._id) === String(seat.guestId)
      );
      if (!g) return;
      const count = getPartySize(g);
      for (let j = 0; j < count; j++) {
        const idx = seat.seatIndex + j;
        if (idx < arr.length) arr[idx].guest = g;
      }
    });
    return arr;
  }, [tableData, tableGuests]);

  const occupied = seatsArray.filter((s) => s.guest).length;
  const availableGuests = tableGuests.filter(
    (g) => !tableData.seatedGuests.some((s) => s.guestId === g.id)
  );

  const handleSeatGuest = (seatIndex, guest) => {
    const count = getPartySize(guest);
    const res = assignGuestsToTable(tableData.id, guest.id, count, seatIndex);
    if (!res.ok) setError(res.message);
    else setError("");
    setOpenSeat(null);
  };

  const handleRemoveGuest = (guestId) => {
    removeGuestFromTable(tableData.id, guestId);
  };

  if (!tableData) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative bg-white rounded-2xl shadow-2xl w-[680px] p-8 max-h-[90vh] overflow-y-auto border border-gray-100">
        {/* כפתור סגירה */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X size={22} />
        </button>

        {/* כותרת */}
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">
          הושבה לשולחן {tableData.name}
        </h2>
        <p className="text-sm text-gray-500 text-center mb-5">
          {occupied}/{tableData.seats} מקומות תפוסים
        </p>

        {/* הודעת שגיאה */}
        {error && (
          <div className="text-red-600 bg-red-50 border border-red-200 text-center py-2 rounded-xl mb-4 font-medium">
            {error}
          </div>
        )}

        {/* כיסאות */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200 shadow-inner">
          <div className="grid grid-cols-6 gap-4 justify-items-center">
            {seatsArray.map((seat, i) => {
              const g = seat.guest;
              const isOpen = openSeat === i;

              return (
                <div key={i} className="relative">
                  <div
                    className={`w-20 h-20 rounded-xl border flex flex-col items-center justify-center text-center text-sm cursor-pointer transition-all duration-200 ${
                      g
                        ? "bg-blue-100 border-blue-400 text-gray-800 shadow-md"
                        : "bg-white border-gray-200 hover:bg-blue-50 text-gray-500"
                    }`}
                    onClick={() => {
                      if (g) handleRemoveGuest(g.id);
                      else setOpenSeat(isOpen ? null : i);
                    }}
                  >
                    {g ? (
                      <>
                        <span className="font-semibold truncate w-[90%]">
                          {g.name}
                        </span>
                        <span className="text-xs text-gray-600">
                          ({getPartySize(g)} מושבים)
                        </span>
                        <span className="text-[11px] text-red-600 mt-1">
                          להסרה
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-medium leading-4">
                        הושב<br />אורח
                      </span>
                    )}
                  </div>

                  {/* פופ־אפ בחירה */}
                  {isOpen && !g && (
                    <div className="absolute top-[95%] mt-2 bg-white border shadow-xl rounded-lg w-48 z-50 max-h-60 overflow-y-auto text-right">
                      {availableGuests.length === 0 ? (
                        <div className="p-2 text-xs text-gray-400 text-center">
                          אין אורחים זמינים
                        </div>
                      ) : (
                        availableGuests.map((g2) => (
                          <div
                            key={g2.id}
                            onClick={() => handleSeatGuest(i, g2)}
                            className="p-2 hover:bg-blue-50 cursor-pointer text-xs text-gray-700"
                          >
                            {g2.name} — {getPartySize(g2)} מושבים
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* כפתור סגירה */}
        <div className="flex justify-center mt-7">
          <button
            onClick={onClose}
            className="px-7 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium text-gray-800 transition"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
