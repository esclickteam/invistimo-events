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
  seats: number;
  seatedGuests: { guestId: string }[];
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
  const removeFromSeat = useSeatingStore((s) => s.removeFromSeat);
  const getGroupSize = useSeatingStore((s) => s.getGroupSize);

  /* ===== UI STATE ===== */
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  /* ===== Helper ===== */
  function seatGuestId(g: Guest) {
    return String(g.id ?? g._id);
  }

  /* ===== GROUP ↔ TABLE helpers ===== */

  function getGroupForTable(tableId: string) {
    return groups.find(
      (g) => g.tableId && String(g.tableId) === String(tableId)
    );
  }

  function tableLabel(t: Table) {
    const group = getGroupForTable(t.id);
    if (!group) return ""; // לא אמור להופיע בדרופדאון
    return `${t.name} – ${group.name} (${t.seatedGuests.length}/${t.seats})`;
  }

  /* ===== MAP אורח → שולחן ===== */
  const guestTableMap = useMemo(() => {
    const map = new Map<string, Table>();
    tables.forEach((t) =>
      (t.seatedGuests || []).forEach((sg) => {
        map.set(String(sg.guestId), t);
      })
    );
    return map;
  }, [tables]);

  /* ===== GROUP אורחים ===== */
  const groupedGuests = useMemo(() => {
    const map: Record<string, Guest[]> = {};
    guests.forEach((g) => {
      const key = g.groupId ?? "__no_group__";
      if (!map[key]) map[key] = [];
      map[key].push(g);
    });
    return map;
  }, [guests]);

  /* ===== FILTER + SEARCH ===== */
  function guestVisible(g: Guest) {
    const q = search.trim().toLowerCase();
    const gid = seatGuestId(g);
    const isSeated = guestTableMap.has(gid);

    if (filter === "seated" && !isSeated) return false;
    if (filter === "unseated" && isSeated) return false;

    const groupName =
      groups.find((gr) => String(gr._id) === String(g.groupId))?.name || "";

    if (!q) return true;

    return (
      g.name.toLowerCase().includes(q) ||
      String(g.phone || "").includes(q) ||
      groupName.toLowerCase().includes(q)
    );
  }

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) return;

    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const [groupId, list] of Object.entries(groupedGuests)) {
        if (list.some(guestVisible)) next[groupId] = true;
      }
      return next;
    });
  }, [search, groupedGuests]);

  /* ================= RENDER ================= */

  return (
    <aside className="h-full w-[340px] flex flex-col bg-[#fdf9f6] border-l border-[#ead8cc]">
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedGuests).map(([groupId, list]) => {
          const group =
            groupId !== "__no_group__"
              ? groups.find((g) => String(g._id) === String(groupId))
              : null;

          if (!group) return null;

          const visibleGuests = list.filter(guestVisible);
          if (!visibleGuests.length) return null;

          return (
            <div key={groupId} className="border-b border-[#ead8cc]">
              <div className="px-4 py-3 flex justify-between items-center bg-[#f6ede8]">
                <div className="text-sm font-medium">
                  {group.name} ({getGroupSize(group._id)} אנשים)
                </div>

                <select
                  className="text-xs border border-[#e6c3ad] rounded-lg px-2 py-1 bg-white"
                  value={group.tableId ?? ""}
                  onChange={(e) => {
                    const tableId = e.target.value;
                    if (!tableId) unseatGroup(group._id);
                    else seatGroup(group._id, tableId);
                  }}
                >
                  {tables
                    .filter((t) => getGroupForTable(t.id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {tableLabel(t)}
                      </option>
                    ))}
                </select>
              </div>

              {visibleGuests.map((g) => {
                const table = guestTableMap.get(seatGuestId(g));

                return (
                  <div
                    key={g._id}
                    className="px-5 py-2 flex justify-between items-center"
                  >
                    <div>
                      <div className="text-sm">{g.name}</div>
                      <div className="text-xs text-gray-500">
                        {table ? tableLabel(table) : "לא משובץ"}
                      </div>
                    </div>

                    <select
                      className="text-xs border border-[#e6c3ad] rounded-lg px-2 py-1 bg-white"
                      value={table?.id ?? ""}
                      onChange={(e) =>
                        assignGuestBlock({
                          guestId: seatGuestId(g),
                          tableId: e.target.value,
                        })
                      }
                    >
                      {tables
                        .filter((t) => getGroupForTable(t.id))
                        .map((t) => (
                          <option key={t.id} value={t.id}>
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
