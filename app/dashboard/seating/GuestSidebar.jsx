"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useSeatingStore } from "@/store/seatingStore";

export default function GuestSidebar({
  onDragStart,
  variant = "desktop",
}) {
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
    return null;
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
    <div
      className={`
        bg-white overflow-y-auto
        ${
          variant === "desktop"
            ? "hidden md:block w-72 h-full border-r shadow-xl"
            : ""
        }
        ${
          variant === "mobile"
            ? "block md:hidden w-full h-full"
            : ""
        }
      `}
    >
      <h2 className="text-lg font-bold p-4 border-b text-gray-800">
        🧾 רשימת אורחים
      </h2>

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

          return (
            <li
              key={guestId}
              className={`p-3 border-b transition flex justify-between items-center select-none ${
                isHighlighted
                  ? "bg-yellow-200 border-yellow-400 shadow-[0_0_6px_#facc15] ring-2 ring-yellow-400"
                  : "hover:bg-gray-100"
              } ${!table ? "cursor-grab active:cursor-grabbing" : ""}`}
              onMouseDown={(e) => {
                if (!table) {
                  e.preventDefault();
                  onDragStart(guest);
                }
              }}
              onTouchStart={(e) => {
                if (!table) {
                  e.preventDefault();
                  onDragStart(guest);
                }
              }}
            >
              <div>
                <div
                  className={`font-medium ${
                    isHighlighted
                      ? "text-yellow-900"
                      : "text-gray-800"
                  }`}
                >
                  {guest.name}
                </div>

                <div className="text-xs text-gray-500">
                  {guest.confirmedGuestsCount ??
                    guest.guestsCount ??
                    guest.count ??
                    1}{" "}
                  מקומות
                </div>

                <div className="mt-1 text-xs">
                  {table ? (
                    <span className="text-green-600">
                      שובץ לשולחן:{" "}
                      {table.name || `שולחן ${table.id}`}
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      לא משובץ
                    </span>
                  )}
                </div>

                {isHighlighted && (
                  <div className="mt-1 text-xs font-semibold text-yellow-700">
                    ← אורח שנבחר
                  </div>
                )}
              </div>

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
