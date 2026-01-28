"use client";

import { useMemo, useState } from "react";
import { useSeatingStore } from "@/store/seatingStore";

/* ===============================
   TYPES
=============================== */
type Guest = {
  id: string;
  name: string;
  groupId?: string | null;
};

type Group = {
  _id: string;
  name: string;
  tableId?: string | null;
};

type SeatedGuest = {
  guestId: string;
};

type Table = {
  id: string;
  name: string;
  seats: number;
  seatedGuests?: SeatedGuest[];
};

type FilterType = "all" | "seated" | "unseated";

/* ===============================
   COMPONENT
=============================== */
export default function SeatingSidebar() {
  const guests = useSeatingStore((s) => s.guests) as Guest[];
  const groups = useSeatingStore((s) => s.groups) as Group[];
  const tables = useSeatingStore((s) => s.tables) as Table[];

  const seatGuest = useSeatingStore((s) => s.seatGuest);
  const seatGroup = useSeatingStore((s) => s.seatGroup);
  const unseatGroup = useSeatingStore((s) => s.unseatGroup);
  const removeFromSeat = useSeatingStore((s) => s.removeFromSeat);
  const getGroupSize = useSeatingStore((s) => s.getGroupSize);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  /* ===============================
     אורח → שולחן
  =============================== */
  const guestTableMap = useMemo(() => {
    const map = new Map<string, Table>();
    tables.forEach((t) =>
      t.seatedGuests?.forEach((sg) =>
        map.set(String(sg.guestId), t)
      )
    );
    return map;
  }, [tables]);

  /* ===============================
     קיבוץ אורחים לפי קבוצה
  =============================== */
  const groupedGuests = useMemo(() => {
    const map: Record<string, Guest[]> = {};

    guests.forEach((g) => {
      const key = g.groupId || "__no_group__";
      if (!map[key]) map[key] = [];
      map[key].push(g);
    });

    return map;
  }, [guests]);

  /* ===============================
     סינון אורח
  =============================== */
  function isGuestVisible(g: Guest) {
    const q = search.toLowerCase();
    const isSeated = guestTableMap.has(String(g.id));

    if (filter === "seated" && !isSeated) return false;
    if (filter === "unseated" && isSeated) return false;

    const groupName =
      groups.find((gr) => gr._id === g.groupId)?.name || "";

    return (
      g.name.toLowerCase().includes(q) ||
      groupName.toLowerCase().includes(q)
    );
  }

  /* ===============================
     RENDER
  =============================== */
  return (
    <div className="h-full flex flex-col bg-white">
      {/* 🔍 חיפוש */}
      <div className="p-3 border-b">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש אורח או קבוצה"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      {/* 🎛 פילטרים */}
      <div className="flex gap-1 p-2 border-b">
        {[
          { id: "all", label: "הכל" },
          { id: "seated", label: "משובצים" },
          { id: "unseated", label: "לא משובצים" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as FilterType)}
            className={`flex-1 text-xs p-2 rounded ${
              filter === f.id
                ? "bg-gray-200 font-semibold"
                : "text-gray-500"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 📂 רשימה */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedGuests).map(([groupId, list]) => {
          const group =
            groupId !== "__no_group__"
              ? groups.find((g) => g._id === groupId)
              : null;

          const visibleGuests = list.filter(isGuestVisible);
          if (!visibleGuests.length) return null;

          const isOpen = openGroups[groupId];

          return (
            <div key={groupId} className="border-b">
              {/* כותרת קבוצה */}
              <div
                className="p-3 bg-gray-50 flex justify-between items-center cursor-pointer"
                onClick={() =>
                  setOpenGroups((o) => ({
                    ...o,
                    [groupId]: !o[groupId],
                  }))
                }
              >
                <span className="font-medium text-sm">
                  {group ? group.name : "ללא קבוצה"} (
                  {visibleGuests.length})
                </span>

                {/* הושבת קבוצה */}
                {group && (
                  <select
                    className="text-xs border rounded"
                    value={group.tableId || ""}
                    onChange={(e) => {
                      const tableId = e.target.value;
                      if (!tableId) unseatGroup(group._id);
                      else seatGroup(group._id, tableId);
                    }}
                  >
                    <option value="">ללא שולחן</option>
                    {tables.map((t) => {
                      const free =
                        t.seats -
                        (t.seatedGuests?.length || 0);

                      return (
                        <option
                          key={t.id}
                          value={t.id}
                          disabled={
                            free < getGroupSize(group._id)
                          }
                        >
                          {t.name} ({t.seatedGuests?.length || 0}/{t.seats})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* אורחים בודדים */}
              {isOpen &&
                visibleGuests.map((g) => {
                  const table = guestTableMap.get(String(g.id));
                  return (
                    <div
                      key={g.id}
                      className="px-4 py-2 flex justify-between items-center hover:bg-gray-100"
                    >
                      <div>
                        <div className="text-sm">{g.name}</div>
                        <div className="text-xs text-gray-400">
                          {table
                            ? `שולחן ${table.name}`
                            : "לא משובץ"}
                        </div>
                      </div>

                      <select
                        className="text-xs border rounded"
                        value={table?.id || ""}
                        onChange={(e) => {
                          const tableId = e.target.value;
                          if (!tableId)
                            removeFromSeat(String(g.id));
                          else seatGuest(String(g.id), tableId);
                        }}
                      >
                        <option value="">ללא</option>
                        {tables.map((t) => {
                          const free =
                            t.seats -
                            (t.seatedGuests?.length || 0);
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
    </div>
  );
}
