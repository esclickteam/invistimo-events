"use client";

import { useEffect, useMemo, useState } from "react";
import { useSeatingStore } from "@/store/seatingStore";
import { useSeatingStats } from "../../hooks/useSeatingStats";
import { useGroupStore } from "@/store/groupStore";

/* ================= CONSTANTS ================= */

const NO_GROUP_KEY = "__no_group__";
const ACTION_NONE = "__none__";
const ACTION_REMOVE = "__remove__";

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

  guestsCount?: number;
  arrivedCount?: number;
  actualArrivedCount?: number;
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

type GroupTableBlock = {
  table: Table;
  guests: Guest[];
  seatsUsed: number;
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

  const [moveSourceByGroup, setMoveSourceByGroup] = useState<
    Record<string, string>
  >({});

  const [groupInnerFilter, setGroupInnerFilter] = useState<
    Record<string, Filter>
  >({});

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

  const guestId = String(g.id ?? g._id);

  const fromLiveStore = Number(store.liveArrivals?.[guestId] ?? 0);

  if (fromLiveStore > 0) {
    return fromLiveStore;
  }

  return (
    Number(g.actualArrivedCount || 0) ||
    Number(g.arrivedCount || 0) ||
    0
  );
};

  const isEligibleInCurrentMode = (g: Guest) => {
    if (!isLiveMode) return g.rsvp === "yes";
    return getSeatCount(g) > 0;
  };

  const getMaxTableSeats = () =>
    Math.max(0, ...tables.map((table) => Number(table.seats || 0)));

  const getTotalSeatsForGuests = (list: Guest[]) =>
    list.reduce((sum, guest) => sum + getSeatCount(guest), 0);

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

  const getSeatRecordForGuest = (guestId: string) => {
    for (const table of tables) {
      const seat = (table.seatedGuests || []).find(
        (sg) => String(sg.guestId) === String(guestId)
      );

      if (seat) return { table, seat };
    }

    return null;
  };

  const isGuestSeatedByGroupAction = (guest: Guest) => {
    const gid = seatGuestId(guest);
    const guestGroupId = normalizeGroupId(guest.groupId);

    if (guestGroupId === NO_GROUP_KEY) return false;

    const record = getSeatRecordForGuest(gid);

    return (
      !!record?.seat?.groupId &&
      String(record.seat.groupId) === String(guestGroupId)
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

  const simpleTableLabel = (t: Table) => {
    const count = guests
      .filter(
        (g) =>
          isEligibleInCurrentMode(g) &&
          guestTableMap.get(seatGuestId(g))?.id === t.id
      )
      .reduce((sum, g) => sum + getSeatCount(g), 0);

    return `${t.name} (${count}/${t.seats})`;
  };

  /* ================= FILTER ================= */

  function guestVisible(g: Guest) {
    if (!isEligibleInCurrentMode(g)) return false;

    const q = search.trim().toLowerCase();
    const seated = isGuestSeated(g);

    if (filter === "seated" && !seated) return false;
    if (filter === "unseated" && seated) return false;

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

  const filterGuestsInsideGroup = (groupId: string, list: Guest[]) => {
    const mode = groupInnerFilter[groupId] || "all";

    if (mode === "seated") {
      return list.filter((g) => isGuestSeated(g));
    }

    if (mode === "unseated") {
      return list.filter((g) => !isGuestSeated(g));
    }

    return list;
  };

  /* ================= GROUP TABLE BLOCKS ================= */

  const buildGroupTableBlocks = (list: Guest[]) => {
    const eligibleGuests = list.filter(isEligibleInCurrentMode);

    const blocksMap = new Map<string, GroupTableBlock>();

    eligibleGuests.forEach((guest) => {
      const gid = seatGuestId(guest);
      const table = guestTableMap.get(gid);

      if (!table || !isGuestSeatedByGroupAction(guest)) return;

      const key = String(table.id);

      if (!blocksMap.has(key)) {
        blocksMap.set(key, {
          table,
          guests: [],
          seatsUsed: 0,
        });
      }

      const block = blocksMap.get(key)!;
      block.guests.push(guest);
      block.seatsUsed += getSeatCount(guest);
    });

    return Array.from(blocksMap.values());
  };

  const getSingleGroupTableId = (eligibleGuests: Guest[]) => {
    const seatedGuests = eligibleGuests.filter((g) => isGuestSeated(g));
    if (!seatedGuests.length) return ACTION_NONE;

    const tableIds = Array.from(
      new Set(
        seatedGuests
          .map((g) => guestTableMap.get(seatGuestId(g))?.id)
          .filter(Boolean)
          .map(String)
      )
    );

    if (tableIds.length === 1) return tableIds[0];

    return ACTION_NONE;
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

  /* ================= GROUP ACTIONS ================= */

  const handleSeatGroupMore = async ({
    group,
    groupId,
    actionGuests,
    tableId,
  }: {
    group: Group | null;
    groupId: string;
    actionGuests: Guest[];
    tableId: string;
  }) => {
    const eligibleGuests = actionGuests.filter(isEligibleInCurrentMode);

    if (tableId === ACTION_REMOVE) {
      for (const g of eligibleGuests) {
        await removeSingleGuestFromTable(seatGuestId(g));
      }

      return;
    }

    if (!tableId || tableId === ACTION_NONE) return;

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
      await assignSingleGuestToTable(seatGuestId(g), tableId);
    }
  };

  const handleMoveGuests = async ({
    guestIds,
    tableId,
  }: {
    guestIds: string[];
    tableId: string;
  }) => {
    if (tableId === ACTION_REMOVE) {
      for (const gid of guestIds) {
        await removeSingleGuestFromTable(gid);
      }
      return;
    }

    if (!tableId || tableId === ACTION_NONE) return;

    const result = moveGuestsToTable({
      guestIds,
      tableId,
    });

    if (!result?.ok) {
      console.error(result?.message || "Failed moving guests");
      return;
    }

    for (const gid of guestIds) {
      const ok = await syncAssignToServer(gid, tableId);
      if (!ok) {
        console.error("Failed assigning guest on server", gid, tableId);
      }
    }
  };

  const handleSmallGroupDropdown = async ({
    group,
    groupId,
    actionGuests,
    tableId,
  }: {
    group: Group | null;
    groupId: string;
    actionGuests: Guest[];
    tableId: string;
  }) => {
    const eligibleGuests = actionGuests.filter(isEligibleInCurrentMode);
    const seatedGuestIds = eligibleGuests
      .filter((g) => isGuestSeated(g))
      .map((g) => seatGuestId(g));

    if (tableId === ACTION_REMOVE) {
      for (const g of eligibleGuests) {
        await removeSingleGuestFromTable(seatGuestId(g));
      }
      return;
    }

    if (!tableId || tableId === ACTION_NONE) return;

    if (seatedGuestIds.length > 0) {
      await handleMoveGuests({
        guestIds: seatedGuestIds,
        tableId,
      });
    }

    if (group && groupId !== NO_GROUP_KEY) {
      const hasUnseated = eligibleGuests.some((g) => !isGuestSeated(g));

      if (hasUnseated) {
        await handleSeatGroupMore({
          group,
          groupId,
          actionGuests,
          tableId,
        });
      }

      return;
    }

    for (const g of eligibleGuests) {
      if (!isGuestSeated(g)) {
        await assignSingleGuestToTable(seatGuestId(g), tableId);
      }
    }
  };

  /* ================= RENDER HELPERS ================= */

  const compactSegmentClass = (
  active: boolean,
  type: "all" | "seated" | "unseated"
) => {
  if (active && type === "seated") {
    return "bg-[#DDF7E7] text-[#137A3D]";
  }

  if (active && type === "unseated") {
    return "bg-[#FFE4D2] text-[#B64517]";
  }

  if (active) {
    return "bg-[#D6B18A] text-white";
  }

  return "bg-transparent text-[#7A5A43] hover:bg-white";
};

  const renderGuestRow = (g: Guest) => {
    const gid = seatGuestId(g);
    const table = guestTableMap.get(gid);
    const count = getSeatCount(g);

    return (
      <div
        key={gid}
        className="
          border-b border-[#F4EAE2]
          bg-white
          px-3 py-2
          transition hover:bg-[#FFF9F3]
        "
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold text-[#2F241D]">
              {g.name}
            </div>

            <div className="mt-0.5 truncate text-[11px] text-[#8B6F5A]">
              {table
                ? `${table.name} · ${count} ${
                    isLiveMode ? "הגיעו" : "מוזמנים"
                  }`
                : `לא משובץ · ${count} ${
                    isLiveMode ? "הגיעו" : "מוזמנים"
                  }`}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {table && (
              <select
                className="
                  h-8 max-w-[108px]
                  rounded-xl border border-[#E6C3AD]
                  bg-white px-2 text-[11px] font-semibold
                  text-[#4B3528]
                  outline-none
                "
                value={table.id}
                onClick={(e) => e.stopPropagation()}
                onChange={async (e) => {
                  const nextTableId = e.target.value;
                  if (!nextTableId) return;
                  await assignSingleGuestToTable(gid, nextTableId);
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
                text-[11px] font-bold transition
                ${
                  table
  ? "border-[#98D8AF] bg-[#E4FBEA] text-[#137A3D] hover:bg-[#D6F5DF]"
  : "border-[#D6A678] bg-[#FFF8EF] text-[#8A4B1F] hover:bg-[#F7E6D5]"
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
              mt-2 h-9 w-full rounded-xl
              border border-[#E6C3AD]
              bg-white px-3 text-[11px]
              text-[#4B3528]
              outline-none
            "
            defaultValue={ACTION_NONE}
            onClick={(e) => e.stopPropagation()}
            onChange={async (e) => {
              const tableId = e.target.value;
              if (!tableId || tableId === ACTION_NONE) return;

              await assignSingleGuestToTable(gid, tableId);
              setSelectingGuestId(null);
            }}
          >
            <option value={ACTION_NONE}>בחר שולחן…</option>

            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {tableLabel(t)}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  };

  /* ================= RENDER ================= */

  return (
    <>
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

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 right-0 z-50
          h-full w-[410px] max-w-[92vw]
          flex flex-col
          border-l border-[#EAD8CC]
          bg-[#F7F2EC]
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
        <div className="border-b border-[#EAD8CC] bg-white/85 p-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-black text-[#2F241D]">
                הקצאת מקומות
              </h2>
              <p className="mt-1 text-[11px] text-[#8B6F5A]">
                תכנון שולחנות, אורחים וסידור הושבה חכם
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

          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-[#EAD8CC] bg-[#FFF9ED] p-2.5 text-center">
              <div className="text-[10px] text-[#8B6F5A]">סה״כ</div>
              <div className="text-[18px] font-black text-[#2F241D]">
                {stats.total}
              </div>
            </div>

            <div className="rounded-2xl border border-green-200 bg-green-50 p-2.5 text-center">
              <div className="text-[10px] text-green-700">הושבו</div>
              <div className="text-[18px] font-black text-green-800">
                {stats.seated}
              </div>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-2.5 text-center">
              <div className="text-[10px] text-orange-700">נשארו</div>
              <div className="text-[18px] font-black text-orange-800">
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
                h-10 flex-1 rounded-2xl
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
                  h-10 min-w-[88px]
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
                <div className="absolute left-0 z-20 mt-2 w-[210px] overflow-hidden rounded-2xl border border-[#EAD8CC] bg-white shadow-xl">
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

        <div className="flex-1 overflow-y-auto border-t border-[#E2CDBB] bg-[#F8F1EA]">
          {Object.entries(groupedGuests).map(([groupId, list]) => {
            const group: Group | null =
              groupId !== NO_GROUP_KEY
                ? groups.find((g) => String(g._id) === groupId) ?? null
                : null;

            const visibleGuests = list.filter(guestVisible);
            if (!visibleGuests.length) return null;

            const actionGuests = list.filter(isEligibleInCurrentMode);
            const displayGuests = filterGuestsInsideGroup(groupId, visibleGuests);

            const { total, seated, remaining } = getGroupStats(actionGuests);

            const maxTableSeats = getMaxTableSeats();
            const totalGroupSeats = getTotalSeatsForGuests(actionGuests);
            const isLargeGroup =
              !!group && maxTableSeats > 0 && totalGroupSeats > maxTableSeats;

            const tableBlocks = buildGroupTableBlocks(actionGuests);

            const derivedSourceTableId =
              moveSourceByGroup[groupId] ||
              (tableBlocks.length === 1 ? tableBlocks[0].table.id : "");

            const selectedBlock = tableBlocks.find(
              (block) => String(block.table.id) === String(derivedSourceTableId)
            );

            const smallGroupTableId = getSingleGroupTableId(actionGuests);
            const isOpen = !!openGroups[groupId];

            return (
              <div
  key={groupId}
  className="
    border-b border-[#E2CDBB]
    bg-gradient-to-l from-[#FFF8F1] to-[#F4E7DA]
  "
>
                <div
                  className="cursor-pointer px-3 py-2.5 transition hover:bg-[#FFF9F3]"
                  onClick={() =>
                    setOpenGroups((o) => ({
                      ...o,
                      [groupId]: !o[groupId],
                    }))
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="text-[12px] text-[#8B6F5A]">
                        {isOpen ? "▴" : "▾"}
                      </span>

                      <span className="truncate text-[14px] font-black text-[#2F241D]">
                        {group ? group.name : "ללא קבוצה"}
                      </span>

                      <span className="shrink-0 rounded-full bg-[#F7EFE8] px-2 py-0.5 text-[10px] font-bold text-[#8B6F5A]">
                        {seated}/{total}
                      </span>
                    </div>

                    <div
                      className="
                        flex shrink-0 overflow-hidden rounded-full
                        border border-[#EAD8CC] bg-[#FBF7F3]
                      "
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setGroupInnerFilter((prev) => ({
                            ...prev,
                            [groupId]: "all",
                          }))
                        }
                        className={`
                          px-2.5 py-1 text-[10px] font-bold transition
                          ${compactSegmentClass(
                            (groupInnerFilter[groupId] || "all") === "all",
                            "all"
                          )}
                        `}
                      >
                        הכל {total}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setGroupInnerFilter((prev) => ({
                            ...prev,
                            [groupId]: "seated",
                          }))
                        }
                        className={`
                          border-r border-[#EAD8CC] px-2.5 py-1
                          text-[10px] font-bold transition
                          ${compactSegmentClass(
                            groupInnerFilter[groupId] === "seated",
                            "seated"
                          )}
                        `}
                      >
                        הושבו {seated}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setGroupInnerFilter((prev) => ({
                            ...prev,
                            [groupId]: "unseated",
                          }))
                        }
                        className={`
                          border-r border-[#EAD8CC] px-2.5 py-1
                          text-[10px] font-bold transition
                          ${compactSegmentClass(
                            groupInnerFilter[groupId] === "unseated",
                            "unseated"
                          )}
                        `}
                      >
                        לא שובצו {remaining}
                      </button>
                    </div>
                  </div>

                  <div
                    className="
                      mt-2 grid gap-2
                      rounded-2xl border border-[#DFC3AA]
bg-[#FFFDF9] p-2
shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]
                    "
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!isLargeGroup ? (
                      <select
                        className="
                          h-8 w-full
                          rounded-xl border border-[#E6C3AD]
                          bg-white px-3 text-[11px] font-semibold
                          text-[#4B3528]
                          outline-none
                        "
                        value={smallGroupTableId}
                        onChange={async (e) => {
                          const tableId = e.target.value;

                          await handleSmallGroupDropdown({
                            group,
                            groupId,
                            actionGuests,
                            tableId,
                          });
                        }}
                      >
                        <option value={ACTION_NONE}>
                          {seated > 0
                            ? "בחר שולחן / פעולה"
                            : group
                            ? "הושב קבוצה"
                            : "בחר שולחן"}
                        </option>

                        <option value={ACTION_REMOVE}>הסר קבוצה</option>

                        {tables.map((t) => (
                          <option key={t.id} value={t.id}>
                            {simpleTableLabel(t)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <>
                        <select
                          className="
                            h-8 w-full
                            rounded-xl border border-[#E6C3AD]
                            bg-white px-3 text-[11px] font-semibold
                            text-[#4B3528]
                            outline-none
                          "
                          defaultValue={ACTION_NONE}
                          onChange={async (e) => {
                            const tableId = e.target.value;

                            await handleSeatGroupMore({
                              group,
                              groupId,
                              actionGuests,
                              tableId,
                            });

                            e.currentTarget.value = ACTION_NONE;
                          }}
                        >
                          <option value={ACTION_NONE}>
                            {remaining > 0
                              ? `הושב קבוצה · נשארו ${remaining}`
                              : "כל הקבוצה שובצה"}
                          </option>

                          <option value={ACTION_REMOVE}>הסר קבוצה</option>

                          {tables.map((t) => (
                            <option key={t.id} value={t.id}>
                              {tableLabel(t)}
                            </option>
                          ))}
                        </select>

                        {tableBlocks.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              className="
                                h-8 rounded-xl border border-[#E6C3AD]
                                bg-white px-3 text-[11px] font-semibold
                                text-[#4B3528]
                                outline-none
                              "
                              value={derivedSourceTableId}
                              onChange={(e) => {
                                setMoveSourceByGroup((prev) => ({
                                  ...prev,
                                  [groupId]: e.target.value,
                                }));
                              }}
                            >
                              <option value="">מאיזה שולחן</option>

                              {tableBlocks.map((block) => (
                                <option
                                  key={block.table.id}
                                  value={block.table.id}
                                >
                                  {block.table.name} · {block.seatsUsed}
                                </option>
                              ))}
                            </select>

                            <select
                              key={`${groupId}-${derivedSourceTableId}`}
                              className="
                                h-8 rounded-xl border border-[#E6C3AD]
                                bg-white px-3 text-[11px] font-semibold
                                text-[#4B3528]
                                outline-none
                                disabled:cursor-not-allowed disabled:opacity-50
                              "
                              defaultValue={ACTION_NONE}
                              disabled={!selectedBlock}
                              onChange={async (e) => {
                                const nextTableId = e.target.value;
                                if (!selectedBlock) return;

                                await handleMoveGuests({
                                  guestIds: selectedBlock.guests.map((g) =>
                                    seatGuestId(g)
                                  ),
                                  tableId: nextTableId,
                                });

                                setMoveSourceByGroup((prev) => ({
                                  ...prev,
                                  [groupId]: "",
                                }));

                                e.currentTarget.value = ACTION_NONE;
                              }}
                            >
                              <option value={ACTION_NONE}>לאיזה שולחן</option>
                              <option value={ACTION_REMOVE}>הסר מהשולחן</option>

                              {tables.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {simpleTableLabel(t)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-[#F4EAE2]">
                    {displayGuests.length > 0 ? (
                      displayGuests.map(renderGuestRow)
                    ) : (
                      <div className="px-3 py-4 text-center text-[11px] text-[#9A7E6A]">
                        אין אורחים להצגה בסינון שנבחר
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}