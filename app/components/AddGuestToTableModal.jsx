"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Pencil, Search, Users, Armchair, CheckCircle2 } from "lucide-react";
import { useSeatingStore } from "@/store/seatingStore";

export default function AddGuestToTableModal({
  table,
  guests,
  onClose,
  onAutoSave,
  invitationId,
}) {
  void invitationId;

  const assignGuestsToTable = useSeatingStore((s) => s.assignGuestsToTable);
  const removeGuestFromTable = useSeatingStore((s) => s.removeGuestFromTable);
  const isLiveMode = useSeatingStore((s) => s.seatingMode === "live");

  const getOccupiedSeatsForTable = useSeatingStore(
    (s) => s.getOccupiedSeatsForTable
  );

  const tables = useSeatingStore((s) => s.tables);

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

  const getPartySize = (g) => {
    if (isLiveMode) {
      const actual = Number(g?.actualArrivedCount ?? 0);
      return actual > 0 ? Math.floor(actual) : 0;
    }

    const arrived = Number(g?.arrivedCount ?? 0);
    if (arrived > 0) return Math.floor(arrived);

    const guestsCount = Number(g?.guestsCount ?? 0);
    if (guestsCount > 0) return Math.floor(guestsCount);

    return 1;
  };

  const extractNumberFromName = (name) => {
    const m = String(name || "").match(/\d+/);
    if (!m) return NaN;

    const n = Number(m[0]);
    return Number.isFinite(n) ? n : NaN;
  };

  const getInitials = (name = "") => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);

    if (!parts.length) return "א";

    return parts
      .slice(0, 2)
      .map((p) => p[0])
      .join("");
  };

  const getDropdownPositionClass = (index) => {
    const col = index % 6;

    // RTL + desktop grid-cols-6:
    // col 0 = הכי ימני, col 5 = הכי שמאלי
    if (col === 0) {
      return "right-0 translate-x-0";
    }

    if (col === 5) {
      return "left-0 right-auto translate-x-0";
    }

    return "right-1/2 translate-x-1/2";
  };

  const getDropdownArrowClass = (index) => {
    const col = index % 6;

    if (col === 0) {
      return "right-[46px] translate-x-0";
    }

    if (col === 5) {
      return "left-[46px] right-auto translate-x-0";
    }

    return "right-1/2 translate-x-1/2";
  };

  /* ================= SEATS ================= */

  const seatsArray = useMemo(() => {
    if (!tableData) return [];

    const totalSeats = Number(tableData.seats || 0);

    const arr = Array.from({ length: Math.max(0, totalSeats) }, (_, i) => ({
      index: i,
      guest: null,
    }));

    for (const s of tableData.seatedGuests || []) {
      const g = tableGuests.find((gg) => getGuestId(gg) === String(s?.guestId));

      if (!g) continue;

      if (
        typeof s?.seatIndex === "number" &&
        s.seatIndex >= 0 &&
        s.seatIndex < arr.length
      ) {
        arr[s.seatIndex].guest = g;
      }
    }

    return arr;
  }, [tableData, tableGuests]);

  const occupied = getOccupiedSeatsForTable(tableData?.id || tableData?._id);

  const remainingSeats = Math.max(0, (tableData?.seats ?? 0) - occupied);

  const occupancyPercent = tableData?.seats
    ? Math.min(100, Math.round((occupied / tableData.seats) * 100))
    : 0;

  /* ================= AVAILABLE GUESTS ================= */

  const availableGuests = useMemo(() => {
    const seatedIds = new Set(
      (tables || []).flatMap((t) =>
        (t.seatedGuests || []).map((sg) => String(sg?.guestId))
      )
    );

    return (tableGuests || []).filter((g) => {
      const id = getGuestId(g);
      const isYes = String(g?.rsvp ?? "").toLowerCase() === "yes";

      const matchesSearch =
        !searchTerm ||
        String(g?.name ?? "").toLowerCase().includes(searchTerm.toLowerCase());

      return (
        isYes &&
        !seatedIds.has(id) &&
        getPartySize(g) <= remainingSeats &&
        matchesSearch
      );
    });
  }, [tableGuests, searchTerm, remainingSeats, tables]);

  /* ================= SEAT GUEST ================= */

  const handleSeatGuest = async (seatIndex, guest) => {
    if (!tableData) return;

    const guestId = getGuestId(guest);
    const count = getPartySize(guest);

    const localRes = assignGuestsToTable(
      tableData.id,
      guestId,
      count,
      seatIndex
    );

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
      setError("יש להזין שם שמכיל מספר שולחן, לדוגמה: שולחן 50");
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
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/45 backdrop-blur-[2px]
        px-4
      "
      dir="rtl"
    >
      <div
        className="
          relative
          w-[840px] max-w-[96vw]
          max-h-[90vh] overflow-hidden
          rounded-[34px]
          border border-[#EAD8CC]
          bg-[#FBF7F2]
          shadow-[0_30px_90px_rgba(46,30,20,0.28)]
        "
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="
            absolute left-5 top-5 z-20
            flex h-10 w-10 items-center justify-center
            rounded-full
            border border-[#E6D4C6]
            bg-white/85
            text-[#8B6F5A]
            shadow-sm
            transition hover:bg-white hover:text-[#2F241D]
          "
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div
          className="
            border-b border-[#EAD8CC]
            bg-gradient-to-l from-[#FFF7EE] via-white to-[#F2E1D2]
            px-8 pb-5 pt-7
          "
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div
              className="
                flex h-14 w-14 items-center justify-center
                rounded-2xl border border-[#D6A678]
                bg-[#FFF8EF]
                text-[#9A5A26]
                shadow-sm
              "
            >
              <Armchair size={24} />
            </div>

            <div className="flex items-center justify-center gap-2">
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
                  className="
                    h-11 w-60 rounded-2xl
                    border border-[#D6A678]
                    bg-white px-4
                    text-center text-2xl font-black
                    text-[#2F241D]
                    outline-none
                    focus:ring-2 focus:ring-[#D6A678]/30
                  "
                />
              ) : (
                <>
                  <h2 className="text-2xl font-black text-[#2F241D]">
                    הושבה לשולחן {tableData.name}
                  </h2>

                  <button
                    onClick={() => setIsEditingName(true)}
                    className="
                      flex h-8 w-8 items-center justify-center
                      rounded-full
                      bg-[#FFF2E5]
                      text-[#A65E27]
                      transition hover:bg-[#F5DDC6]
                    "
                    title="עריכת שם שולחן"
                  >
                    <Pencil size={15} />
                  </button>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-[#F0E2D8] px-3 py-1 text-xs font-bold text-[#7A5A43]">
                {occupied}/{tableData.seats} מקומות תפוסים
              </span>

              <span className="rounded-full bg-[#E4FBEA] px-3 py-1 text-xs font-bold text-[#137A3D]">
                {remainingSeats} פנויים
              </span>

              <span className="rounded-full bg-[#FFF1E4] px-3 py-1 text-xs font-bold text-[#A65E27]">
                {occupancyPercent}% תפוסה
              </span>
            </div>

            <div className="h-2 w-full max-w-[360px] overflow-hidden rounded-full bg-[#EAD8CC]">
              <div
                className="
                  h-full rounded-full
                  bg-gradient-to-l from-[#B98A45] via-[#D8B36A] to-[#7BCB95]
                  transition-all
                "
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>
          </div>

          {error && (
            <div
              className="
                mx-auto mt-4 max-w-[520px]
                rounded-2xl border border-red-200
                bg-red-50 px-4 py-3
                text-center text-sm font-bold text-red-700
              "
            >
              {error}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[62vh] overflow-y-auto px-7 py-6">
          <div
            className="
              mb-4 flex items-center justify-between gap-3
              rounded-3xl border border-[#EAD8CC]
              bg-white px-4 py-3
            "
          >
            <div className="flex items-center gap-2 text-sm font-bold text-[#2F241D]">
              <Users size={18} className="text-[#A65E27]" />
              בחירת מושב ואורח
            </div>

            <div className="text-xs font-semibold text-[#8B6F5A]">
              לחיצה על מושב פנוי פותחת בחירת אורח · לחיצה על מושב תפוס מסירה
            </div>
          </div>

          {/* Seats */}
          <div
            className="
              grid grid-cols-2 gap-3
              sm:grid-cols-3
              md:grid-cols-4
              lg:grid-cols-6
            "
          >
            {seatsArray.map((seat, i) => {
              const g = seat.guest;
              const isOpen = openSeat === i;

              return (
                <div key={i} className="relative">
                  <button
                    type="button"
                    className={`
                      group relative
                      min-h-[98px] w-full
                      rounded-[22px]
                      border
                      p-3 text-center
                      transition-all duration-200
                      ${
                        g
                          ? "border-[#8B6532] bg-gradient-to-br from-[#B98A45] via-[#D8B36A] to-[#FFF2D8] shadow-[0_10px_26px_rgba(128,86,35,0.22)] hover:border-[#6D4A24]"
                          : isOpen
                          ? "border-[#B98A45] bg-[#FFF5EA] shadow-[0_10px_24px_rgba(166,94,39,0.14)]"
                          : "border-[#E6D7C8] bg-white hover:border-[#D6A678] hover:bg-[#FFF9F3] hover:shadow-[0_8px_20px_rgba(104,72,46,0.08)]"
                      }
                    `}
                    onClick={() => {
                      if (g) {
                        handleRemoveGuest(g);
                        return;
                      }

                      setOpenSeat(isOpen ? null : i);
                      setSearchTerm("");
                      setError("");
                    }}
                  >
                    <span
                      className={`
                        absolute right-3 top-2
                        flex h-6 w-6 items-center justify-center
                        rounded-full text-[11px] font-black
                        ${
                          g
                            ? "bg-[#FFF3D7] text-[#6D4A24] shadow-sm"
                            : "bg-[#F3E7DC] text-[#8B6F5A]"
                        }
                      `}
                    >
                      {i + 1}
                    </span>

                    {g ? (
                      <div className="flex h-full flex-col items-center justify-center gap-1 pt-3">
                        <div
                          className="
                            flex h-9 w-9 items-center justify-center
                            rounded-full
                            bg-[#6D4A24]
                            text-xs font-black text-white
                            shadow-sm ring-2 ring-white/55
                          "
                        >
                          {getInitials(g.name)}
                        </div>

                        <div className="w-full truncate text-[12px] font-black text-[#3A2814]">
                          {g.name}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] font-black text-[#5A3C1C]">
                          <CheckCircle2 size={12} />
                          {getPartySize(g)} מגיעים
                        </div>

                        <div className="mt-0.5 text-[10px] font-bold text-[#6D4A24] opacity-0 transition group-hover:opacity-100">
                          לחץ להסרה
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-1 pt-3">
                        <div
                          className={`
                            flex h-9 w-9 items-center justify-center
                            rounded-full border border-dashed
                            text-lg font-black
                            transition
                            ${
                              isOpen
                                ? "border-[#B98A45] bg-[#B98A45] text-white shadow-[0_6px_16px_rgba(185,138,69,0.28)]"
                                : "border-[#D6A678] bg-[#FFF8EF] text-[#A65E27]"
                            }
                          `}
                        >
                          +
                        </div>

                        <div className="text-[12px] font-black text-[#5D4032]">
                          הושב אורח
                        </div>

                        <div className="text-[10px] text-[#9A7E6A]">
                          מושב פנוי
                        </div>
                      </div>
                    )}
                  </button>

                  {isOpen && !g && (
                    <div
                      className={`
                        absolute top-[58px] z-50
                        w-[230px]
                        ${getDropdownPositionClass(i)}
                        overflow-hidden
                        rounded-2xl
                        border border-[#D6A678]
                        bg-white
                        shadow-[0_14px_34px_rgba(46,30,20,0.18)]
                      `}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* חץ קטן שמחבר את הבחירה לפלוס */}
                      <div
                        className={`
                          absolute -top-2
                          h-4 w-4 rotate-45
                          border-r border-t border-[#D6A678]
                          bg-[#FFF8F1]
                          ${getDropdownArrowClass(i)}
                        `}
                      />

                      <div className="relative border-b border-[#F0E2D8] bg-[#FFF8F1] p-2">
                        <div className="relative">
                          <Search
                            size={14}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A98167]"
                          />

                          <input
                            type="text"
                            placeholder="חיפוש אורח…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                            className="
                              h-9 w-full rounded-xl
                              border border-[#E2CDBB]
                              bg-white pr-8 pl-3
                              text-xs text-[#2F241D]
                              outline-none
                              placeholder:text-[#B79B89]
                              focus:border-[#D6A678]
                              focus:ring-2 focus:ring-[#D6A678]/25
                            "
                          />
                        </div>
                      </div>

                      <div className="max-h-[190px] overflow-y-auto p-1.5">
                        {availableGuests.length === 0 ? (
                          <div
                            className="
                              rounded-xl bg-[#FBF7F3]
                              px-3 py-3
                              text-center text-xs font-semibold text-[#8B6F5A]
                            "
                          >
                            אין אורחים מתאימים
                          </div>
                        ) : (
                          availableGuests.map((g2) => (
                            <button
                              type="button"
                              key={getGuestId(g2)}
                              onClick={() => handleSeatGuest(i, g2)}
                              className="
                                flex w-full items-center justify-between gap-2
                                rounded-xl px-2.5 py-2
                                text-right transition
                                hover:bg-[#FFF4E8]
                              "
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <div
                                  className="
                                    flex h-7 w-7 shrink-0 items-center justify-center
                                    rounded-full bg-[#F1DFCF]
                                    text-[10px] font-black text-[#7A4B2D]
                                  "
                                >
                                  {getInitials(g2.name)}
                                </div>

                                <span className="truncate text-xs font-bold text-[#2F241D]">
                                  {g2.name}
                                </span>
                              </div>

                              <span
                                className="
                                  shrink-0 rounded-full bg-[#FFF0D2]
                                  px-2 py-0.5 text-[10px] font-black text-[#8B6532]
                                "
                              >
                                {getPartySize(g2)}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className="
            flex items-center justify-between gap-3
            border-t border-[#EAD8CC]
            bg-white px-7 py-4
          "
        >
          <div className="text-xs font-semibold text-[#8B6F5A]">
            השינויים נשמרים אוטומטית לפי מנגנון השמירה הקיים.
          </div>

          <button
            onClick={onClose}
            className="
              rounded-2xl bg-[#2F241D]
              px-8 py-2.5
              text-sm font-bold text-white
              shadow-sm transition
              hover:bg-[#1E1712]
              active:scale-[0.98]
            "
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}