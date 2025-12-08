"use client";
import React from "react";

export default function TableView({ table, onClose, onRemoveGuest }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-96 p-6 relative">
        
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-red-500 text-xl"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-center mb-4">{table.name}</h2>

        {table.seatedGuests.length === 0 ? (
          <p className="text-gray-400 text-center">אין אורחים בשולחן זה</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {table.seatedGuests.map((guest) => (
              <li
                key={guest.id}
                className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-sm flex justify-between items-center"
              >
                <span>{guest.name} — {guest.count} מקומות</span>

                <button
                  onClick={() => onRemoveGuest(guest)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  הסר
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
