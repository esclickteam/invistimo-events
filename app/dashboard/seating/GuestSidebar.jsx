"use client";
import React from "react";

export default function GuestSidebar({ guests, onDragStart }) {
  return (
    <div className="w-64 bg-white shadow-lg border-r h-full overflow-y-auto">
      <h2 className="text-lg font-bold p-4 border-b">🧾 רשימת אורחים</h2>
      <ul>
        {guests.map((guest) => (
          <li
            key={guest.id}
            draggable
            onDragStart={(e) => onDragStart(e, guest)}
            className={`cursor-grab p-3 hover:bg-gray-100 border-b flex justify-between ${
              guest.tableId ? "opacity-50" : ""
            }`}
          >
            <span>{guest.name}</span>
            <span className="text-sm text-gray-500">{guest.count} מקומות</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
