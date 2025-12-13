"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useSeatingStore } from "@/store/seatingStore";

export default function GuestSidebar({ onDragStart }) {
  const guests = useSeatingStore((s) => s.guests);
  const tables = useSeatingStore((s) => s.tables);

  const selectedGuestId = useSeatingStore((s) => s.selectedGuestId);
  const setSelectedGuest = useSeatingStore((s) => s.setSelectedGuest);
  const clearSelectedGuest = useSeatingStore((s) => s.clearSelectedGuest);
  const removeFromSeat = useSeatingStore((s) => s.removeFromSeat);

  const searchParams = useSearchParams();
  const highlightedGuestIdFromUrl = searchParams.get("guestId");

  if (!Array.isArray(guests) || !Array.isArray(tables)) {
    return (
      <div className="w-72 bg-white shadow-xl border-r h-full p-4 text-gray-400">
        טוען נתונים...
      </div>
    );
  }

  /* ================= מקור אמת: מי יושב איפה ================= */
  const guestTableMap = useMemo(() => {
    const map = new Map();
    tables.forEach((table) => {
      table.seatedGuests?.forEach((sg) => {
        if (sg.guestId) {
          map.set(sg.guestId.toString(), table);
        }
      });
    });
    return map;
  }, [tables]);

  return (
    <div className="w-72 bg-white shadow-xl border-r h-full overflow-y-auto">
      <h2 className="text-lg font-bold p-4 border-b">🧾 רשימת אורחים</h2>

      <ul>
        {guests.map((guest) => {
          const guestId = guest._id?.toString();
          const table = guestTableMap.get(guestId) || null;

          /* ⭐ בחירה אחת בלבד */
          const isSelected =
            selectedGuestId === guestId ||
            (!selectedGuestId &&
              highlightedGuestIdFromUrl === guestId);

          return (
            <li
              key={guestId}
              draggable
              onDragStart={() => onDragStart(guest)}
              onClick={() => {
                /* 🔁 לחיצה שנייה = ביטול סימון */
                if (selectedGuestId === guestId) {
                  clearSelectedGuest();
                  return;
                }

                setSelectedGuest(guestId);

                if (table) {
                  useSeatingStore.setState({
                    highlightedTable: table.id,
                    highlightedSeats: [],
                  });

                  /* 🎯 focus + scroll לקנבס */
                  window.dispatchEvent(
                    new CustomEvent("focus-table", {
                      detail: {
                        tableId: table.id,
                        x: table.x,
                        y: table.y,
                      },
                    })
                  );
                }
              }}
              className={`
                cursor-pointer p-3 border-b transition
                hover:bg-gray-100
                ${
                  isSelected
                    ? "bg-blue-50 border-blue-300 ring-2 ring-blue-300"
                    : ""
                }
              `}
            >
              {/* ================= שם ================= */}
              <div
                className={`font-medium ${
                  isSelected ? "text-blue-700" : "text-gray-800"
                }`}
              >
                {guest.name}
              </div>

              {/* ================= כמות ================= */}
              <div className="text-xs text-gray-500">
                {guest.guestsCount} מקומות
              </div>

              {/* ================= שולחן ================= */}
              {table ? (
                <div
                  className={`mt-1 text-xs font-semibold ${
                    isSelected ? "text-blue-700" : "text-green-600"
                  }`}
                >
                  שולחן: {table.name}
                </div>
              ) : (
                <div className="mt-1 text-xs text-gray-400">
                  לא משובץ
                </div>
              )}

              {/* ================= ביטול הושבה ================= */}
              {table && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromSeat(table.id, guestId);
                    clearSelectedGuest();
                  }}
                  className="mt-1 text-xs text-red-500 hover:underline"
                >
                  בטל הושבה
                </button>
              )}

              {/* ================= הגיע מ־URL ================= */}
              {highlightedGuestIdFromUrl === guestId &&
                !selectedGuestId && (
                  <div className="mt-1 text-xs font-semibold text-yellow-700">
                    ← נבחר מהדשבורד
                  </div>
                )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
