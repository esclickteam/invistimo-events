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
  arrivedCount?: number;
};

type Group = {
  _id: string;
  name: string;
  tableId?: string | null;
};

type Table = {
  id: string;
  name: string;
  displayName?: string;
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

  /* ================= HELPERS ================= */

  const seatGuestId = (g: Guest) => String(g.id ?? g._id);

  // ⭐⭐⭐ מגיעים בפועל בלבד
  const getArrivedCount = (g: Guest) =>
    Number(g.arrivedCount ?? 0);

  const getGuestsArrivedCount = (list: Guest[]) =>
    list.reduce((sum, g) => sum + getArrivedCount(g), 0);

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
        getArrivedCount(g) > 0 &&
        normalizeGroupId(g.groupId) === String(groupId) &&
        guestTableMap.has(seatGuestId(g))
    );

    if (!guest) return "";
    return guestTableMap.get(seatGuestId(guest))?.id ?? "";
  };

  const getNoGroupTableId = (list: Guest[]) => {
    const first = list.find(
      (g) => getArrivedCount(g) > 0 && guestTableMap.has(seatGuestId(g))
    );

    if (!first) return "";
    return guestTableMap.get(seatGuestId(first))?.id ?? "";
  };

  /* ================= LABELS ================= */

  const tableLabel = (t: Table) => {
    const arrived = guests
      .filter(
        (g) =>
          getArrivedCount(g) > 0 &&
          guestTableMap.get(seatGuestId(g))?.id === t.id
      )
      .reduce((sum, g) => sum + getArrivedCount(g), 0);

    const main =
      t.displayName && t.displayName.trim()
        ? `${t.name} – ${t.displayName}`
        : t.name;

    return `${main} (${arrived}/${t.seats})`;
  };

  /* ================= FILTER ================= */

  function guestVisible(g: Guest) {
    if (getArrivedCount(g) === 0) return false;

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
    <aside className="h-full w-[340px] flex flex-col bg-[#fdf9f6] border-l border-[#ead8cc]">
      {/* ===== Header ===== */}
      <div className="p-4 border-b border-[#ead8cc]">
        <div className="font-semibold text-base mb-2">הקצאת מקומות</div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש אורח / טלפון / קבוצה"
          className="w-full rounded-xl border border-[#e6c3ad] px-3 py-2 text-sm bg-white"
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

          const arrivedCount = getGuestsArrivedCount(visibleGuests);

          return (
            <div key={groupId} className="border-b border-[#ead8cc]">
              {/* ===== Group Header ===== */}
              <div
                className="px-4 py-3 flex justify-between items-center bg-[#f6ede8]"
                onClick={() =>
                  setOpenGroups((o) => ({
                    ...o,
                    [groupId]: !o[groupId],
                  }))
                }
              >
                <div className="text-sm font-medium">
                  {group
                    ? `${group.name} (${arrivedCount})`
                    : `ללא קבוצה (${arrivedCount})`}
                </div>

                <select
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs border border-[#e6c3ad] rounded-lg px-2 py-1 bg-white"
                  value={
                    group
                      ? getGroupTableId(group._id)
                      : getNoGroupTableId(visibleGuests)
                  }
                  onChange={(e) => {
                    const tableId = e.target.value;

                    visibleGuests.forEach((g) => {
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
                  const table = guestTableMap.get(seatGuestId(g));
                  const arrived = getArrivedCount(g);

                  return (
                    <div
                      key={g._id}
                      className="px-5 py-2 flex justify-between items-center hover:bg-[#f3e7e0]"
                    >
                      <div>
                        <div className="text-sm">{g.name}</div>
                        <div className="text-xs text-gray-500">
                          {table
                            ? `${table.displayName || table.name} · ${arrived} מגיעים`
                            : `לא משובץ · ${arrived} מגיעים`}
                        </div>
                      </div>
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
