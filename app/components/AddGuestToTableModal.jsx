"use client";

import { useState } from "react";
import { Stage, Layer, Group, Circle, Text, Rect } from "react-konva";
import { useSeatingStore } from "@/store/seatingStore";

/**
 * AddGuestToTableModal
 * מודאל הושבה אינטראקטיבי: מציג שולחן קטן עם כיסאות
 * מאפשר הוספה/הסרה של אורחים ישירות מהמודאל
 */
export default function AddGuestToTableModal({ table, guests, onClose }) {
  const assignGuestsToTable = useSeatingStore((s) => s.assignGuestsToTable);
  const removeGuestFromTable = useSeatingStore((s) => s.removeGuestFromTable);

  const [selectedGuest, setSelectedGuest] = useState(null);
  const [error, setError] = useState("");

  const seated = table.seatedGuests || [];

  // פונקציה שמחזירה כמה מקומות כל אורח תופס לפי אישור הגעה
  const getPartySize = (guest, assignedItem) => {
    const raw =
      assignedItem?.confirmedGuestsCount ??
      guest?.confirmedGuestsCount ??
      guest?.guestsCount ??
      guest?.count ??
      1;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  };

  // ספירה מדויקת של מקומות תפוסים
  const occupied = seated.reduce((sum, s) => {
    const g = guests.find(
      (guest) => String(guest.id ?? guest._id) === String(s.guestId)
    );
    return sum + (g ? getPartySize(g, s) : 1);
  }, 0);

  const freeSeats = Math.max(0, table.seats - occupied);

  // חישוב מיקום הכיסאות סביב השולחן
  const getSeatPositions = (seats) => {
    const coords = [];
    const radius = 90;
    for (let i = 0; i < seats; i++) {
      const angle = (2 * Math.PI * i) / seats - Math.PI / 2;
      coords.push({
        x: 150 + Math.cos(angle) * radius,
        y: 150 + Math.sin(angle) * radius,
      });
    }
    return coords;
  };

  const seatsCoords = getSeatPositions(table.seats);

  const handleAddGuest = (seatIndex) => {
    if (!selectedGuest) {
      setError("יש לבחור אורח מהרשימה");
      return;
    }
    const guest = selectedGuest;
    const count = getPartySize(guest);
    if (count > freeSeats) {
      setError("אין מספיק מקומות פנויים");
      return;
    }

    assignGuestsToTable(table.id, guest.id, count, seatIndex);
    setSelectedGuest(null);
    setError("");
  };

  const handleRemoveGuest = (guestId) => {
    removeGuestFromTable(table.id, guestId);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-[480px] p-5 relative">
        <h2 className="text-lg font-bold mb-3 text-center">
          הושבה לשולחן {table.name}
        </h2>

        <p className="text-sm text-center text-gray-600 mb-3">
          {occupied}/{table.seats} מקומות תפוסים
        </p>

        {/* תיבת בחירה */}
        <select
          className="w-full border rounded-lg p-2 mb-3"
          value={selectedGuest?.id || ""}
          onChange={(e) =>
            setSelectedGuest(
              guests.find((g) => String(g.id) === e.target.value)
            )
          }
        >
          <option value="">בחר אורח להושבה...</option>
          {guests
            .filter(
              (g) =>
                !seated.find(
                  (s) => String(s.guestId) === String(g.id ?? g._id)
                )
            )
            .map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} — {getPartySize(g)} מקומות
              </option>
            ))}
        </select>

        {error && (
          <div className="text-red-600 bg-red-50 text-center py-1 rounded mb-3">
            {error}
          </div>
        )}

        {/* שולחן עם כיסאות */}
        <div className="flex justify-center">
          <Stage width={300} height={300}>
            <Layer>
              <Rect
                x={100}
                y={100}
                width={100}
                height={100}
                fill="#3b82f6"
                shadowBlur={6}
                cornerRadius={10}
              />
              <Text
                x={100}
                y={140}
                width={100}
                align="center"
                text={table.name}
                fill="white"
                fontSize={14}
              />

              {seatsCoords.map((pos, i) => {
                const assigned = seated.find((s) => s.seatIndex === i);
                const guest = assigned
                  ? guests.find(
                      (g) =>
                        String(g.id ?? g._id) === String(assigned.guestId)
                    )
                  : null;
                return (
                  <Group key={i}>
                    <Circle
                      x={pos.x}
                      y={pos.y}
                      radius={10}
                      fill={guest ? "#d1d5db" : "#3b82f6"}
                      stroke="#2563eb"
                      onClick={() =>
                        guest
                          ? handleRemoveGuest(guest.id)
                          : handleAddGuest(i)
                      }
                    />
                    {guest && (
                      <Text
                        x={pos.x - 40}
                        y={pos.y + 14}
                        width={80}
                        align="center"
                        text={`${guest.name}`}
                        fontSize={10}
                        fill="#111827"
                      />
                    )}
                  </Group>
                );
              })}
            </Layer>
          </Stage>
        </div>

        {/* כפתורי פעולה */}
        <div className="flex justify-center mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
