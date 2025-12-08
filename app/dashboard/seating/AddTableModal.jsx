"use client";
import React, { useState } from "react";

export default function AddTableModal({ isOpen, onClose, onAdd }) {
  const [type, setType] = useState("rect");
  const [seats, setSeats] = useState(10);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-80 p-6">
        <h2 className="text-lg font-bold mb-4 text-center">➕ הוספת שולחן</h2>

        <div className="space-y-4">
          <label className="block text-sm font-medium">
            סוג שולחן:
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border mt-1 px-2 py-1.5 rounded-md"
            >
              <option value="rect">שולחן מלבני</option>
              <option value="round">שולחן עגול</option>
              <option value="knights">שולחן אבירים</option>
            </select>
          </label>

          <label className="block text-sm font-medium">
            מספר מקומות:
            <input
              type="number"
              min={1}
              max={30}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
              className="w-full border mt-1 px-2 py-1.5 rounded-md"
            />
          </label>
        </div>

        <div className="flex justify-end mt-5 gap-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-gray-600 hover:text-black"
          >
            ביטול
          </button>
          <button
            onClick={() => {
              onAdd(type, seats);
              onClose();
            }}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            הוסף שולחן
          </button>
        </div>
      </div>
    </div>
  );
}
