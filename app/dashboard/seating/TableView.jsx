"use client";

import React, { useState } from "react";

export default function TableView({ table, onClose }) {
  const [seats, setSeats] = useState(
    Array.from({ length: table.seats }, (_, i) => ({
      seatNumber: i + 1,
      guest: null,
    }))
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-[600px] max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-lg font-bold mb-4">{table.name}</h2>

        <div className="grid grid-cols-5 gap-4 mb-6">
          {seats.map((seat) => (
            <div
              key={seat.seatNumber}
              className="border rounded-lg p-3 text-center hover:bg-blue-50 transition"
            >
              <div className="font-medium mb-1">מקום {seat.seatNumber}</div>
              {seat.guest ? (
                <div className="text-sm text-gray-700">{seat.guest.name}</div>
              ) : (
                <button className="text-xs text-blue-600">הושב אורח</button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
