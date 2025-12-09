"use client";

import { useState } from "react";
import { useSeatingStore } from "@/store/seatingStore";

export default function AddGuestToTableModal({ table, guests, onClose }) {
  const assignGuestsToTable = useSeatingStore((s) => s.assignGuestsToTable);

  const [selectedGuest, setSelectedGuest] = useState(null);
  const [guestCount, setGuestCount] = useState(1);
  const [error, setError] = useState("");

  const freeSeats =
    table.seats - new Set(table.seatedGuests.map((s) => s.seatIndex)).size;

  const handleAdd = () => {
    if (!selectedGuest) {
      setError("יש לבחור אורח");
      return;
    }

    if (guestCount < 1 || guestCount > freeSeats) {
      setError("מספר המקומות אינו תקין");
      return;
    }

    // ⭐ שולח את בקשת ההוספה ל־Zustand
    const result = assignGuestsToTable(table.id, selectedGuest.id, guestCount);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-[380px] p-6">

        <h2 className="text-xl font-bold mb-4 text-center">
          הוספת אורחים לשולחן {table.name}
        </h2>

        {/* שגיאה */}
        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-center">
            {error}
          </div>
        )}

        {/* בחירת אורח */}
        <label className="font-medium text-sm">בחר אורח</label>
        <select
          className="w-full border rounded-lg p-2 mt-1 mb-4"
          value={selectedGuest?.id || ""}
          onChange={(e) =>
            setSelectedGuest(guests.find((g) => g.id === e.target.value))
          }
        >
          <option value="">בחר מהרשימה...</option>
          {guests.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} — {g.count} מקומות
            </option>
          ))}
        </select>

        {/* כמות מקומות */}
        <label className="font-medium text-sm">מספר מקומות</label>
        <input
          type="number"
          min={1}
          max={freeSeats}
          value={guestCount}
          onChange={(e) => setGuestCount(parseInt(e.target.value))}
          className="w-full border rounded-lg p-2 mt-1 mb-4"
        />

        <p className="text-gray-600 text-sm mb-4">
          מקומות פנויים בשולחן: <b>{freeSeats}</b>
        </p>

        {/* כפתורים */}
        <div className="flex justify-between mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
          >
            ביטול
          </button>

          <button
            disabled={!selectedGuest}
            onClick={handleAdd}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
          >
            הוסף אורח
          </button>
        </div>
      </div>
    </div>
  );
}
