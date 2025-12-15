"use client";

import { useState } from "react";

export default function AddTableModal({ onClose, onAdd }) {
  const [type, setType] = useState("round");
  const [seats, setSeats] = useState(12); // ברירת מחדל
  const [orientation, setOrientation] = useState("horizontal"); // ⭐ חדש – רק לאבירים

  const handleAdd = () => {
    if (typeof onAdd !== "function") {
      console.error("❌ onAdd is NOT a function!", onAdd);
      return;
    }

    // שולחן אבירים → מוסיפים orientation
    if (type === "banquet") {
      onAdd({
        type: "knights", // 👈 אחיד מול TableRenderer / store
        seats,
        orientation,
      });
      return;
    }

    // עגול / מרובע – בלי שינוי
    onAdd({ type, seats });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-[420px]">
        <h2 className="text-lg font-bold mb-4">הוספת שולחן חדש</h2>

        {/* סוג שולחן */}
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

        {/* כמות אורחים */}
        <label className="block mb-2 text-sm font-medium">כמות אורחים</label>
        <input
          type="number"
          min={2}
          max={50}
          value={seats}
          onChange={(e) => setSeats(Number(e.target.value))}
          className="w-full border rounded-lg p-2 mb-4"
        />

        {/* ⭐ כיוון – מופיע רק לשולחן אבירים */}
        {type === "banquet" && (
          <>
            <label className="block mb-2 text-sm font-medium">
              כיוון שולחן אבירים
            </label>
            <select
              value={orientation}
              onChange={(e) => setOrientation(e.target.value)}
              className="w-full border rounded-lg p-2 mb-6"
            >
              <option value="horizontal">אופקי (לאורך)</option>
              <option value="vertical">אנכי (לרוחב)</option>
            </select>
          </>
        )}

        {/* כפתורים */}
        <div className="flex justify-end gap-2 mt-6">
          <button
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
