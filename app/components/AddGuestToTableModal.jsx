"use client";

import { useState, useMemo } from "react";
import { useSeatingStore } from "@/store/seatingStore";

/**
 * AddGuestToTableModal
 * ממשק הושבה מבוסס כרטיסיות — בלי שולחן גרפי
 * ✅ אין הסרה בלחיצה על הכרטיסיה עצמה
 * ✅ יש כפתור בתוך הכרטיסיה:
 *    - ריק: "הושב אורח"
 *    - תפוס: "הסר הושבה"
 */
export default function AddGuestToTableModal({ table, guests, onClose }) {
  const assignGuestsToTable = useSeatingStore((s) => s.assignGuestsToTable);
  const removeGuestFromTable = useSeatingStore((s) => s.removeGuestFromTable);

  const seated = table.seatedGuests || [];
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [error, setError] = useState("");

  // כמה מקומות אורח תופס לפי אישורי הגעה
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

  // בניית מערך מקומות ישיבה (כיסאות) + סימון כרטיסיית "ראש" לאותו אורח
  const seatsArray = useMemo(() => {
    const arr = Array.from({ length: table.seats }, (_, i) => ({
      index: i,
      guest: null,
      guestId: null,
      isPrimary: false, // הכרטיסיה הראשונה של האורח (שם יש כפתור "הסר הושבה")
      partySize: 1,
    }));

    seated.forEach((s) => {
      const g = guests.find(
        (guest) => String(guest.id ?? guest._id) === String(s.guestId)
      );
      if (!g) return;

      const count = getPartySize(g, s);
      const start = Number(s.seatIndex) || 0;

      for (let j = 0; j < count; j++) {
        const idx = start + j;
        if (idx < 0 || idx >= arr.length) continue;

        arr[idx].guest = g;
        arr[idx].guestId = String(g.id ?? g._id);
        arr[idx].partySize = count;
        if (j === 0) arr[idx].isPrimary = true;
      }
    });

    return arr;
  }, [seated, guests, table.seats]);

  // ספירה מדויקת של מקומות תפוסים (ממש כיסאות)
  const occupied = useMemo(() => {
    return seatsArray.filter((s) => !!s.guestId).length;
  }, [seatsArray]);

  const freeSeats = Math.max(0, table.seats - occupied);

  const canPlaceFromIndex = (startIndex, count) => {
    if (startIndex < 0) return false;
    if (startIndex + count > table.seats) return false;
    for (let i = startIndex; i < startIndex + count; i++) {
      if (seatsArray[i]?.guestId) return false;
    }
    return true;
  };

  const handleAddGuest = (seatIndex) => {
    setError("");

    if (!selectedGuest) {
      setError("בחרי אורח כדי להושיב");
      return;
    }

    const guest = selectedGuest;
    const count = getPartySize(guest);

    if (count < 1) {
      setError("מספר המקומות לא תקין");
      return;
    }

    if (count > freeSeats) {
      setError("אין מספיק מקומות פנויים בשולחן");
      return;
    }

    // ✅ חייב להיות רצף כרטיסיות ריקות לפי הכמות שאישר
    if (!canPlaceFromIndex(seatIndex, count)) {
      setError("אין רצף מקומות פנויים מהכרטיסיה שנבחרה");
      return;
    }

    // אם הפונקציה שלך מקבלת גם seatIndex – זה יישב בדיוק מהרצף הזה
    const result = assignGuestsToTable(table.id, guest.id, count, seatIndex);

    if (result && result.ok === false) {
      setError(result.message || "לא ניתן להושיב אורח");
      return;
    }

    setSelectedGuest(null);
  };

  const handleRemoveGuest = (guestId) => {
    setError("");
    removeGuestFromTable(table.id, guestId);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-[560px] p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-2 text-center">
          הושבה לשולחן {table.name}
        </h2>

        <p className="text-sm text-gray-600 text-center mb-4">
          {occupied}/{table.seats} מקומות תפוסים • פנויים: <b>{freeSeats}</b>
        </p>

        {/* בחירת אורח (נשאר כמו אצלך — לא נוגע בשאר המערכת) */}
        <select
          className="w-full border rounded-lg p-2 mb-3"
          value={selectedGuest?.id || ""}
          onChange={(e) =>
            setSelectedGuest(
              guests.find((g) => String(g.id) === String(e.target.value))
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
          <div className="text-red-600 bg-red-50 text-center py-2 rounded mb-3">
            {error}
          </div>
        )}

        {/* כרטיסיות ישיבה */}
        <div className="grid grid-cols-6 gap-2 justify-items-center">
          {seatsArray.map((seat) => {
            const g = seat.guest;

            return (
              <div
                key={seat.index}
                className={`w-20 h-20 rounded-xl border flex flex-col items-center justify-center text-center text-xs transition ${
                  g ? "bg-gray-50 border-gray-300" : "bg-white border-gray-200"
                }`}
              >
                {/* תוכן */}
                {g ? (
                  <>
                    <div className="font-medium text-gray-800 truncate w-[90%]">
                      {seat.isPrimary ? g.name : "שמורה"}
                    </div>

                    {seat.isPrimary && (
                      <div className="text-[10px] text-gray-500">
                        ({seat.partySize} מקומות)
                      </div>
                    )}

                    {/* ✅ כפתור בתוך הכרטיסיה (לא בלחיצה על הכרטיסיה) */}
                    {seat.isPrimary ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveGuest(seat.guestId)}
                        className="mt-1 px-2 py-[2px] rounded-md bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 text-[11px]"
                      >
                        הסר הושבה
                      </button>
                    ) : (
                      <div className="mt-1 text-[10px] text-gray-400">—</div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-gray-400 leading-tight">
                      מקום {seat.index + 1}
                    </div>

                    <button
                      type="button"
                      disabled={!selectedGuest}
                      onClick={() => handleAddGuest(seat.index)}
                      className={`mt-1 px-2 py-[2px] rounded-md border text-[11px] ${
                        selectedGuest
                          ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                          : "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                      }`}
                    >
                      הושב אורח
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* סגירה */}
        <div className="flex justify-center mt-6">
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
