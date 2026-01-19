"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useSeatingStore } from "@/store/seatingStore";

export default function GuestSidebar({
  onDragStart = () => {}, // ✅ ברירת מחדל
  variant = "desktop", // "desktop" | "mobile"
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
    (from === "dashboard" || from === "personal") &&
    !!highlightedGuestId;

  /* ===============================
     Guards
  =============================== */
  if (!Array.isArray(guests) || !Array.isArray(tables)) {
    return null;
  }

  /* ===============================
     ⭐ מיפוי אורח → שולחן (מה-store)
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
      className={
        "bg-white overflow-y-auto " +
        (variant === "desktop"
          ? "hidden md:block w-72 h-full border-l shadow-xl"
          : "") +
        (variant === "mobile"
          ? "block md:hidden w-full h-full"
          : "")
      }
    >
      {/* כותרת */}
      <h2 className="text-lg font-bold p-4 border-b text-gray-800">
        🧾 רשימת אורחים
      </h2>

      {/* רשימה */}
      <ul>
        {guests.map((guest) => {
          const guestId = String(guest.id ?? guest._id ?? "");

          const tableFromStore = guestTableMap.get(guestId) || null;

          const tableLabel =
            (tableFromStore && tableFromStore.name) ||
            guest.tableName ||
            (tableFromStore ? `שולחן ${tableFromStore.id}` : null);

          const isSeated = Boolean(tableLabel);

          const guestIdCandidates = [
            guest.id != null ? String(guest.id) : null,
            guest._id != null ? String(guest._id) : null,
          ].filter(Boolean);

          const isHighlighted =
            shouldHighlightFromUrl &&
            guestIdCandidates.includes(highlightedGuestId);

          const itemClassName =
            "p-3 border-b transition flex justify-between items-center select-none " +
            (isHighlighted
              ? "bg-yellow-200 border-yellow-400 shadow-[0_0_6px_#facc15] ring-2 ring-yellow-400 "
              : "hover:bg-gray-100 ") +
            (!isSeated ? "cursor-grab active:cursor-grabbing" : "");

          return (
            <li
              key={guestId}
              className={itemClassName}
              onMouseDown={(e) => {
                if (!isSeated) {
                  e.preventDefault();
                  onDragStart(guest);
                }
              }}
              onTouchStart={(e) => {
                if (!isSeated) {
                  e.preventDefault();
                  onDragStart(guest);
                }
              }}
            >
              <div>
                {/* שם */}
                <div
                  className={
                    "font-medium " +
                    (isHighlighted
                      ? "text-yellow-900"
                      : "text-gray-800")
                  }
                >
                  {guest.name}
                </div>

                {/* כמות מוזמנים */}
                <div className="text-xs text-gray-500">
                  {(guest.confirmedGuestsCount ??
                    guest.guestsCount ??
                    guest.count ??
                    1) + " מקומות"}
                </div>

                {/* סטטוס שיבוץ */}
                <div className="mt-1 text-xs">
                  {isSeated ? (
                    <span className="text-green-600">
                      משובץ לשולחן {tableLabel}
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      לא משובץ
                    </span>
                  )}
                </div>

                {/* חיווי אורח נבחר */}
                {isHighlighted && (
                  <div className="mt-1 text-xs font-semibold text-yellow-700">
                    ← אורח שנבחר
                  </div>
                )}
              </div>

              {/* הסרת שיבוץ */}
              {tableFromStore && (
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
