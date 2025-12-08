"use client";
import React from "react";

export default function GuestSidebar({ guests, tables, onDragStart, onManualTableChange }) {
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
              className="cursor-grab p-3 hover:bg-gray-100 border-b flex justify-between items-center"
            >
              <div>
                {/* שם האורח */}
                <div>{guest.name}</div>

                {/* מספר מקומות */}
                <div className="text-xs text-gray-500">{guest.count} מקומות</div>

                {/* הצגת שולחן אמיתי */}
                {table && (
                  <div className="mt-1 text-xs text-green-600">
                    {table.name}
                  </div>
                )}

                {/* שינוי שולחן ידני */}
                {table && (
                  <select
                    className="border rounded px-1 py-0.5 text-xs mt-1 w-28"
                    value={table.id}
                    onChange={(e) => onManualTableChange(guest.id, e.target.value)}
                  >
                    <option value="">ללא</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
