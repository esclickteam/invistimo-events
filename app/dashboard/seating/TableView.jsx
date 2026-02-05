"use client";
import React, { useState } from "react";

export default function TableView({
  table,
  availableGuests,
  onClose,
  onAssignSeat,
  onRemoveSeat,
  isHighlighted // ⭐ תוספת בלבד
}) {
  const [selectSeatIndex, setSelectSeatIndex] = useState(null);

  // 🔥 מוצא את כל הבלוק של האורח לפי שיטת A
  const getGuestBlock = (seatIndex) => {
    const seat = table.seatedGuests.find((g) => g.seatIndex === seatIndex);
    if (!seat) return null;

    const guestId = seat.id;

    const allSeats = table.seatedGuests.filter((g) => g.id === guestId);

    return {
      guestId,
      name: seat.name,
      count: allSeats.length,
      seats: allSeats.map((g) => g.seatIndex)
    };
  };

  return (
    <>
      {/* פופאפ המרכזי */}
      <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
        <div
          className={`
            bg-white rounded-xl shadow-xl w-[420px] p-6 relative
            ${isHighlighted ? "ring-4 ring-amber-400 shadow-[0_0_40px_#f59e0b]" : ""}
          `}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-red-500 text-xl"
          >
            ✕
          </button>

          <h2 className="text-xl font-bold text-center mb-4">
            שולחן {table.number}
          </h2>

          {/* כיסאות */}
          <div className="grid grid-cols-4 gap-3 justify-center mx-auto">
            {Array.from({ length: table.seats }).map((_, i) => {
              const guestBlock = getGuestBlock(i);

              return (
                <div key={i} className="flex flex-col items-center">
                  <button
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs ${
                      guestBlock
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                    onClick={() => {
                      if (guestBlock) {
                        // מוחק בלוק שלם
                        onRemoveSeat(table.id, i);
                      } else {
                        setSelectSeatIndex(i);
                      }
                    }}
                  >
                    {guestBlock ? "👤" : i + 1}
                  </button>

                  {guestBlock && (
                    <span className="text-xs mt-1">
                      {guestBlock.name} × {guestBlock.count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* פופאפ בחירת אורח */}
      {selectSeatIndex !== null && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-[60]">
          <div className="bg-white p-4 rounded-lg shadow-lg w-80">
            <h3 className="font-bold text-center mb-3">בחר אורח</h3>

            <ul className="max-h-60 overflow-y-auto space-y-2">
              {availableGuests.length === 0 && (
                <p className="text-center text-gray-500 text-sm">
                  אין אורחים פנויים
                </p>
              )}

              {availableGuests.map((guest) => (
                <li key={guest.id}>
                  <button
                    className="w-full text-left p-2 rounded bg-gray-100 hover:bg-gray-200"
                    onClick={() => {
                      onAssignSeat(table.id, selectSeatIndex, guest.id);
                      setSelectSeatIndex(null);
                    }}
                  >
                    {guest.name} — {guest.count} מקומות
                  </button>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setSelectSeatIndex(null)}
              className="mt-3 w-full bg-red-500 text-white py-1 rounded"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </>
  );
}

