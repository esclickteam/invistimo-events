"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useSeatingStore } from "@/store/seatingStore";

export default function AddGuestToTableModal({ table, guests, onClose }) {
  const assignGuestsToTable = useSeatingStore((s) => s.assignGuestsToTable);
  const removeGuestFromTable = useSeatingStore((s) => s.removeGuestFromTable);

  const seated = table.seatedGuests || [];
  const [openSeat, setOpenSeat] = useState(null);
  const [error, setError] = useState("");

  const getPartySize = (guest) => {
    const raw =
      guest?.confirmedGuestsCount ?? guest?.guestsCount ?? guest?.count ?? 1;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  };

  // ספירת מקומות תפוסים בפועל
  const occupied = useMemo(() => {
    return seated.reduce((sum, s) => {
      const g = guests.find(
        (guest) => String(guest.id ?? guest._id) === String(s.guestId)
      );
      return sum + (g ? getPartySize(g) : 1);
    }, 0);
  }, [seated, guests]);

  const freeSeats = Math.max(0, table.seats - occupied);

  // בניית מערך כרטיסיות
  const seatsArray = useMemo(() => {
    const arr = Array.from({ length: table.seats }, (_, i) => ({
      index: i,
      guest: null,
    }));

    seated.forEach((s) => {
      const g = guests.find(
        (guest) => String(guest.id ?? guest._id) === String(s.guestId)
      );
      if (!g) return;
      const count = getPartySize(g);
      for (let j = 0; j < count; j++) {
        const idx = s.seatIndex + j;
        if (idx < arr.length) arr[idx].guest = g;
      }
    });

    return arr;
  }, [seated, guests, table.seats]);

  const handleSeatGuest = (seatIndex, guest) => {
    const count = getPartySize(guest);
    if (count > freeSeats) {
      setError("אין מספיק מקומות פנויים");
      return;
    }
    assignGuestsToTable(table.id, guest.id, count, seatIndex);
    setOpenSeat(null);
    setError("");
  };

  const handleRemoveGuest = (guestId) => {
    removeGuestFromTable(table.id, guestId);
  };

  const availableGuests = guests.filter(
    (g) => !seated.find((s) => String(s.guestId) === String(g.id ?? g._id))
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-2xl shadow-2xl w-[600px] p-6 max-h-[90vh] overflow-y-auto relative"
      >
        <button
          onClick={onClose}
          className="absolute top-3 left-3 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-center text-gray-800 mb-1">
          הושבה לשולחן {table.name}
        </h2>
        <p className="text-sm text-gray-500 text-center mb-4">
          {occupied}/{table.seats} מקומות תפוסים
        </p>

        {error && (
          <div className="text-red-600 bg-red-50 text-center py-2 rounded mb-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-6 gap-3 justify-items-center">
          {seatsArray.map((seat, i) => {
            const g = seat.guest;
            const isOpen = openSeat === i;

            return (
              <div
                key={i}
                className={`relative w-20 h-20 rounded-xl border flex flex-col items-center justify-center text-center text-sm cursor-pointer transition-all duration-200 ${
                  g
                    ? "bg-blue-50 border-blue-400 shadow-sm hover:shadow-md"
                    : "bg-white border-gray-200 hover:bg-blue-100"
                }`}
              >
                {g ? (
                  <>
                    <span className="font-semibold text-gray-700 truncate w-[90%]">
                      {g.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({getPartySize(g)} מושבים)
                    </span>
                    <button
                      onClick={() => handleRemoveGuest(g.id)}
                      className="text-xs text-red-600 mt-1 hover:underline"
                    >
                      הסר הושבה
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      onClick={() => setOpenSeat(isOpen ? null : i)}
                      className="text-gray-500 text-xs font-medium"
                    >
                      הושב<br />אורח
                    </span>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-[90%] mt-1 bg-white border shadow-xl rounded-md w-44 z-50 max-h-56 overflow-y-auto text-right"
                        >
                          {availableGuests.length === 0 && (
                            <div className="p-2 text-xs text-gray-400 text-center">
                              אין אורחים זמינים
                            </div>
                          )}
                          {availableGuests.map((g2) => (
                            <div
                              key={g2.id}
                              onClick={() => handleSeatGuest(i, g2)}
                              className="p-2 hover:bg-blue-50 cursor-pointer text-xs text-gray-700"
                            >
                              {g2.name} — {getPartySize(g2)} מושבים
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-gray-300 hover:bg-gray-400 font-medium text-gray-800"
          >
            סגור
          </button>
        </div>
      </motion.div>
    </div>
  );
}
