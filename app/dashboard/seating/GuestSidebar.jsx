"use client";

import React, { useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSeatingStore } from "@/store/seatingStore";

export default function GuestSidebar({ onDragStart }) {
  /* ================= ZUSTAND STATE ================= */
  const guests = useSeatingStore((s) => s.guests);
  const tables = useSeatingStore((s) => s.tables);

  const selectedGuestId = useSeatingStore((s) => s.selectedGuestId);
  const setSelectedGuest = useSeatingStore((s) => s.setSelectedGuest);
  const clearSelectedGuest = useSeatingStore((s) => s.clearSelectedGuest);
  const removeFromSeat = useSeatingStore((s) => s.removeFromSeat);

  const setHighlight = useSeatingStore((s) => s.setHighlight);

  /* ================= URL PARAM ================= */
  const searchParams = useSearchParams();
  const highlightedGuestIdFromUrl = searchParams.get("guestId");

  /* ================= INIT FROM URL (ONCE) ================= */
  useEffect(() => {
    if (
      highlightedGuestIdFromUrl &&
      typeof highlightedGuestIdFromUrl === "string" &&
      !selectedGuestId
    ) {
      setSelectedGuest(highlightedGuestIdFromUrl);
    }
  }, [highlightedGuestIdFromUrl, selectedGuestId, setSelectedGuest]);

  /* ================= HARD GUARD ================= */
  if (!Array.isArray(guests) || !Array.isArray(tables)) {
    return (
      <div className="w-72 bg-white shadow-xl border-r h-full p-4 text-gray-400">
        טוען נתונים…
      </div>
    );
  }

  /* ================= MAP: GUEST → TABLE ================= */
  const guestTableMap = useMemo(() => {
    const map = new Map();

    tables.forEach((table) => {
      if (!table || !Array.isArray(table.seatedGuests)) return;

      table.seatedGuests.forEach((sg) => {
        if (sg?.guestId) {
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
          /* ================= SAFE GUEST ================= */
          const guestId =
            guest?._id !== undefined && guest?._id !== null
              ? guest._id.toString()
              : "";

          if (!guestId) return null;

          const guestName =
            typeof guest?.name === "string" && guest.name.trim()
              ? guest.name
              : "אורח ללא שם";

          const guestsCount =
            Number.isFinite(guest?.guestsCount)
              ? guest.guestsCount
              : 1;

          const table = guestTableMap.get(guestId) || null;
          const isSelected = selectedGuestId === guestId;

          return (
            <li
              key={guestId}
              draggable
              onDragStart={() => {
                if (typeof onDragStart === "function") {
                  onDragStart(guest);
                }
              }}
              onClick={() => {
                /* ====== TOGGLE SELECTION ====== */
                if (isSelected) {
                  clearSelectedGuest();
                  setHighlight(null, []);
                  return;
                }

                setSelectedGuest(guestId);

                if (table?.id) {
                  setHighlight(table.id, []);

                  /* ====== FOCUS TABLE ON CANVAS ====== */
                  if (
                    Number.isFinite(table.x) &&
                    Number.isFinite(table.y)
                  ) {
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
                }
              }}
              className={`cursor-pointer p-3 border-b transition
                hover:bg-gray-100
                ${
                  isSelected
                    ? "bg-blue-50 border-blue-300 ring-2 ring-blue-300"
                    : ""
                }
              `}
            >
              {/* ================= NAME ================= */}
              <div
                className={`font-medium ${
                  isSelected ? "text-blue-700" : "text-gray-800"
                }`}
              >
                {guestName}
              </div>

              {/* ================= COUNT ================= */}
              <div className="text-xs text-gray-500">
                {guestsCount} מקומות
              </div>

              {/* ================= TABLE ================= */}
              {table?.name ? (
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

              {/* ================= REMOVE FROM SEAT ================= */}
              {table?.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromSeat(table.id, guestId);
                    clearSelectedGuest();
                    setHighlight(null, []);
                  }}
                  className="mt-1 text-xs text-red-500 hover:underline"
                >
                  בטל הושבה
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
