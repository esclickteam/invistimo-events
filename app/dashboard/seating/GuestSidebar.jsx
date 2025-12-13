"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useSeatingStore } from "@/store/seatingStore";

export default function GuestSidebar({ onDragStart }) {
  /* ===============================
     Zustand
  =============================== */
  const guests = useSeatingStore((s) => s.guests);
  const tables = useSeatingStore((s) => s.tables);

  /* ===============================
     Highlight from URL
  =============================== */
  const searchParams = useSearchParams();
  const highlightedGuestId = searchParams.get("guestId");

  /* ===============================
     Guards
  =============================== */
  if (!Array.isArray(guests) || !Array.isArray(tables)) {
    return (
      <div className="w-72 bg-white shadow-xl border-r h-full p-4 text-gray-400">
        טוען נתונים...
      </div>
    );
  }

  /* ===============================
     ⭐ מקור אמת:
     tables[].seatedGuests[].guestId
     ממפה אורח → שולחן
  =============================== */
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
          const isHighlighted = guestId === highlightedGuestId;

          return (
            <li
              key={guestId}
              draggable
              onDragStart={() => onDragStart(guest)}
              className={`
                cursor-grab p-3 border-b transition
                hover:bg-gray-100
                ${
                  isHighlighted
                    ? "bg-yellow-100 border-yellow-400 shadow-inner ring-2 ring-yellow-300"
                    : ""
                }
              `}
            >
              {/* שם האורח */}
              <div className="font-medium">{guest.name}</div>

              {/* כמות מקומות */}
              <div className="text-xs text-gray-500">
                {guest.guestsCount} מקומות
              </div>

              {/* ⭐ שולחן – מתעדכן אוטומטית מההושבה */}
              <div className="mt-1 text-xs">
                {table ? (
                  <span className="text-green-600">
                    שובץ לשולחן: {table.name}
                  </span>
                ) : (
                  <span className="text-gray-400">לא משובץ</span>
                )}
              </div>

              {/* אינדיקציה לאורח שנבחר מהדשבורד */}
              {isHighlighted && (
                <div className="mt-1 text-xs font-semibold text-yellow-700">
                  ← אורח שנבחר מהדשבורד
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
