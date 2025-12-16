"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { useSeatingStore } from "@/store/seatingStore";

/**
 * AddGuestToTableModal
 * - כל כיסא = כרטיסיה אינטראקטיבית
 * - בחירה מתוך אורחים שטרם הושבו
 * - הושבה לפי מספר המקומות של האורח
 * - שם האורח מופיע על כל הכיסאות שתפס
 * - אפשרות הסרה בלחיצה
 */
export default function AddGuestToTableModal({ table, guests, onClose }) {
  const assignGuestsToTable = useSeatingStore((s) => s.assignGuestsToTable);
  const removeGuestFromTable = useSeatingStore((s) => s.removeGuestFromTable);
  const tableState = useSeatingStore(
    (s) => s.tables.find((t) => t.id === table.id)
  );

  const tableData = tableState || table;
  const seated = tableData.seatedGuests || [];

  const [openSeat, setOpenSeat] = useState(null);
  const [error, setError] = useState("");

  const getPartySize = (guest) => {
    const raw =
      guest?.confirmedGuestsCount ?? guest?.guestsCount ?? guest?.count ?? 1;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  };

  // בניית מצב הכיסאות
  const seatsArray = useMemo(() => {
    const arr = Array.from({ length: tableData.seats }, (_, i) => ({
      index: i,
      guest: null,
    }));

    seated.forEach((seat) => {
      const g = guests.find(
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
  }, [tableData.seats, seated, guests]);

  const occupied = seatsArray.filter((s) => s.guest).length;

  const availableGuests = guests.filter(
    (g) => !seated.find((s) => String(s.guestId) === String(g.id ?? g._id))
  );

  const handleSeatGuest = (seatIndex, guest) => {
    const count = getPartySize(guest);
    if (seatIndex + count > tableData.seats) {
      setError("אין מספיק מקומות פנויים ברצף מהכיסא הזה");
      return;
    }
    for (let i = seatIndex; i < seatIndex + count; i++) {
      if (seatsArray[i]?.guest) {
        setError("יש כיסא תפוס בטווח הזה");
        return;
      }
    }

    assignGuestsToTable(tableData.id, guest.id, count, seatIndex);
    setOpenSeat(null);
    setError("");
  };

  const handleRemoveGuest = (guestId) => {
    removeGuestFromTable(tableData.id, guestId);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative bg-white rounded-2xl shadow-2xl w-[650px] p-7 max-h-[90vh] overflow-y-auto border border-gray-100">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-center text-gray-800 mb-1">
          הושבה לשולחן {tableData.name}
        </h2>
        <p className="text-sm text-gray-500 text-center mb-5">
          {occupied}/{tableData.seats} מקומות תפוסים
        </p>

        {error && (
          <div className="text-red-600 bg-red-50 border border-red-200 text-center py-2 rounded-xl mb-3">
            {error}
          </div>
        )}

        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border border-gray-200 shadow-inner">
          <div className="grid grid-cols-6 gap-3 justify-items-center">
            {seatsArray.map((seat, i) => {
              const g = seat.guest;
              const isOpen = openSeat === i;

              return (
                <div key={i} className="relative">
                  <div
                    className={`w-20 h-20 rounded-xl border flex flex-col items-center justify-center text-center text-sm cursor-pointer transition-all duration-200 ${
                      g
                        ? "bg-blue-100 border-blue-400 shadow-sm hover:shadow-md"
                        : "bg-white border-gray-200 hover:bg-blue-50"
                    }`}
                    onClick={() => {
                      if (g) handleRemoveGuest(g.id);
                      else setOpenSeat(isOpen ? null : i);
                    }}
                  >
                    {g ? (
                      <>
                        <span className="font-semibold text-gray-700 truncate w-[90%]">
                          {g.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({getPartySize(g)} מושבים)
                        </span>
                        <span className="text-[10px] text-red-600 mt-1">
                          לחצי להסרה
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500 font-medium">
                        הושב<br />אורח
                      </span>
                    )}
                  </div>

                  {isOpen && !g && (
                    <div className="absolute top-[95%] mt-2 bg-white border shadow-lg rounded-lg w-44 z-50 max-h-56 overflow-y-auto text-right">
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

        <div className="flex justify-center mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium text-gray-800 transition"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
