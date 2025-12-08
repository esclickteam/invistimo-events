"use client";
import React from "react";

export default function GuestSidebar({ guests, tables, onDragStart }) {
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
              onDragStart={(e) => onDragStart(e, guest)}
              className="cursor-grab p-3 hover:bg-gray-100 border-b"
            >
              {/* שם האורח */}
              <div className="font-medium">{guest.name}</div>

              {/* כמות מקומות */}
              <div className="text-xs text-gray-500">
                {guest.count} מקומות
              </div>

              {/* הצגת השולחן */}
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
