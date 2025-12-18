"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { useSeatingStore } from "@/store/seatingStore";

export default function AddGuestToTableModal({ table, guests, onClose }) {
  const assignGuestsToTable = useSeatingStore((s) => s.assignGuestsToTable);
  const removeGuestFromTable = useSeatingStore((s) => s.removeGuestFromTable);

  // שולחן מעודכן מה־store
  const tableData = useSeatingStore((s) =>
    s.tables.find((t) => t.id === table.id)
  );

  // אורחים מה־store (אם קיים) אחרת מה־props
  const storeGuests = useSeatingStore((s) => s.guests);
  const tableGuests = storeGuests?.length ? storeGuests : guests;

  // ❌ היה: useState<number | null>(null)
  // ✅ מתוקן:
  const [openSeat, setOpenSeat] = useState(null);
  const [error, setError] = useState("");

  const getGuestId = (g) => String(g?.id ?? g?._id ?? "");
  const getPartySize = (g) => {
    const n = Number(g?.confirmedGuestsCount ?? g?.guestsCount ?? g?.count ?? 1);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  };

  /* ================= מושבים ================= */

  const seatsArray = useMemo(() => {
    if (!tableData) return [];

    const arr = Array.from({ length: tableData.seats }, (_, i) => ({
      index: i,
      guest: null,
    }));

    for (const s of tableData.seatedGuests || []) {
      const g = tableGuests.find(
        (gg) => getGuestId(gg) === String(s.guestId)
      );
      if (!g) continue;

      if (
        typeof s.seatIndex === "number" &&
        s.seatIndex >= 0 &&
        s.seatIndex < arr.length
      ) {
        arr[s.seatIndex].guest = g;
      }
    }

    return arr;
  }, [tableData, tableGuests]);

  const occupied = seatsArray.reduce(
    (sum, s) => sum + (s.guest ? 1 : 0),
    0
  );

  /* ================= אורחים זמינים ================= */

  const availableGuests = useMemo(() => {
    const seatedIds = new Set(
      (useSeatingStore.getState().tables || []).flatMap((t) =>
        (t.seatedGuests || []).map((sg) => String(sg.guestId))
      )
    );

    return (tableGuests || []).filter((g) => {
      const id = getGuestId(g);
      const hasTable = Boolean(g?.tableId);
      return !hasTable && !seatedIds.has(id);
    });
  }, [tableGuests]);

  /* ================= הושבה ================= */

  const handleSeatGuest = async (seatIndex, guest) => {
    if (!tableData) return;

    const count = getPartySize(guest);
    const res = assignGuestsToTable(
      tableData.id,
      guest.id,
      count,
      seatIndex
    );

    if (!res?.ok) {
      setError(res?.message || "לא ניתן להושיב כאן");
      return;
    }

    // 🔥 סנכרון מונגו
    await fetch("/api/guests/assign-table", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestId: guest.id,
        tableId: tableData.id,
        tableName: tableData.name,
        seatIndex,
      }),
    });

    setError("");
    setOpenSeat(null);
  };

  /* ================= הסרה ================= */

  const handleRemoveGuest = async (guest) => {
    if (!tableData || !guest) return;

    removeGuestFromTable(tableData.id, guest.id);

    await fetch("/api/guests/remove-from-table", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId: guest.id }),
    });
  };

  if (!tableData) return null;

  /* ================= UI ================= */

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative bg-white rounded-2xl shadow-2xl w-[700px] p-8 max-h-[90vh] overflow-y-auto border border-gray-100">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600"
          aria-label="סגור"
        >
          <X size={22} />
        </button>

        <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">
          הושבה לשולחן {tableData.name}
        </h2>

        <p className="text-sm text-gray-500 text-center mb-5">
          {occupied}/{tableData.seats} מקומות תפוסים
        </p>

        {error && (
          <div className="text-red-600 bg-red-50 border border-red-200 text-center py-2 rounded-xl mb-4 font-medium">
            {error}
          </div>
        )}

        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200 shadow-inner">
          <div className="grid grid-cols-6 gap-4 justify-items-center">
            {seatsArray.map((seat, i) => {
              const g = seat.guest;
              const isOpen = openSeat === i;

              return (
                <div key={i} className="relative">
                  <div
                    className={`w-20 h-20 rounded-xl border flex flex-col items-center justify-center text-center text-sm cursor-pointer transition ${
                      g
                        ? "bg-blue-100 border-blue-400 shadow-md"
                        : "bg-white border-gray-200 hover:bg-blue-50"
                    }`}
                    onClick={() => {
                      if (g) handleRemoveGuest(g);
                      else {
                        setOpenSeat(isOpen ? null : i);
                        setError("");
                      }
                    }}
                  >
                    <div className="absolute top-1 right-2 text-[10px] text-gray-400">
                      {i + 1}
                    </div>

                    {g ? (
                      <>
                        <span className="font-semibold truncate w-[90%]">
                          {g.name}
                        </span>
                        <span className="text-xs text-gray-600">
                          ({getPartySize(g)} מגיעים)
                        </span>
                        <span className="text-[11px] text-red-600 mt-1">
                          להסרה
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-medium leading-4">
                        הושב
                        <br />
                        אורח
                      </span>
                    )}
                  </div>

                  {isOpen && !g && (
                    <div className="absolute top-[95%] mt-2 bg-white border shadow-xl rounded-lg w-52 z-50 max-h-64 overflow-y-auto">
                      <div className="sticky top-0 bg-white border-b p-2 text-[11px] text-gray-500">
                        לבחור אורח (לא משובץ)
                      </div>

                      {availableGuests.length === 0 ? (
                        <div className="p-3 text-xs text-gray-400 text-center">
                          אין אורחים זמינים
                        </div>
                      ) : (
                        availableGuests.map((g2) => (
                          <div
                            key={getGuestId(g2)}
                            onClick={() => handleSeatGuest(i, g2)}
                            className="p-2 hover:bg-blue-50 cursor-pointer text-xs flex justify-between"
                          >
                            <span className="truncate">{g2.name}</span>
                            <span className="text-gray-500">
                              {getPartySize(g2)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center mt-7">
          <button
            onClick={onClose}
            className="px-7 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
