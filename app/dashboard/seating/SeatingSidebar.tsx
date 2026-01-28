"use client";

import { useMemo, useState } from "react";
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
    const isSeated = guestTableMap.has(String(g._id));

    if (filter === "seated" && !isSeated) return false;
    if (filter === "unseated" && isSeated) return false;

    const groupName =
      groups.find((gr) => gr._id === g.groupId)?.name || "";

    return (
      g.name?.toLowerCase().includes(q) ||
      g.phone?.includes(q) ||
      groupName.toLowerCase().includes(q)
    );
  }

  return (
    <aside className="h-full w-[340px] flex flex-col bg-[#fdf9f6] border-l border-[#ead8cc]">
      {/* ===== Header ===== */}
      <div className="p-4 border-b border-[#ead8cc]">
        <div className="font-semibold text-base mb-2">
          הקצאת מקומות
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש אורח / טלפון / קבוצה"
          className="w-full rounded-xl border border-[#e6c3ad] px-3 py-2 text-sm bg-white focus:outline-none"
        />

        <div className="flex gap-1 mt-3">
          {[
            { id: "all", label: "הכל" },
            { id: "seated", label: "משובצים" },
            { id: "unseated", label: "לא משובצים" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as Filter)}
              className={`flex-1 text-xs py-1 rounded-full transition ${
                filter === f.id
                  ? "bg-[#e6c3ad] text-black font-semibold"
                  : "bg-white text-gray-500 border border-[#ead8cc]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== List ===== */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedGuests).map(([groupId, list]) => {
          const group =
            groupId !== "__no_group__"
              ? groups.find((g) => g._id === groupId)
              : null;

          const visibleGuests = list.filter(guestVisible);
          if (!visibleGuests.length) return null;

          const isOpen = openGroups[groupId];

          return (
            <div key={groupId} className="border-b border-[#ead8cc]">
              {/* ===== Group Header ===== */}
              <div
                className="px-4 py-3 flex justify-between items-center cursor-pointer bg-[#f6ede8]"
                onClick={() =>
                  setOpenGroups((o) => ({
                    ...o,
                    [groupId]: !o[groupId],
                  }))
                }
              >
                <div className="text-sm font-medium">
                  {group ? group.name : "ללא קבוצה"} (
                  {visibleGuests.length})
                </div>

                {group && (
                  <select
                    className="text-xs border border-[#e6c3ad] rounded-lg px-2 py-1 bg-white"
                    value={group.tableId ?? ""}
                    onChange={(e) => {
                      const tableId = e.target.value;
                      if (!tableId) unseatGroup(group._id);
                      else seatGroup(group._id, tableId);
                    }}
                  >
                    <option value="">בחר שולחן</option>
                    {tables.map((t) => {
                      const free =
                        t.seats - (t.seatedGuests?.length ?? 0);
                      return (
                        <option
                          key={t.id}
                          value={t.id}
                          disabled={free < getGroupSize(group._id)}
                        >
                          {t.name} ({t.seatedGuests.length}/{t.seats})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* ===== Guests ===== */}
              {isOpen &&
                visibleGuests.map((g) => {
                  const table = guestTableMap.get(String(g._id));

                  return (
                    <div
                      key={g._id}
                      className="px-5 py-2 flex justify-between items-center hover:bg-[#f2e6de]"
                    >
                      <div>
                        <div className="text-sm">{g.name}</div>
                        <div className="text-xs text-gray-500">
                          {table ? `שולחן ${table.name}` : "לא משובץ"}
                        </div>
                      </div>

                      <select
                        className="text-xs border border-[#e6c3ad] rounded-lg px-2 py-1 bg-white"
                        value={table?.id ?? ""}
                        onChange={(e) => {
                          const tableId = e.target.value;
                          if (!tableId) {
                            removeFromSeat(String(g._id));
                          } else {
                            assignGuestBlock({
                              guestId: String(g._id),
                              tableId,
                            });
                          }
                        }}
                      >
                        <option value="">ללא</option>
                        {tables.map((t) => {
                          const free =
                            t.seats - (t.seatedGuests?.length ?? 0);
                          return (
                            <option
                              key={t.id}
                              value={t.id}
                              disabled={free < 1}
                            >
                              {t.name}
                            </option>
                          );
                        })}
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
