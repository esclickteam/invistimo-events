"use client";
import React from "react";
import { useSeatingStore } from "@/store/seatingStore";

export default function GuestSidebar({ onDragStart }) {
  // 🟦 מושכים State מה־Zustand
  const guests = useSeatingStore((s) => s.guests);
  const tables = useSeatingStore((s) => s.tables);

  // 🟨 הגנה נגד undefined בשלב טעינה ראשוני
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

          return (
            <li
              key={guest.id}
              draggable
              onDragStart={() => onDragStart(guest)}   // ✔ תקין
              className="cursor-grab p-3 hover:bg-gray-100 border-b"
            >
              {/* שם האורח */}
              <div className="font-medium">{guest.name}</div>

              {/* מספר מקומות */}
              <div className="text-xs text-gray-500">
                {guest.count} מקומות
              </div>

              {/* שם השולחן אם שובץ */}
              {table && (
                <div className="mt-1 text-xs text-green-600">
                  {table.name}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
