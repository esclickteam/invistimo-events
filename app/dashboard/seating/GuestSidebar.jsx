"use client";
import React from "react";

export default function GuestSidebar({ guests, onDragStart, onManualTableChange }) {
  return (
    <div className="w-72 bg-white shadow-xl border-r h-full overflow-y-auto">
      <h2 className="text-lg font-bold p-4 border-b">🧾 רשימת אורחים</h2>

      <ul>
        {guests.map((guest) => (
          <li
            key={guest.id}
            draggable
            onDragStart={(e) => onDragStart(e, guest)}
            className="cursor-grab p-3 hover:bg-gray-100 border-b flex justify-between items-center"
          >
            <div>
              <div>{guest.name}</div>
              <div className="text-xs text-gray-500">{guest.count} מקומות</div>

              {guest.tableId && (
                <div className="mt-1 text-xs text-green-600">
                  שולחן {guest.tableId}
                </div>
              )}

              {guest.tableId && (
                <input
                  type="number"
                  className="border rounded px-1 py-0.5 text-xs mt-1 w-20"
                  value={guest.tableId}
                  min={1}
                  onChange={(e) => onManualTableChange(guest.id, e.target.value)}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
