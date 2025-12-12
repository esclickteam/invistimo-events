"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { useSeatingStore } from "@/store/seatingStore";

export default function GuestSidebar({ onDragStart }) {
  // 🟦 Zustand
  const guests = useSeatingStore((s) => s.guests);
  const tables = useSeatingStore((s) => s.tables);

  // ⭐ קריאת guestId מה־URL
  const searchParams = useSearchParams();
  const highlightedGuestId = searchParams.get("guestId");

  // 🟨 הגנה נגד טעינה
  if (!Array.isArray(guests) || !Array.isArray(tables)) {
    return (
      <div className="w-72 bg-white shadow-xl border-r h-full p-4 text-gray-400">
        טוען נתונים...
      </div>
    );
  }

  return (
    <div className="w-72 bg-white shadow-xl border-r h-full overflow-y-auto">
      <h2 className="text-lg font-bold p-4 border-b">🧾 רשימת אורחים</h2>

      <ul>
        {guests.map((guest) => {
          const table = tables.find((t) => t.id === guest.tableId);

          // ⭐ בדיקה אם זה האורח שהגיעו אליו
          const isHighlighted = guest._id === highlightedGuestId;

          return (
            <li
              key={guest._id}
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

              {/* שולחן אם שובץ */}
              {table && (
                <div className="mt-1 text-xs text-green-600">
                  שובץ לשולחן: {table.name}
                </div>
              )}

              {/* ⭐ אינדיקציה ויזואלית */}
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
