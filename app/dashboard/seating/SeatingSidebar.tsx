"use client";

import { useEffect, useMemo, useState } from "react";
import { useSeatingStore } from "@/store/seatingStore";

/* ================= TYPES ================= */

type Guest = {
  id?: string;
  _id: string;
  name: string;
  phone?: string;
  groupId?: string | null;
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

type Filter = "all" | "seated" | "unseated";

export default function SeatingSidebar() {
  /* ===== STORE ===== */
  const guests = useSeatingStore((s) => s.guests) as Guest[];
  const groups = useSeatingStore((s) => s.groups) as Group[];
  const tables = useSeatingStore((s) => s.tables) as Table[];

  const seatGroup = useSeatingStore((s) => s.seatGroup);
  const unseatGroup = useSeatingStore((s) => s.unseatGroup);
  const assignGuestBlock = useSeatingStore((s) => s.assignGuestBlock);
  const openSeatGuestModal = useSeatingStore((s) => s.openSeatGuestModal);
  const removeFromSeat = useSeatingStore((s) => s.removeFromSeat);

  /* ===== UI STATE ===== */
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  /* ===== Helpers ===== */
  const seatGuestId = (g: Guest) => String(g.id ?? g._id);

  const guestTableMap = useMemo(() => {
    const map = new Map<string, Table>();
    tables.forEach((t) =>
      t.seatedGuests?.forEach((sg) =>
        map.set(String(sg.guestId), t)
      )
    );
    return map;
  }, [tables]);

  const groupedGuests = useMemo(() => {
    const map: Record<string, Guest[]> = {};
    guests.forEach((g) => {
      const key = normalizeGroupId(g.groupId);
      if (!map[key]) map[key] = [];
      map[key].push(g);
    });
    return map;
  }, [guests]);

  const getGroupTableId = (groupId: string) => {
    if (groupId === NO_GROUP_KEY) return "";

    const guest = guests.find((g) => {
      return (
        normalizeGroupId(g.groupId) === groupId &&
        guestTableMap.has(seatGuestId(g))
      );
    });

    if (!guest) return "";
    return guestTableMap.get(seatGuestId(guest))?.id ?? "";
  };

  const getNoGroupTableId = (list: Guest[]) => {
    const first = list.find((g) =>
      guestTableMap.has(seatGuestId(g))
    );
    return first
      ? guestTableMap.get(seatGuestId(first))?.id ?? ""
      : "";
  };

  const tableLabel = (t: Table) => {
    const count = t.seatedGuests?.length ?? 0;
    const main =
      t.displayName && t.displayName.trim()
        ? `${t.name} – ${t.displayName}`
        : t.name;
    return `${main} (${count}/${t.seats})`;
  };

  function guestVisible(g: Guest) {
    const q = search.trim().toLowerCase();
    const gid = seatGuestId(g);
    const isSeated = guestTableMap.has(gid);

    if (filter === "seated" && !isSeated) return false;
    if (filter === "unseated" && isSeated) return false;

    let groupName = "";
    if (normalizeGroupId(g.groupId) !== NO_GROUP_KEY) {
      groupName =
        groups.find(
          (gr) =>
            normalizeGroupId(gr._id) ===
            normalizeGroupId(g.groupId)
        )?.name || "";
    }

    if (!q) return true;

    return (
      g.name.toLowerCase().includes(q) ||
      String(g.phone || "").includes(q) ||
      groupName.toLowerCase().includes(q)
    );
  }

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
      <div className="p-4 border-b border-[#ead8cc]">
        <div className="font-semibold text-base mb-2">
          הקצאת מקומות
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש אורח / טלפון / קבוצה"
          className="w-full rounded-xl border border-[#e6c3ad] px-3 py-2 text-sm bg-white"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedGuests).map(([groupId, list]) => {
          const isNoGroup = groupId === NO_GROUP_KEY;
          const group = isNoGroup
            ? null
            : groups.find(
                (g) =>
                  normalizeGroupId(g._id) === groupId
              );

          const visibleGuests = list.filter(guestVisible);
          if (!visibleGuests.length) return null;

          const isOpen = openGroups[groupId];

          return (
            <div key={groupId} className="border-b border-[#ead8cc]">
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
                  {isNoGroup
                    ? `ללא קבוצה (${visibleGuests.length})`
                    : `${group!.name} · ${
                        tables.find(
                          (t) =>
                            t.id ===
                            getGroupTableId(group!._id)
                        )?.displayName ||
                        tables.find(
                          (t) =>
                            t.id ===
                            getGroupTableId(group!._id)
                        )?.name ||
                        "ללא שולחן"
                      }`}
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

                    if (!group) {
                      visibleGuests.forEach((g) => {
                        const gid = seatGuestId(g);
                        if (!tableId)
                          removeFromSeat(gid);
                        else
                          assignGuestBlock({
                            guestId: gid,
                            tableId,
                          });
                      });
                      return;
                    }

                    if (!tableId) unseatGroup(group._id);
                    else seatGroup(group._id, tableId);
                  }}
                >
                  <option value="">ללא שולחן</option>
                  {tables.map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      disabled={
                        group
                          ? !useSeatingStore
                              .getState()
                              .canSeatGroupAtTable(
                                t.id,
                                group._id
                              )
                          : false
                      }
                    >
                      {tableLabel(t)}
                    </option>
                  ))}
                </select>
              </div>

              {isOpen &&
                visibleGuests.map((g) => {
                  const gid = seatGuestId(g);
                  const table = guestTableMap.get(gid);
                  const plannedCount =
                    useSeatingStore
                      .getState()
                      .getPlannedSeatCount(g);

                  return (
                    <div
                      key={g._id}
                      className="px-5 py-2 flex justify-between items-center cursor-pointer hover:bg-[#f3e7e0]"
                      onClick={() =>
                        openSeatGuestModal({
                          guestId: gid,
                          plannedSeats: plannedCount,
                        })
                      }
                    >
                      <div>
                        <div className="text-sm">{g.name}</div>
                        <div className="text-xs text-gray-500">
                          {table
                            ? tableLabel(table)
                            : `לא משובץ · ${plannedCount} מקומות`}
                        </div>
                      </div>

                      <select
                        className="text-xs border border-[#e6c3ad] rounded-lg px-2 py-1 bg-white"
                        value={table?.id ?? ""}
                        onChange={(e) => {
                          const tableId = e.target.value;
                          if (!tableId)
                            removeFromSeat(gid);
                          else
                            assignGuestBlock({
                              guestId: gid,
                              tableId,
                            });
                        }}
                      >
                        <option value="">ללא שולחן</option>
                        {tables.map((t) => (
                          <option
                            key={t.id}
                            value={t.id}
                            disabled={
                              !useSeatingStore
                                .getState()
                                .canSeatGuestAtTable(
                                  t.id,
                                  g
                                )
                            }
                          >
                            {tableLabel(t)}
                          </option>
                        ))}
                      </select>
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
