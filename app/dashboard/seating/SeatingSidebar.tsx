"use client";

import { useEffect, useMemo, useState } from "react";
import { useSeatingStore } from "@/store/seatingStore";

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
};

type Group = {
  _id: string;
  name: string;
  tableId?: string | null;
};

type Table = {
  id: string;
  name: string;
  seats: number;
  seatedGuests: { guestId: string }[];
};

type Filter = "all" | "seated" | "unseated";

/* ================= COMPONENT ================= */

export default function SeatingSidebar() {
  /* ===== STORE ===== */
  const guests = useSeatingStore((s) => s.guests) as Guest[];
  const groups = useSeatingStore((s) => s.groups) as Group[];
  const tables = useSeatingStore((s) => s.tables) as Table[];

  const assignGuestBlock = useSeatingStore((s) => s.assignGuestBlock);
  const removeFromSeat = useSeatingStore((s) => s.removeFromSeat);

  /* ===== UI STATE ===== */
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const [selectingGuestId, setSelectingGuestId] = useState<string | null>(null);


  /* ================= HELPERS ================= */

  const seatGuestId = (g: Guest) => String(g.id ?? g._id);

  const getPlannedSeatCount = (g: Guest) =>
    useSeatingStore.getState().getPlannedSeatCount(g);

  const getGuestsPlannedCount = (list: Guest[]) =>
    list.reduce((sum, g) => sum + getPlannedSeatCount(g), 0);

  /* ================= TABLE MAP ================= */

  const guestTableMap = useMemo(() => {
    const map = new Map<string, Table>();
    tables.forEach((t) =>
      t.seatedGuests?.forEach((sg) =>
        map.set(String(sg.guestId), t)
      )
    );
    return map;
  }, [tables]);

  /* ================= GROUPED GUESTS ================= */

  const groupedGuests = useMemo(() => {
    const map: Record<string, Guest[]> = {};

    guests.forEach((g) => {
      const rawGroupId = g.groupId ? String(g.groupId) : null;

      const groupExists =
        rawGroupId &&
        groups.some((gr) => String(gr._id) === rawGroupId);

      const key = groupExists ? rawGroupId : NO_GROUP_KEY;

      if (!map[key]) map[key] = [];
      map[key].push(g);
    });

    return map;
  }, [guests, groups]);

  /* ================= TABLE LOOKUPS ================= */

  const getGroupTableId = (groupId: string) => {
    const guest = guests.find(
      (g) =>
        g.rsvp === "yes" &&
        normalizeGroupId(g.groupId) === String(groupId) &&
        guestTableMap.has(seatGuestId(g))
    );

    if (!guest) return "";
    return guestTableMap.get(seatGuestId(guest))?.id ?? "";
  };

  const getNoGroupTableId = (list: Guest[]) => {
    const first = list.find(
      (g) => g.rsvp === "yes" && guestTableMap.has(seatGuestId(g))
    );

    if (!first) return "";
    return guestTableMap.get(seatGuestId(first))?.id ?? "";
  };

  /* ================= LABELS ================= */

  const getTableGroupLabel = (tableId: string) => {
    const seatedGuests = guests.filter(
      (g) =>
        g.rsvp === "yes" &&
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
      const group = groups.find(
        (gr) => String(gr._id) === String(groupIds[0])
      );
      return group?.name || "";
    }

    if (groupIds.length > 1) return "";

    return "";
  };

  const tableLabel = (t: Table) => {
  const count = guests
    .filter(
      (g) =>
        g.rsvp === "yes" &&
        guestTableMap.get(seatGuestId(g))?.id === t.id
    )
    .reduce((sum, g) => sum + getPlannedSeatCount(g), 0);

  const groupLabel = getTableGroupLabel(t.id);

  return groupLabel
    ? `${groupLabel} · ${t.name} (${count}/${t.seats})`
    : `${t.name} (${count}/${t.seats})`;
};


  /* ================= FILTER ================= */

  function guestVisible(g: Guest) {
    if (g.rsvp !== "yes") return false;

    const q = search.trim().toLowerCase();
    const gid = seatGuestId(g);
    const isSeated = guestTableMap.has(gid);

    if (filter === "seated" && !isSeated) return false;
    if (filter === "unseated" && isSeated) return false;

    const groupName =
      normalizeGroupId(g.groupId) !== NO_GROUP_KEY
        ? groups.find(
            (gr) => String(gr._id) === String(g.groupId)
          )?.name || ""
        : "";

    if (!q) return true;

    return (
      g.name.toLowerCase().includes(q) ||
      String(g.phone || "").includes(q) ||
      groupName.toLowerCase().includes(q)
    );
  }

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

  /* ================= RENDER ================= */

  return (
    <aside className="h-full w-[400px] flex flex-col bg-[#fdf9f6] border-l border-[#ead8cc]">

      {/* ===== Header ===== */}
      <div className="p-5 border-b border-[#ead8cc]">
  <div className="font-semibold text-[15px] mb-3">הקצאת מקומות</div>

  <input
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder="חיפוש אורח / טלפון / קבוצה"
    className="w-full rounded-xl border border-[#e6c3ad] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#e6c3ad]"
  />
</div>

      {/* ===== Groups ===== */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedGuests).map(([groupId, list]) => {
          const group =
            groupId !== NO_GROUP_KEY
              ? groups.find((g) => String(g._id) === groupId)
              : null;

          const visibleGuests = list.filter(guestVisible);
          if (!visibleGuests.length) return null;

          const plannedCount = getGuestsPlannedCount(visibleGuests);

          return (
            <div key={groupId} className="border-b border-[#ead8cc]">
              {/* ===== Group Header ===== */}
              <div
  className="px-5 py-3 flex justify-between items-center gap-3 bg-[#f6ede8] cursor-pointer"

  onClick={() =>
    setOpenGroups((o) => ({ ...o, [groupId]: !o[groupId] }))
  }
>
  {/* 🏷️ שם קבוצה */}
  <div className="flex flex-col">
    <span className="text-sm font-medium">
      {group ? group.name : "ללא קבוצה"}
    </span>
    <span className="text-xs text-gray-500">
      {plannedCount} מוזמנים
    </span>
  </div>

  {/* 🔽 dropdown קבוצה */}
  <select
    onClick={(e) => e.stopPropagation()}
    className="
  text-xs
  h-[32px]
  leading-[32px]
  border border-[#e6c3ad]
  rounded-lg
  px-2
  bg-white
  min-w-[150px]
"

    value={
      group
        ? getGroupTableId(group._id)
        : getNoGroupTableId(visibleGuests)
    }
    onChange={(e) => {
      const tableId = e.target.value;
      visibleGuests
        .filter((g) => g.rsvp === "yes")
        .forEach((g) => {
          const gid = seatGuestId(g);
          if (!tableId) removeFromSeat(gid);
          else assignGuestBlock({ guestId: gid, tableId });
        });
    }}
  >
    <option value="">ללא שולחן</option>
    {tables.map((t) => (
      <option key={t.id} value={t.id}>
        {tableLabel(t)}
      </option>
    ))}
  </select>
</div>

              {/* ===== Guests ===== */}
              {openGroups[groupId] &&
  visibleGuests.map((g) => {
    const gid = seatGuestId(g);
    const table = guestTableMap.get(gid);
    const planned = getPlannedSeatCount(g);

    return (
      <div
        key={g._id}
        className="px-5 py-2 flex justify-between items-center gap-2 hover:bg-[#f3e7e0]"
      >
        {/* 🧑 פרטי אורח */}
        <div className="min-w-0">
  <div className="text-sm font-medium truncate">{g.name}</div>
  <div className="text-xs text-gray-500 truncate">
            {table
  ? `${table.name} · ${planned} מוזמנים`
  : `לא משובץ · ${planned} מוזמנים`}

          </div>
        </div>

        {/* 🔽 דרופדאון אורח */}
        {/* ✅ כפתור פעולה לאורח */}
<button
  className={`text-xs px-3 py-1 rounded-lg border transition
    ${
      table
        ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
        : "bg-white border-[#e6c3ad] hover:bg-[#f6ede8]"
    }`}
  onClick={() => {
  // סוגר בחירה קודמת (אם הייתה)
  setSelectingGuestId(null);

  // אם כבר יושב – הסרה
  if (table) {
    removeFromSeat(gid);
    return;
  }

  // תמיד פתיחת בחירה ידנית לאורח
  setSelectingGuestId(gid);
}}

>
  {table ? "הסר הושבה" : "הושב"}
</button>

{selectingGuestId === gid && tables.length > 0 && (

  <select
    className="
      mt-2 text-xs h-[32px] leading-[32px]
      border border-[#e6c3ad]
      rounded-lg px-2 bg-white
    "
    defaultValue=""
    onChange={(e) => {
      const tableId = e.target.value;
      if (!tableId) return;

      assignGuestBlock({ guestId: gid, tableId });
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
    </aside>
  );
}
