"use client";

import { useState, useMemo, useEffect } from "react";
import { X } from "lucide-react";
import { useSeatingStore } from "@/store/seatingStore";

export default function AddGuestToTableModal({
  table,
  guests,
  onClose,
  onAutoSave,   // אופציונלי
  invitationId, // אופציונלי
}) {
  void invitationId; // כדי שלא תהיה אזהרת unused

  const assignGuestsToTable = useSeatingStore((s) => s.assignGuestsToTable);
  const removeGuestFromTable = useSeatingStore((s) => s.removeGuestFromTable);
  const isLiveMode = useSeatingStore((s) => s.seatingMode === "live");

  /* ================= TABLE + GUESTS ================= */

  const tableData = useSeatingStore((s) =>
    s.tables.find((t) => String(t.id) === String(table?.id))
  );

  const storeGuests = useSeatingStore((s) => s.guests);
  const tableGuests = storeGuests?.length ? storeGuests : guests || [];

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

  // כמה אנשים הקבוצה תופסת לצורך הושבה / חישוב מקומות
  const getPartySize = (g) => {
    // 🟢 LIVE – האמת היחידה
    if (isLiveMode) {
      const actual = Number(g?.actualArrivedCount ?? 0);
      return actual > 0 ? Math.floor(actual) : 0;
    }

    // ⚪ תכנון רגיל
    const arrived = Number(g?.arrivedCount ?? 0);
    if (arrived > 0) return Math.floor(arrived);

    const guestsCount = Number(g?.guestsCount ?? 0);
    if (guestsCount > 0) return Math.floor(guestsCount);

    return 1;
  };

  // כמה להציג בפועל בתוך המודאל על הכיסא
  const getDisplayedPartySize = (guest, seatedGuest) => {
    if (isLiveMode) {
      const actualFromSeat = Number(seatedGuest?.actualArrivedCount ?? 0);
      if (actualFromSeat > 0) return Math.floor(actualFromSeat);

      const actualFromGuest = Number(guest?.actualArrivedCount ?? 0);
      if (actualFromGuest > 0) return Math.floor(actualFromGuest);

      const countFromSeat = Number(seatedGuest?.count ?? 0);
      if (countFromSeat > 0) return Math.floor(countFromSeat);

      return 0;
    }

    const countFromSeat = Number(seatedGuest?.count ?? 0);
    if (countFromSeat > 0) return Math.floor(countFromSeat);

    return getPartySize(guest);
  };

  const extractNumberFromName = (name) => {
    const m = String(name || "").match(/\d+/);
    if (!m) return NaN;
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : NaN;
  };

  /* ================= SEATS ================= */

  const seatsArray = useMemo(() => {
    if (!tableData) return [];

    const totalSeats = Number(tableData.seats || 0);
    const arr = Array.from({ length: Math.max(0, totalSeats) }, (_, i) => ({
      index: i,
      guest: null,
      seatedGuest: null,
    }));

    for (const s of tableData.seatedGuests || []) {
      const g = tableGuests.find(
        (gg) => getGuestId(gg) === String(s?.guestId)
      );
      if (!g) continue;

      if (
        typeof s?.seatIndex === "number" &&
        s.seatIndex >= 0 &&
        s.seatIndex < arr.length
      ) {
        arr[s.seatIndex].guest = g;
        arr[s.seatIndex].seatedGuest = s;
      }
    }

    return arr;
  }, [tableData, tableGuests]);

  const occupied = tableData?.seatedGuests?.length ?? 0;
  const remainingSeats = Math.max(0, (tableData?.seats ?? 0) - occupied);

  /* ================= AVAILABLE GUESTS ================= */

  const availableGuests = useMemo(() => {
    const seatedIds = new Set(
      (useSeatingStore.getState().tables || []).flatMap((t) =>
        (t.seatedGuests || []).map((sg) => String(sg?.guestId))
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

    const localRes = assignGuestsToTable(tableData.id, guestId, count, seatIndex);

    if (!localRes?.ok) {
      setError(localRes?.message || "לא ניתן להושיב כאן");
      return;
    }

    try {
      if (onAutoSave) {
        const ok = await onAutoSave();
        if (!ok) {
          removeGuestFromTable(tableData.id, guestId);
          setError("שמירה נכשלה, ההושבה בוטלה");
          return;
        }
      }

      setError("");
      setOpenSeat(null);
      setSearchTerm("");
    } catch {
      removeGuestFromTable(tableData.id, guestId);
      setError("שגיאת רשת בשמירה");
    }
  };

  /* ================= REMOVE GUEST ================= */

  const handleRemoveGuest = async (guest) => {
    if (!tableData || !guest) return;

    const guestId = getGuestId(guest);

    removeGuestFromTable(tableData.id, guestId);

    try {
      if (onAutoSave) {
        const ok = await onAutoSave();
        if (!ok) {
          const count = getPartySize(guest);
          assignGuestsToTable(tableData.id, guestId, count, 0);
          setError("שמירה נכשלה, ההסרה בוטלה");
          return;
        }
      }

      setError("");
    } catch {
      setError("שגיאת רשת בשמירה");
    }
  };

  /* ================= COMMIT TABLE NAME ================= */

  const commitTableName = async () => {
    if (!tableData) return;

    const newNameRaw = tableNameDraft.trim();
    if (!newNameRaw) {
      setError("שם שולחן לא תקין");
      return;
    }

    const newNumber = extractNumberFromName(newNameRaw);
    if (!Number.isFinite(newNumber)) {
      setError("יש להזין שם שמכיל מספר שולחן (לדוגמה: שולחן 50)");
      return;
    }

    const prevName = tableData.name;

    useSeatingStore.setState((state) => ({
      tables: (state.tables || []).map((t) =>
        String(t.id) === String(tableData.id)
          ? { ...t, name: `שולחן ${newNumber}`, tableNumber: newNumber }
          : t
      ),
    }));

    try {
      if (onAutoSave) {
        const ok = await onAutoSave();
        if (!ok) {
          useSeatingStore.setState((state) => ({
            tables: (state.tables || []).map((t) =>
              String(t.id) === String(tableData.id)
                ? { ...t, name: prevName }
                : t
            ),
          }));
          setError("שמירה נכשלה, שינוי שם בוטל");
          return;
        }
      }

      setTableNameDraft(`שולחן ${newNumber}`);
      setIsEditingName(false);
      setError("");
    } catch {
      setError("שגיאת רשת בעדכון השולחן");
    }
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
                  setTableNameDraft(tableData.name || "");
                  setIsEditingName(false);
                  setError("");
                }
              }}
              className="text-2xl font-bold text-center border-b w-56"
            />
          ) : (
            <>
              <h2 className="text-2xl font-bold">הושבה לשולחן {tableData.name}</h2>
              <button onClick={() => setIsEditingName(true)}>✏️</button>
            </>
          )}
        </div>

        <p className="text-sm text-gray-500 text-center mb-4">
          {occupied}/{tableData.seats} מקומות תפוסים
        </p>

        {error && (
          <div className="text-red-600 text-center mb-3 font-medium">{error}</div>
        )}

        <div className="grid grid-cols-6 gap-4 justify-items-center">
          {seatsArray.map((seat, i) => {
            const g = seat.guest;
            const seatedGuest = seat.seatedGuest;
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
                      <span className="font-semibold truncate w-[90%]">{g.name}</span>
                      <span className="text-xs text-gray-600">
                        ({getDisplayedPartySize(g, seatedGuest)} מגיעים)
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

                    {availableGuests.length === 0 ? (
                      <div className="p-2 text-xs text-gray-500">אין אורחים מתאימים</div>
                    ) : (
                      availableGuests.map((g2) => (
                        <div
                          key={getGuestId(g2)}
                          onClick={() => handleSeatGuest(i, g2)}
                          className="p-2 hover:bg-blue-50 cursor-pointer text-xs flex justify-between"
                        >
                          <span>{g2.name}</span>
                          <span>{getPartySize(g2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-center mt-6">
          <button onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-lg">
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}