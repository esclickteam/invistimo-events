"use client";

import { useMemo, useState } from "react";
import { useSeatingStore } from "@/store/seatingStore";

/* ================= TYPES ================= */

type Guest = {
  id: string;
  name: string;
  groupId?: string | null;
};

type Group = {
  _id: string;
  name: string;
};

type Table = {
  id: string;
  name: string;
  seats: number;
  seatedGuests?: { guestId: string }[];
};

export default function SeatingSidebar() {
  /* ===== STORE ===== */
  const guests = useSeatingStore((s) => s.guests) as Guest[];
  const groups = useSeatingStore((s) => s.groups) as Group[];
  const tables = useSeatingStore((s) => s.tables) as Table[];

  const removeFromSeat = useSeatingStore((s) => s.removeFromSeat);
  const seatGuestsOnTable = useSeatingStore(
    (s) => s.seatGuestsOnTable
  );

  /* ===== UI STATE ===== */
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "seated" | "unseated">("all");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  /* ===== guest → table ===== */
  const guestTableMap = useMemo(() => {
    const map = new Map<string, Table>();
    tables.forEach((t) =>
      t.seatedGuests?.forEach((sg) => map.set(sg.guestId, t))
    );
    return map;
  }, [tables]);

  /* ===== group guests ===== */
  const groupedGuests = useMemo(() => {
    const map: Record<string, Guest[]> = {};
    guests.forEach((g) => {
      const key = g.groupId ?? "__no_group__";
      if (!map[key]) map[key] = [];
      map[key].push(g);
    });
    return map;
  }, [guests]);

  /* ===== filters ===== */
  function isGuestVisible(g: Guest) {
    const q = search.toLowerCase();
    const seated = guestTableMap.has(g.id);

    if (filter === "seated" && !seated) return false;
    if (filter === "unseated" && seated) return false;

    const groupName =
      groups.find((gr) => gr._id === g.groupId)?.name ?? "";

    return (
      g.name.toLowerCase().includes(q) ||
      groupName.toLowerCase().includes(q)
    );
  }

  /* ================= RENDER ================= */

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Search */}
      <div className="p-3 border-b">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש אורח או קבוצה"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-1 p-2 border-b">
        {[
          ["all", "הכל"],
          ["seated", "משובצים"],
          ["unseated", "לא משובצים"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id as any)}
            className={`flex-1 text-xs p-2 rounded ${
              filter === id ? "bg-gray-200 font-semibold" : "text-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedGuests).map(([groupId, list]) => {
          const visible = list.filter(isGuestVisible);
          if (!visible.length) return null;

          const group =
            groupId !== "__no_group__"
              ? groups.find((g) => g._id === groupId)
              : null;

          const isOpen = openGroups[groupId];

          return (
            <div key={groupId} className="border-b">
              {/* Group header */}
              <div
                className="p-3 bg-gray-50 flex justify-between items-center cursor-pointer"
                onClick={() =>
                  setOpenGroups((o) => ({ ...o, [groupId]: !o[groupId] }))
                }
              >
                <span className="font-medium text-sm">
                  {group ? group.name : "ללא קבוצה"} ({visible.length})
                </span>

                {group && (
                  <select
                    className="text-xs border rounded"
                    onChange={(e) => {
                      const tableId = e.target.value;
                      visible.forEach((g) => removeFromSeat(g.id));
                      if (tableId)
                        seatGuestsOnTable(tableId, visible);
                    }}
                  >
                    <option value="">בחר שולחן</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Guests */}
              {isOpen &&
                visible.map((g) => {
                  const table = guestTableMap.get(g.id);
                  return (
                    <div
                      key={g.id}
                      className="px-4 py-2 flex justify-between items-center hover:bg-gray-100"
                    >
                      <div>
                        <div className="text-sm">{g.name}</div>
                        <div className="text-xs text-gray-400">
                          {table ? table.name : "לא משובץ"}
                        </div>
                      </div>

                      <select
                        className="text-xs border rounded"
                        value={table?.id ?? ""}
                        onChange={(e) => {
                          const tableId = e.target.value;
                          removeFromSeat(g.id);
                          if (tableId)
                            seatGuestsOnTable(tableId, [g]);
                        }}
                      >
                        <option value="">ללא</option>
                        {tables.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
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
    </div>
  );
}
