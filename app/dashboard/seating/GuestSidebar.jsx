"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useSeatingStore } from "@/store/seatingStore";

export default function GuestSidebar() {
  /* ===============================
     Zustand
  =============================== */
  const guests = useSeatingStore((s) => s.guests);
  const tables = useSeatingStore((s) => s.tables);

  const startDragGuest = useSeatingStore((s) => s.startDragGuest);
  const endDragGuest = useSeatingStore((s) => s.endDragGuest);
  const removeFromSeat = useSeatingStore((s) => s.removeFromSeat);
  const draggingGuest = useSeatingStore((s) => s.draggingGuest);

  /* ===============================
     Highlight from URL
  =============================== */
  const searchParams = useSearchParams();
  const highlightedGuestIdRaw = searchParams.get("guestId");
  const from = searchParams.get("from");

  const highlightedGuestId = highlightedGuestIdRaw
    ? String(highlightedGuestIdRaw)
    : "";

  const shouldHighlightFromUrl =
    (from === "dashboard" || from === "personal") && !!highlightedGuestId;

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
          const guestId = String(guest.id ?? guest._id ?? "");
          const table = guestTableMap.get(guestId) || null;

          const guestIdCandidates = [
            guest.id != null ? String(guest.id) : null,
            guest._id != null ? String(guest._id) : null,
          ].filter(Boolean);

          const isHighlighted =
            shouldHighlightFromUrl &&
            guestIdCandidates.includes(highlightedGuestId);

          const isDraggingThis =
            draggingGuest &&
            String(draggingGuest.id ?? draggingGuest._id) === guestId;

          return (
            <li
              key={guestId}
              className={`p-3 border-b transition flex justify-between items-center cursor-grab ${
                isDraggingThis
                  ? "opacity-40 bg-blue-50"
                  : isHighlighted
                  ? "bg-yellow-200 border-yellow-400 shadow-[0_0_6px_#facc15] ring-2 ring-yellow-400"
                  : "hover:bg-gray-100"
              }`}
              draggable={!table}
              onDragStart={() => {
                if (table) return;
                startDragGuest(guest);
              }}
              onDragEnd={() => {
                endDragGuest();
              }}
            >
              <div>
                {/* שם האורח */}
                <div
                  className={`font-medium ${
                    isHighlighted ? "text-yellow-900" : "text-gray-800"
                  }`}
                >
                  {guest.name}
                </div>

                {/* כמות מקומות */}
                <div className="text-xs text-gray-500">
                  {guest.guestsCount || guest.count || 1} מקומות
                </div>

                {/* שולחן */}
                <div className="mt-1 text-xs">
                  {table ? (
                    <span className="text-green-600">
                      שובץ לשולחן: {table.name || `שולחן ${table.id}`}
                    </span>
                  ) : (
                    <span className="text-gray-400">לא משובץ</span>
                  )}
                </div>

                {isHighlighted && (
                  <div className="mt-1 text-xs font-semibold text-yellow-700">
                    ← אורח שנבחר
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
