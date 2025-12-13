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
  const removeFromSeat = useSeatingStore((s) => s.removeFromSeat);

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
     ⭐ מיפוי אורח → שולחן
     IMPORTANT: match by guest.id OR guest._id
  =============================== */
  const guestTableMap = useMemo(() => {
    const map = new Map();

    tables.forEach((table) => {
      table.seatedGuests?.forEach((sg) => {
        if (sg?.guestId != null) {
          map.set(String(sg.guestId), table);
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
          // ✅ אצלך השיבוץ נכתב עם guest.id, אז חייבים fallback
          const guestId = String(guest.id ?? guest._id ?? "");
          const table = guestTableMap.get(guestId) || null;

          // ✅ גם ההיילייט מה-URL יכול להגיע בתור id או _id
          const isHighlighted =
            String(highlightedGuestId || "") === guestId ||
            String(highlightedGuestId || "") === String(guest._id ?? "");

          return (
            <li
              key={guestId}
              className={`p-3 border-b transition flex justify-between items-center ${
                isHighlighted
                  ? "bg-yellow-100 border-yellow-400 shadow-inner ring-2 ring-yellow-300"
                  : "hover:bg-gray-100"
              }`}
              draggable={!table}
              onDragStart={() => !table && onDragStart(guest)}
            >
              <div>
                {/* שם האורח */}
                <div className="font-medium text-gray-800">{guest.name}</div>

                {/* כמות מקומות */}
                <div className="text-xs text-gray-500">
                  {guest.guestsCount} מקומות
                </div>

                {/* ⭐ שולחן – מתעדכן אוטומטית */}
                <div className="mt-1 text-xs">
                  {table ? (
                    <span className="text-green-600">
                      שובץ לשולחן: {table.name || `שולחן ${table.id}`}
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
              </div>

              {/* כפתור הסרת שיבוץ */}
              {table && (
                <button
                  onClick={() => removeFromSeat(guestId)}
                  className="text-red-500 text-sm hover:text-red-700 ml-2"
                  title="הסר שיבוץ"
                >
                  ❌
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
