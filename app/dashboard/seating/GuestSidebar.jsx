"use client";
import React from "react";

export default function GuestSidebar({ guests = [], onDragStart }) {
  return (
    <div className="w-64 bg-white shadow-lg border-r h-full overflow-y-auto">
      <h2 className="text-lg font-bold p-4 border-b">🧾 רשימת אורחים</h2>

      {guests.length === 0 ? (
        <p className="p-4 text-gray-500 text-sm">אין אורחים להצגה</p>
      ) : (
        <ul>
          {guests.map((guest) => {
            const guestId = guest.id || guest._id; // ✔ תמיכה בשני סוגי ה-ID
            const count = guest.count || 1; // ✔ ברירת מחדל

            return (
              <li
                key={guestId}
                draggable
                onDragStart={(e) => onDragStart(e, guest)}
                className={`cursor-grab select-none p-3 hover:bg-gray-100 border-b flex justify-between items-center transition ${
                  guest.tableId ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <div>
                  <span className="font-medium">{guest.name}</span>
                  {guest.tableId && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded">
                      מוקצה
                    </span>
                  )}
                </div>

                <span className="text-sm text-gray-500">{count} מקומות</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
