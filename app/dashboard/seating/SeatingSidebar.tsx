"use client";

import { useMemo, useState } from "react";
import { useSeatingStore } from "@/store/seatingStore";

/* ================= TYPES ================= */

type Guest = {
  id?: string;
  _id: string;
  name: string;
  groupId?: string | null;
  tableId?: string | null;
  tableName?: string | null;
  guestsCount?: number;
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

export default function SeatingSidebar() {
  const guests = useSeatingStore((s) => s.guests) as Guest[];
  const groups = useSeatingStore((s) => s.groups) as Group[];
  const tables = useSeatingStore((s) => s.tables) as Table[];

  const seatGroup = useSeatingStore((s) => s.seatGroup);
  const unseatGroup = useSeatingStore((s) => s.unseatGroup);
  const assignGuestBlock = useSeatingStore((s) => s.assignGuestBlock);
  const removeFromSeat = useSeatingStore((s) => s.removeFromSeat);
  const getGroupSize = useSeatingStore((s) => s.getGroupSize);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  /* ================= MAP אורח → שולחן ================= */
  const guestTableMap = useMemo(() => {
    const map = new Map<string, Table>();
    tables.forEach((t) =>
      t.seatedGuests.forEach((sg) => {
        map.set(String(sg.guestId), t);
      })
    );
    return map;
  }, [tables]);

  /* ================= GROUP אורחים ================= */
  const groupedGuests = useMemo(() => {
    const map: Record<string, Guest[]> = {};
    guests.forEach((g) => {
      const key = g.groupId ?? "__no_group__";
      if (!map[key]) map[key] = [];
      map[key].push(g);
    });
    return map;
  }, [guests]);

  return (
    <div className="h-full flex flex-col border-l bg-white">
      <div className="p-3 font-semibold text-sm border-b">
        הקצאת אורחים
      </div>

      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedGuests).map(
          ([groupId, list]: [string, Guest[]]) => {
            const group =
              groupId !== "__no_group__"
                ? groups.find((g) => g._id === groupId)
                : null;

            const isOpen = openGroups[groupId];

            return (
              <div key={groupId} className="border-b">
                {/* ===== כותרת קבוצה ===== */}
                <div
                  className="p-3 bg-gray-50 flex justify-between items-center cursor-pointer"
                  onClick={() =>
                    setOpenGroups((o) => ({
                      ...o,
                      [groupId]: !o[groupId],
                    }))
                  }
                >
                  <div className="text-sm font-medium">
                    {group ? group.name : "ללא קבוצה"} ({list.length})
                  </div>

                  {group && (
                    <select
                      className="text-xs border rounded px-1"
                      value={group.tableId ?? ""}
                      onChange={(e) => {
                        const tableId = e.target.value;
                        if (!tableId) unseatGroup(group._id);
                        else seatGroup(group._id, tableId);
                      }}
                    >
                      <option value="">ללא שולחן</option>
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

                {/* ===== אורחים ===== */}
                {isOpen &&
                  list.map((g) => {
                    const table = guestTableMap.get(String(g._id));

                    return (
                      <div
                        key={g._id}
                        className="px-4 py-2 flex justify-between items-center hover:bg-gray-100"
                      >
                        <div>
                          <div className="text-sm">{g.name}</div>
                          <div className="text-xs text-gray-400">
                            {table ? `שולחן ${table.name}` : "לא משובץ"}
                          </div>
                        </div>

                        <select
                          className="text-xs border rounded px-1"
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
          }
        )}
      </div>
    </div>
  );
}
