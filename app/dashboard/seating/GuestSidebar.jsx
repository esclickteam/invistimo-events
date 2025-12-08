"use client";
import React from "react";

export default function GuestSidebar({ guests, onDragStart }) {
  return (
    <div className="w-full h-full bg-white overflow-y-auto">
      <div className="p-4 border-b bg-gray-50">
        <h2 className="text-lg font-bold">🧾 רשימת אורחים</h2>
      </div>

      <ul>
        {guests.map((guest) => (
          <li
            key={guest.id}
            draggable
            onDragStart={(e) => onDragStart(e, guest)}
            className={`cursor-grab p-3 hover:bg-gray-100 border-b ${
              guest.tableId ? "opacity-60" : ""
            }`}
          >
            <div className="flex justify-between">
              <span>{guest.name}</span>
              <span className="text-sm text-gray-500">{guest.count}</span>
            </div>
            {guest.tableId && (
              <p className="text-xs text-blue-600 mt-1">
                יושב ב-{guest.tableId}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
