"use client";
import { useState } from "react";

export default function AddTableModal({ onClose, onAdd }) {
  const [type, setType] = useState("round");
  const [seats, setSeats] = useState(10);

  const handleAdd = () => {
    onAdd({ type, seats });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-[400px]">
        <h2 className="text-lg font-bold mb-4">הוספת שולחן חדש</h2>

        <label className="block mb-2 text-sm font-medium">צורת שולחן</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full border rounded-lg p-2 mb-4"
        >
          <option value="round">שולחן עגול</option>
          <option value="square">שולחן מרובע</option>
          <option value="banquet">שולחן אבירים (מלבני)</option>
        </select>

        <label className="block mb-2 text-sm font-medium">כמות אורחים</label>
        <input
          type="number"
          min={2}
          max={50}
          value={seats}
          onChange={(e) => setSeats(Number(e.target.value))}
          className="w-full border rounded-lg p-2 mb-6"
        />

        <div className="flex justify-end gap-2">
          <button
            onClose={onClose}
            onClick={onClose}
            className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            ביטול
          </button>
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            הוסף שולחן
          </button>
        </div>
      </div>
    </div>
  );
}
