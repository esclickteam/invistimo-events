"use client";
import React from "react";

export default function TableView({ table, onClose }) {
  return (
    <div className="fixed top-0 right-0 w-72 bg-white shadow-xl h-full border-l z-40">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="font-bold">{table.name}</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-red-500">✕</button>
      </div>

      <div className="p-4">
        {table.seatedGuests.length === 0 ? (
          <p className="text-gray-400 text-sm">אין אורחים בשולחן זה</p>
        ) : (
          <ul className="space-y-2">
            {table.seatedGuests.map((g) => (
              <li
                key={g.id}
                className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-sm"
              >
                {g.name} — {g.count} מקומות
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
