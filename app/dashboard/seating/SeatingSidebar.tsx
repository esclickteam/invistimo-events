"use client";

import { useEffect, useMemo, useState } from "react";
import { useSeatingStore } from "@/store/seatingStore";
import { useSeatingStats } from "../../hooks/useSeatingStats";
import { useGroupStore } from "@/store/groupStore";

/* ================= CONSTANTS ================= */

const NO_GROUP_KEY = "__no_group__";

const normalizeGroupId = (value: unknown) => {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "null" ||
    value === "undefined"
  ) {
    return NO_GROUP_KEY;
  }

  return String(value);
};

/* ================= TYPES ================= */

type Guest = {
  id?: string;
  _id: string;
  name: string;
  phone?: string;
  groupId?: string | null;
  rsvp?: "yes" | "no" | "pending";
  tableId?: string | null;
  tableName?: string | null;
};

type Group = {
  _id: string;
  name: string;
  tableId?: string | null;
};

type SeatedGuest = {
  guestId: string;
  groupId?: string;
};

type Table = {
  id: string;
  name: string;
  seats: number;
  seatedGuests: SeatedGuest[];
};

type Filter = "all" | "seated" | "unseated";

type GroupPart = {
  type: "groupPart" | "remaining" | "normal";
  title: string;
  table: Table | null;
  guests: Guest[];
  isSplitPart: boolean;
};

/* ================= COMPONENT ================= */

export default function SeatingSidebar({
  invitationId,
}: {
  invitationId?: string | null;
}) {
  /* ===== STORE ===== */
  const guests = useSeatingStore((s) => s.guests) as Guest[];
  const tables = useSeatingStore((s) => s.tables) as Table[];
  const isLiveMode = useSeatingStore((s) => s.seatingMode === "live");

  const assignGuestBlock = useSeatingStore((s) => s.assignGuestBlock);
  const removeFromSeat = useSeatingStore((s) => s.removeFromSeat);
  const seatGroup = useSeatingStore((s) => s.seatGroup);
  const moveGuestsToTable = useSeatingStore((s) => s.moveGuestsToTable);
  const setSeatingGroups = useSeatingStore((s) => s.setGroups);

  const groups = useGroupStore((s) => s.groups) as Group[];
  const loadGroups = useGroupStore((s) => s.loadGroups);

  const [mobileOpen, setMobileOpen] = useState(false);

  const { stats, isGuestSeated, getGroupStats } = useSeatingStats();

  /* ===== UI STATE ===== */
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [selectingGuestId, setSelectingGuestId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (!invitationId) return;
    loadGroups(invitationId);
  }, [invitationId, loadGroups]);

  useEffect(() => {
    setSeatingGroups(groups || []);
  }, [groups, setSeatingGroups]);

  /* ================= HELPERS ================= */

  const seatGuestId = (g: Guest) => String(g.id ?? g._id);

  const getSeatCount = (g: any) => {
    const store = useSeatingStore.getState();

    if (!isLiveMode) {
      return store.getPlannedSeatCount(g);
    }

    return Number(store.liveArrivals[String(g.id ?? g._id)] ?? 0);
  };

  const isEligibleInCurrentMode = (g: Guest) => {
    if (!isLiveMode) return g.rsvp === "yes";
    return getSeatCount(g) > 0;
  };

  const syncAssignToServer = async (guestId: string, tableId: string) => {
    if (!invitationId) return false;

    try {
      const res = await fetch("/api/guests/assign-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId,
          invitationId,
          tableId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      return res.ok && data?.success !== false;
    } catch {
      return false;
    }
  };

  const syncRemoveFromServer = async (guestId: string) => {
    if (!invitationId) return false;

    try {
      const res = await fetch("/api/guests/remove-from-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId,
          invitationId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      return res.ok && data?.success !== false;
    } catch {
      return false;
    }
  };

  const assignSingleGuestToTable = async (guestId: string, tableId: string) => {
    assignGuestBlock({ guestId, tableId });

    const ok = await syncAssignToServer(guestId, tableId);
    if (!ok) {
      console.error("Failed assigning guest on server", guestId, tableId);
    }
  };

  const removeSingleGuestFromTable = async (guestId: string) => {
    removeFromSeat(guestId);

    const ok = await syncRemoveFromServer(guestId);
    if (!ok) {
      console.error("Failed removing guest from server", guestId);
    }
  };

  /* ================= TABLE MAPS ================= */

  const guestTableMap = useMemo(() => {
    const map = new Map<string, Table>();

    tables.forEach((t) => {
      (t.seatedGuests || []).forEach((sg) => {
        map.set(String(sg.guestId), t);
      });
    });

    return map;
  }, [tables]);

  /*
    חשוב:
    כאן מזהים האם האורח הושב כחלק מקבוצה.
    אם הוא הושב לבד דרך assignGuestBlock, אין sg.groupId,
    ולכן הוא לא ייכנס ל"חלק 1".
  */
  const groupedSeatGuestIds = useMemo(() => {
    const set = new Set<string>();

    tables.forEach((t) => {
      (t.seatedGuests || []).forEach((sg) => {
        if (sg.groupId) {
          set.add(String(sg.guestId));
        }
      });
    });

    return set;
  }, [tables]);

  const isGuestSeatedAsGroupPart = (guest: Guest) => {
    const gid = seatGuestId(guest);
    const guestGroupId = normalizeGroupId(guest.groupId);

    if (guestGroupId === NO_GROUP_KEY) return false;
    if (!groupedSeatGuestIds.has(gid)) return false;

    return tables.some((table) =>
      (table.seatedGuests || []).some(
        (seat) =>
          String(seat.guestId) === gid &&
          String(seat.groupId) === guestGroupId
      )
    );
  };

  /* ================= GROUPED GUESTS ================= */

  const groupedGuests = useMemo(() => {
    const map: Record<string, Guest[]> = {};

    guests.forEach((g) => {
      const key = normalizeGroupId(g.groupId);

      if (!map[key]) map[key] = [];
      map[key].push(g);
    });

    return map;
  }, [guests]);

  /* ================= TABLE LABEL ================= */

  const getTableGroupLabel = (tableId: string) => {
    const seatedGuests = guests.filter(
      (g) =>
        isEligibleInCurrentMode(g) &&
        guestTableMap.get(seatGuestId(g))?.id === tableId
    );

    const groupIds = Array.from(
      new Set(
        seatedGuests
          .map((g) => normalizeGroupId(g.groupId))
          .filter((gid) => gid !== NO_GROUP_KEY)
      )
    );

    if (groupIds.length === 1) {
      const group = groups.find((gr) => String(gr._id) === String(groupIds[0]));
      return group?.name || "";
    }

    return "";
  };

  const tableLabel = (t: Table) => {
    const count = guests
      .filter(
        (g) =>
          isEligibleInCurrentMode(g) &&
          guestTableMap.get(seatGuestId(g))?.id === t.id
      )
      .reduce((sum, g) => sum + getSeatCount(g), 0);

    const groupLabel = getTableGroupLabel(t.id);

    return groupLabel
      ? `${groupLabel} · ${t.name} (${count}/${t.seats})`
      : `${t.name} (${count}/${t.seats})`;
  };

  /* ================= FILTER ================= */

  function guestVisible(g: Guest) {
    if (!isEligibleInCurrentMode(g)) return false;

    const q = search.trim().toLowerCase();
    const isSeated = isGuestSeated(g);

    if (filter === "seated" && !isSeated) return false;
    if (filter === "unseated" && isSeated) return false;

    const groupName =
      normalizeGroupId(g.groupId) !== NO_GROUP_KEY
        ? groups.find((gr) => String(gr._id) === String(g.groupId))?.name || ""
        : "";

    if (!q) return true;

    return (
      g.name.toLowerCase().includes(q) ||
      String(g.phone || "").includes(q) ||
      groupName.toLowerCase().includes(q)
    );
  }

  /* ================= GROUP PARTS ================= */

  const buildGroupParts = (list: Guest[]): GroupPart[] => {
    const eligibleGuests = list.filter(isEligibleInCurrentMode);

    const totalGroupSeats = eligibleGuests.reduce(
      (sum, guest) => sum + getSeatCount(guest),
      0
    );

    const maxTableSeats = Math.max(
      0,
      ...tables.map((table) => Number(table.seats || 0))
    );

    const groupSeatedByTable = new Map<
      string,
      {
        table: Table;
        guests: Guest[];
        seatsUsed: number;
      }
    >();

    const normalGuests: Guest[] = [];

    eligibleGuests.forEach((guest) => {
      const gid = seatGuestId(guest);
      const table = guestTableMap.get(gid);
      const seatedAsGroup = isGuestSeatedAsGroupPart(guest);

      /*
        אורח שהושב לבד מתוך קבוצה גדולה:
        לא נכנס לחלק 1.
        נשאר כאורח רגיל מתחת לקבוצה.
      */
      if (!table || !seatedAsGroup) {
        normalGuests.push(guest);
        return;
      }

      const key = String(table.id);

      if (!groupSeatedByTable.has(key)) {
        groupSeatedByTable.set(key, {
          table,
          guests: [],
          seatsUsed: 0,
        });
      }

      const part = groupSeatedByTable.get(key)!;

      part.guests.push(guest);
      part.seatsUsed += getSeatCount(guest);
    });

    const groupPartsRaw = Array.from(groupSeatedByTable.values());

    const shouldShowAsParts =
      maxTableSeats > 0 &&
      totalGroupSeats > maxTableSeats &&
      groupPartsRaw.length > 0;

    /*
      אם אין הושבה קבוצתית בפועל:
      מחזירים רק רשימה רגילה.
      ככה אורח אחד שהושב לבד לא מקפיץ את הקבוצה לחלקים.
    */
    if (!shouldShowAsParts) {
      return [
        {
          type: "normal",
          title: "",
          table: null,
          guests: eligibleGuests,
          isSplitPart: false,
        },
      ];
    }

    const parts: GroupPart[] = groupPartsRaw.map((part, index) => ({
      type: "groupPart",
      title: `חלק ${index + 1}`,
      table: part.table,
      guests: part.guests,
      isSplitPart: true,
    }));

    if (normalGuests.length > 0) {
      parts.push({
        type: "normal",
        title: "אורחים בודדים / ללא חלק",
        table: null,
        guests: normalGuests,
        isSplitPart: true,
      });
    }

    return parts;
  };

  /* ================= SEARCH OPEN ================= */

  useEffect(() => {
    if (!search.trim()) return;

    setOpenGroups((prev) => {
      const next = { ...prev };

      Object.entries(groupedGuests).forEach(([gid, list]) => {
        if (list.some(guestVisible)) next[gid] = true;
      });

      return next;
    });
  }, [search, groupedGuests]);

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };

      Object.entries(groupedGuests).forEach(([gid, list]) => {
        const eligible = list.filter(isEligibleInCurrentMode);
        const { remaining } = getGroupStats(eligible);

        if (remaining === 0) next[gid] = false;
      });

      return next;
    });
  }, [tables, groupedGuests, isLiveMode]);

  /* ================= GROUP ASSIGN ================= */

  const handleGroupTableChange = async ({
    group,
    groupId,
    visibleGuests,
    tableId,
  }: {
    group: Group | null;
    groupId: string;
    visibleGuests: Guest[];
    tableId: string;
  }) => {
    const eligibleGuests = visibleGuests.filter(isEligibleInCurrentMode);

    if (!tableId) {
      for (const g of eligibleGuests) {
        const gid = seatGuestId(g);
        await removeSingleGuestFromTable(gid);
      }

      return;
    }

    if (group && groupId !== NO_GROUP_KEY) {
      const beforeUnseatedIds = new Set(
        eligibleGuests
          .filter((g) => !isGuestSeated(g))
          .map((g) => seatGuestId(g))
      );

      const result = seatGroup(group._id, tableId);

      if (!result?.ok) {
        console.error(result?.message || "Failed seating group");
        return;
      }

      const afterGuests = useSeatingStore.getState().guests as Guest[];

      const newlySeatedIds = afterGuests
        .filter(
          (g) =>
            beforeUnseatedIds.has(String(g.id ?? g._id)) &&
            String(g.tableId) === String(tableId)
        )
        .map((g) => String(g.id ?? g._id));

      for (const gid of newlySeatedIds) {
        const ok = await syncAssignToServer(gid, tableId);
        if (!ok) {
          console.error("Failed assigning guest on server", gid, tableId);
        }
      }

      return;
    }

    for (const g of eligibleGuests) {
      const gid = seatGuestId(g);
      await assignSingleGuestToTable(gid, tableId);
    }
  };

  /* ================= RENDER ================= */

  return (
    <>
      {/* ===== MOBILE BUTTON ===== */}
      <button
        onClick={() => setMobileOpen(true)}
        className="
          md:hidden fixed bottom-5 left-5 z-40
          rounded-full bg-[#2F241D] px-5 py-3
          text-sm font-semibold text-white
          shadow-lg active:scale-95 transition
        "
      >
        אורחים
      </button>

      {/* ===== OVERLAY ===== */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 right-0 z-50
          h-full w-[420px] max-w-[92vw]
          flex flex-col
          border-l border-[#EAD8CC]
          bg-[#FBF7F3]
          shadow-2xl
          transform transition-transform duration-300

          md:static md:translate-x-0 md:z-auto md:pointer-events-auto md:shadow-none

          ${
            mobileOpen
              ? "translate-x-0 pointer-events-auto"
              : "translate-x-full pointer-events-none"
          }
        `}
      >
        {/* ===== Header ===== */}
        <div className="border-b border-[#EAD8CC] bg-white/80 p-5 backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-black text-[#2F241D]">
                הקצאת מקומות
              </h2>
              <p className="mt-1 text-xs text-[#8B6F5A]">
                ניהול אורחים, קבוצות ושולחנות
              </p>
            </div>

            <button
              onClick={() => setMobileOpen(false)}
              className="
                md:hidden rounded-full border border-[#EAD8CC]
                bg-white px-3 py-1 text-sm text-[#6B4E3D]
              "
            >
              ✕
            </button>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-[#EAD8CC] bg-[#FFF9ED] p-3 text-center">
              <div className="text-[11px] text-[#8B6F5A]">סה״כ</div>
              <div className="text-base font-black text-[#2F241D]">
                {stats.total}
              </div>
            </div>

            <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-center">
              <div className="text-[11px] text-green-700">הושבו</div>
              <div className="text-base font-black text-green-800">
                {stats.seated}
              </div>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-center">
              <div className="text-[11px] text-orange-700">נשארו</div>
              <div className="text-base font-black text-orange-800">
                {stats.remaining}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש אורח / טלפון / קבוצה"
              className="
                h-11 flex-1 rounded-2xl
                border border-[#E6C3AD]
                bg-white px-4 text-sm
                text-[#2F241D]
                outline-none transition
                placeholder:text-[#B79B89]
                focus:border-[#C79B7B]
                focus:ring-2 focus:ring-[#E6C3AD]/40
              "
            />

            <div className="relative">
              <button
                onClick={() => setFilterOpen((o) => !o)}
                className="
                  h-11 min-w-[92px]
                  rounded-2xl border border-[#E6C3AD]
                  bg-white px-4 text-sm font-semibold
                  text-[#4B3528]
                  transition hover:bg-[#FFF9ED]
                "
              >
                {filter === "all" && "הכל"}
                {filter === "seated" && "שובצו"}
                {filter === "unseated" && "לא שובצו"}
                <span className="mr-2 text-xs opacity-60">▾</span>
              </button>

              {filterOpen && (
                <div className="absolute left-0 z-20 mt-2 w-[220px] overflow-hidden rounded-2xl border border-[#EAD8CC] bg-white shadow-xl">
                  <button
                    onClick={() => {
                      setFilter("all");
                      setFilterOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-[#F6EDE8]"
                  >
                    <span>הכל</span>
                    {filter === "all" && "✓"}
                  </button>

                  <button
                    onClick={() => {
                      setFilter("seated");
                      setFilterOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-[#F6EDE8]"
                  >
                    <span>שובצו</span>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                      {stats.seated}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setFilter("unseated");
                      setFilterOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-[#F6EDE8]"
                  >
                    <span>לא שובצו</span>
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                      {stats.remaining}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== Groups ===== */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {Object.entries(groupedGuests).map(([groupId, list]) => {
            const group: Group | null =
              groupId !== NO_GROUP_KEY
                ? groups.find((g) => String(g._id) === groupId) ?? null
                : null;

            const visibleGuests = list.filter(guestVisible);
            if (!visibleGuests.length) return null;

            const eligibleGuests = visibleGuests.filter(isEligibleInCurrentMode);
            const { total, seated, remaining } = getGroupStats(eligibleGuests);

            const isOpen = !!openGroups[groupId];

            return (
              <div
                key={groupId}
                className="
                  overflow-hidden rounded-3xl
                  border border-[#EAD8CC]
                  bg-white shadow-sm
                "
              >
                {/* ===== Group Header ===== */}
                <div
                  className="
                    cursor-pointer
                    bg-gradient-to-l from-[#FFF9ED] to-[#F7EDE6]
                    px-4 py-4
                  "
                  onClick={() =>
                    setOpenGroups((o) => ({
                      ...o,
                      [groupId]: !o[groupId],
                    }))
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-[#2F241D]">
                          {group ? group.name : "ללא קבוצה"}
                        </span>

                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#8B6F5A]">
                          {seated}/{total}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-full bg-green-50 px-2 py-1 font-semibold text-green-700">
                          הושבו {seated}
                        </span>

                        {remaining > 0 ? (
                          <span className="rounded-full bg-orange-50 px-2 py-1 font-semibold text-orange-700">
                            נשארו {remaining}
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#F0F7F4] px-2 py-1 font-semibold text-[#2F7D59]">
                            הושלם
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="pt-1 text-sm text-[#8B6F5A]">
                      {isOpen ? "▴" : "▾"}
                    </span>
                  </div>

                  {/* dropdown קבוצה */}
                  <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                    <select
                      className="
                        h-10 w-full
                        rounded-2xl border border-[#E6C3AD]
                        bg-white px-3 text-xs font-semibold
                        text-[#4B3528]
                        outline-none transition
                        focus:border-[#C79B7B]
                        focus:ring-2 focus:ring-[#E6C3AD]/35
                      "
                      value=""
                      onChange={async (e) => {
                        const tableId = e.target.value;
                        await handleGroupTableChange({
                          group,
                          groupId,
                          visibleGuests,
                          tableId,
                        });
                      }}
                    >
                      <option value="">
                        {group
                          ? remaining > 0
                            ? `הושב עוד מהקבוצה · נשארו ${remaining}`
                            : "כל הקבוצה שובצה"
                          : "בחר שולחן לאורחים ללא קבוצה"}
                      </option>

                      <option value="">ללא שולחן</option>

                      {tables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {tableLabel(t)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ===== Group Parts / Guests ===== */}
                {isOpen &&
                  buildGroupParts(visibleGuests).map((part) => {
                    const guestIds = part.guests.map((g) => seatGuestId(g));

                    const partSeats = part.guests.reduce(
                      (sum, g) => sum + getSeatCount(g),
                      0
                    );

                    return (
                      <div
                        key={
                          part.isSplitPart
                            ? `${groupId}-${part.type}-${
                                part.table?.id || "normal"
                              }`
                            : `${groupId}-normal`
                        }
                        className="border-t border-[#F1E4DC] bg-white"
                      >
                        {part.isSplitPart && (
                          <div className="border-b border-[#F1E4DC] bg-[#FFF9ED] px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-black text-[#2F241D]">
                                  {part.title}
                                </div>

                                <div className="mt-1 text-xs text-[#8B6F5A]">
                                  {part.table
                                    ? `${part.table.name} · ${part.guests.length} אורחים · ${partSeats} מקומות`
                                    : `${part.guests.length} אורחים · ${partSeats} מקומות`}
                                </div>
                              </div>

                              {part.type === "groupPart" && part.table && (
                                <select
                                  className="
                                    h-9 min-w-[155px]
                                    rounded-xl border border-[#E6C3AD]
                                    bg-white px-2 text-xs font-semibold
                                    text-[#4B3528]
                                    outline-none
                                    focus:ring-2 focus:ring-[#E6C3AD]/35
                                  "
                                  value={part.table.id}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={async (e) => {
                                    const tableId = e.target.value;

                                    if (!tableId) {
                                      for (const gid of guestIds) {
                                        await removeSingleGuestFromTable(gid);
                                      }

                                      return;
                                    }

                                    const result = moveGuestsToTable({
                                      guestIds,
                                      tableId,
                                    });

                                    if (!result?.ok) {
                                      console.error(
                                        result?.message ||
                                          "Failed moving guests"
                                      );
                                      return;
                                    }

                                    for (const gid of guestIds) {
                                      const ok = await syncAssignToServer(
                                        gid,
                                        tableId
                                      );
                                      if (!ok) {
                                        console.error(
                                          "Failed assigning guest on server",
                                          gid
                                        );
                                      }
                                    }
                                  }}
                                >
                                  <option value="">הסר מהשולחן</option>

                                  {tables.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {tableLabel(t)}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        )}

                        {part.guests.map((g) => {
                          const gid = seatGuestId(g);
                          const table = guestTableMap.get(gid);
                          const count = getSeatCount(g);

                          return (
                            <div
                              key={gid}
                              className="
                                border-b border-[#F7EEE8]
                                px-4 py-3
                                transition hover:bg-[#FFF9ED]
                              "
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-bold text-[#2F241D]">
                                    {g.name}
                                  </div>

                                  <div className="mt-1 truncate text-xs text-[#8B6F5A]">
                                    {table
                                      ? `${table.name} · ${count} ${
                                          isLiveMode ? "הגיעו" : "מוזמנים"
                                        }`
                                      : `לא משובץ · ${count} ${
                                          isLiveMode ? "הגיעו" : "מוזמנים"
                                        }`}
                                  </div>
                                </div>

                                <div className="shrink-0 flex items-center gap-2">
                                  {table && (
                                    <select
                                      className="
                                        h-9 max-w-[130px]
                                        rounded-xl border border-[#E6C3AD]
                                        bg-white px-2 text-xs font-semibold
                                        text-[#4B3528]
                                        outline-none
                                        focus:ring-2 focus:ring-[#E6C3AD]/35
                                      "
                                      value={table.id}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={async (e) => {
                                        const tableId = e.target.value;
                                        if (!tableId) return;

                                        await assignSingleGuestToTable(
                                          gid,
                                          tableId
                                        );
                                      }}
                                    >
                                      {tables.map((t) => (
                                        <option key={t.id} value={t.id}>
                                          {t.name}
                                        </option>
                                      ))}
                                    </select>
                                  )}

                                  <button
                                    className={`
                                      rounded-xl border px-3 py-1.5
                                      text-xs font-bold transition
                                      ${
                                        table
                                          ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                                          : "border-[#E6C3AD] bg-white text-[#5D4032] hover:bg-[#F6EDE8]"
                                      }
                                    `}
                                    onClick={async () => {
                                      setSelectingGuestId(null);

                                      if (table) {
                                        await removeSingleGuestFromTable(gid);
                                        return;
                                      }

                                      setSelectingGuestId(gid);
                                    }}
                                  >
                                    {table ? "הסר" : "הושב"}
                                  </button>
                                </div>
                              </div>

                              {selectingGuestId === gid && tables.length > 0 && (
                                <select
                                  className="
                                    mt-3 h-10 w-full rounded-2xl
                                    border border-[#E6C3AD]
                                    bg-white px-3 text-xs
                                    text-[#4B3528]
                                    outline-none
                                    focus:ring-2 focus:ring-[#E6C3AD]/35
                                  "
                                  defaultValue=""
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={async (e) => {
                                    const tableId = e.target.value;
                                    if (!tableId) return;

                                    await assignSingleGuestToTable(gid, tableId);

                                    setSelectingGuestId(null);
                                  }}
                                >
                                  <option value="">בחר שולחן…</option>

                                  {tables.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {tableLabel(t)}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}