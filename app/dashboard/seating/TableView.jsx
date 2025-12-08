"use client";
import React, { useState } from "react";

export default function TableView({
  table,
  availableGuests,
  onClose,
  onAssignSeat,
  onRemoveSeat
}) {
  const [selectSeatIndex, setSelectSeatIndex] = useState(null);

  return (
    <>
      {/* פופאפ המרכזי */}
      <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-[420px] p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-red-500 text-xl"
          >
            ✕
          </button>

          <h2 className="text-xl font-bold text-center mb-4">{table.name}</h2>

          {/* כיסאות */}
          <div className="grid grid-cols-4 gap-3 justify-center mx-auto">
            {Array.from({ length: table.seats }).map((_, i) => {
              const seated = table.seatedGuests.find((g) => g.seatIndex === i);

              return (
                <div
                  key={i}
                  className="flex flex-col items-center"
                >
                  <button
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs ${
                      seated
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                    onClick={() => {
                      if (seated) {
                        onRemoveSeat(table.id, i);
                      } else {
                        setSelectSeatIndex(i);
                      }
                    }}
                  >
                    {seated ? "👤" : i + 1}
                  </button>

                  {seated && (
                    <span className="text-xs mt-1">{seated.name}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* מודאל בחירת אורח */}
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
