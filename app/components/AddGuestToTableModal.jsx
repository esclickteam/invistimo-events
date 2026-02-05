"use client";

import { useState, useMemo, useEffect } from "react";
import { X } from "lucide-react";
import { useSeatingStore } from "@/store/seatingStore";

export default function AddGuestToTableModal({ table, guests, onClose }) {
  const assignGuestsToTable = useSeatingStore((s) => s.assignGuestsToTable);
  const removeGuestFromTable = useSeatingStore((s) => s.removeGuestFromTable);

  /* ================= TABLE + GUESTS ================= */

  const tableData = useSeatingStore((s) =>
    s.tables.find((t) => t.id === table.id)
  );

  const storeGuests = useSeatingStore((s) => s.guests);
  const tableGuests = storeGuests?.length ? storeGuests : guests;

  const [openSeat, setOpenSeat] = useState(null);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  /* ================= EDIT TABLE NAME ================= */

  const [isEditingName, setIsEditingName] = useState(false);
  const [tableNameDraft, setTableNameDraft] = useState("");

  useEffect(() => {
    if (!tableData) return;
    setTableNameDraft(tableData.name || "");
  }, [tableData?.name]);

  /* ================= HELPERS ================= */

  const getGuestId = (g) => String(g?._id ?? g?.id ?? "");

  const getPartySize = (g) => {
    const n = Number(g?.arrivedCount ?? 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };

  /* ================= SEATS ================= */

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

  const occupied = tableData?.seatedGuests?.length ?? 0;
  const remainingSeats = (tableData?.seats ?? 0) - occupied;

  /* ================= AVAILABLE GUESTS ================= */

  const availableGuests = useMemo(() => {
    const seatedIds = new Set(
      (useSeatingStore.getState().tables || []).flatMap((t) =>
        (t.seatedGuests || []).map((sg) => String(sg.guestId))
      )
    );

    return (tableGuests || []).filter((g) => {
      const id = getGuestId(g);
      const isYes = String(g?.rsvp ?? "").toLowerCase() === "yes";

      const matchesSearch =
        !searchTerm ||
        String(g?.name ?? "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      return (
        isYes &&
        !seatedIds.has(id) &&
        getPartySize(g) <= remainingSeats &&
        matchesSearch
      );
    });
  }, [tableGuests, searchTerm, remainingSeats]);

  /* ================= SEAT GUEST ================= */

  const handleSeatGuest = async (seatIndex, guest) => {
    if (!tableData) return;

    const guestId = getGuestId(guest);
    const count = getPartySize(guest);

    const res = assignGuestsToTable(
      tableData.id,
      guestId,
      count,
      seatIndex
    );

    if (!res?.ok) {
      setError(res?.message || "לא ניתן להושיב כאן");
      return;
    }

    await fetch("/api/guests/assign-table", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestId,
        tableName: tableData.name, // 🔥 מקור אמת יחיד
        seatIndex,
      }),
    });

    setError("");
    setOpenSeat(null);
    setSearchTerm("");
  };

  /* ================= REMOVE GUEST ================= */

  const handleRemoveGuest = async (guest) => {
    if (!tableData || !guest) return;

    const guestId = getGuestId(guest);

    removeGuestFromTable(tableData.id, guestId);

    await fetch("/api/guests/remove-from-table", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId }),
    });
  };

  /* ================= COMMIT TABLE NAME ================= */

  const commitTableName = async () => {
    if (!tableData) return;

    const newName = tableNameDraft.trim();
    if (!newName) {
      setError("שם שולחן לא תקין");
      return;
    }

    const oldTableName = tableData.name;

    const res = await fetch("/api/seating/update-table", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oldTableName,
        newName,
      }),
    });

    if (!res.ok) {
      setError("שגיאה בעדכון השולחן");
      return;
    }

    useSeatingStore.setState((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableData.id ? { ...t, name: newName } : t
      ),
    }));

    setIsEditingName(false);
  };

  if (!tableData) return null;

  /* ================= UI ================= */

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-2xl shadow-2xl w-[700px] p-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600"
        >
          <X size={22} />
        </button>

        {/* TITLE */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {isEditingName ? (
            <input
              autoFocus
              value={tableNameDraft}
              onChange={(e) => setTableNameDraft(e.target.value)}
              onBlur={commitTableName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTableName();
                if (e.key === "Escape") {
                  setTableNameDraft(tableData.name);
                  setIsEditingName(false);
                }
              }}
              className="text-2xl font-bold text-center border-b w-48"
            />
          ) : (
            <>
              <h2 className="text-2xl font-bold">
                הושבה לשולחן {tableData.name}
              </h2>
              <button onClick={() => setIsEditingName(true)}>✏️</button>
            </>
          )}
        </div>

        <p className="text-sm text-gray-500 text-center mb-4">
          {occupied}/{tableData.seats} מקומות תפוסים
        </p>

        {error && (
          <div className="text-red-600 text-center mb-3 font-medium">
            {error}
          </div>
        )}

        {/* SEATS */}
        <div className="grid grid-cols-6 gap-4 justify-items-center">
          {seatsArray.map((seat, i) => {
            const g = seat.guest;
            const isOpen = openSeat === i;

            return (
              <div key={i} className="relative">
                <div
                  className={`w-20 h-20 rounded-xl border flex flex-col items-center justify-center text-center text-sm cursor-pointer ${
                    g
                      ? "bg-blue-100 border-blue-400"
                      : "bg-white border-gray-200 hover:bg-blue-50"
                  }`}
                  onClick={() => {
                    if (g) handleRemoveGuest(g);
                    else {
                      setOpenSeat(isOpen ? null : i);
                      setSearchTerm("");
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
                    </>
                  ) : (
                    <span className="text-xs">הושב אורח</span>
                  )}
                </div>

                {isOpen && !g && (
                  <div className="absolute top-[95%] mt-2 bg-white border shadow-xl rounded-lg w-60 z-50">
                    <input
                      type="text"
                      placeholder="חיפוש…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-2 py-1 text-xs border-b"
                    />

                    {availableGuests.map((g2) => (
                      <div
                        key={getGuestId(g2)}
                        onClick={() => handleSeatGuest(i, g2)}
                        className="p-2 hover:bg-blue-50 cursor-pointer text-xs flex justify-between"
                      >
                        <span>{g2.name}</span>
                        <span>{getPartySize(g2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 rounded-lg"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
