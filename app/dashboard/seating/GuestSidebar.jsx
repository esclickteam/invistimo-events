"use client";
import React from "react";

export default function GuestSidebar({ guests, onDragStart }) {
  const unseatedCount = guests.filter((g) => !g.tableId).length;

  return (
    <div className="w-full h-full bg-white overflow-y-auto">
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold">🧾 רשימת אורחים</h2>
        <p className="text-xs text-gray-500 mt-1">
          לא שובצו: {unseatedCount} מתוך {guests.length}
        </p>
      </div>

      <ul>
        {guests.map((guest) => (
          <li
            key={guest.id}
            draggable
            onDragStart={(e) => onDragStart(e, guest)}
            className={`cursor-grab p-3 hover:bg-gray-100 border-b flex items-center justify-between gap-2 ${
              guest.tableId ? "opacity-50" : ""
            }`}
            title={
              guest.tableId ? `שובץ לשולחן` : "גררי לשולחן כדי לשבץ"
            }
          >
            <span className="truncate">{guest.name}</span>
            <span className="text-sm text-gray-500 whitespace-nowrap">
              {guest.count} מקומות
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
