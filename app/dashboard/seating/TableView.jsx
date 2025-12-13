"use client";
import React, { useState, useMemo } from "react";

export default function TableView({
  table,
  availableGuests,
  onClose,
  onAssignSeat,
  onRemoveSeat,
  isHighlighted
}) {
  const [selectSeatIndex, setSelectSeatIndex] = useState(null);

  /* ===============================
     🔎 מיפוי בלוקים של אורחים
     לפי guestId אמיתי
  =============================== */
  const guestBlocks = useMemo(() => {
    const map = new Map();

    table.seatedGuests.forEach((sg) => {
      if (!map.has(sg.guestId)) {
        map.set(sg.guestId, []);
      }
      map.get(sg.guestId).push(sg.seatIndex);
    });

    return map;
  }, [table.seatedGuests]);

  const getGuestBlockBySeat = (seatIndex) => {
    const seat = table.seatedGuests.find(
      (s) => s.seatIndex === seatIndex
    );
    if (!seat) return null;

    const seats = guestBlocks.get(seat.guestId);
    const guest = availableGuests.find(
      (g) => g._id === seat.guestId
    );

    return {
      guestId: seat.guestId,
      name: guest?.name || "אורח",
      count: seats.length,
      seats
    };
  };

  return (
    <>
      {/* ================= POPUP ================= */}
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
            {table.name}
          </h2>

          {/* ================= SEATS ================= */}
          <div className="grid grid-cols-4 gap-3 justify-center mx-auto">
            {Array.from({ length: table.seats }).map((_, i) => {
              const guestBlock = getGuestBlockBySeat(i);

              return (
                <div key={i} className="flex flex-col items-center">
                  <button
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs
                      ${
                        guestBlock
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    onClick={() => {
                      if (guestBlock) {
                        onRemoveSeat(table.id, guestBlock.guestId);
                      } else {
                        setSelectSeatIndex(i);
                      }
                    }}
                  >
                    {guestBlock ? "👤" : i + 1}
                  </button>

                  {guestBlock && (
                    <span className="text-xs mt-1 text-center">
                      {guestBlock.name} × {guestBlock.count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= SELECT GUEST ================= */}
      {selectSeatIndex !== null && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-[60]">
          <div className="bg-white p-4 rounded-lg shadow-lg w-80">
            <h3 className="font-bold text-center mb-3">
              בחר אורח
            </h3>

            <ul className="max-h-60 overflow-y-auto space-y-2">
              {availableGuests.length === 0 && (
                <p className="text-center text-gray-500 text-sm">
                  אין אורחים פנויים
                </p>
              )}

              {availableGuests.map((guest) => (
                <li key={guest._id}>
                  <button
                    className="w-full text-left p-2 rounded bg-gray-100 hover:bg-gray-200"
                    onClick={() => {
                      onAssignSeat(
                        table.id,
                        selectSeatIndex,
                        guest._id
                      );
                      setSelectSeatIndex(null);
                    }}
                  >
                    {guest.name} — {guest.guestsCount} מקומות
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
