"use client";

import { useEffect, useMemo, useState } from "react";
import { useSeatingStore } from "@/store/seatingStore";

/* ================= TYPES ================= */

type Guest = {
  id?: string; // ✅ זה ה-ID שמשמש את ההושבה (guestId ב-seatedGuests)
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
  id: string; // ✅ זה ה-ID של השולחן (UUID) – תואם ל-DB שלך
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

  /* ===== Helper: ID אחיד לאורח בהושבה ===== */
  function seatGuestId(g: Guest) {
    // אם יש id (UUID של אורח ההזמנה) זה המפתח שמופיע ב-seatedGuests.guestId
    return String(g.id ?? g._id);
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

  function tableLabel(t: Table, groupName: string) {
  return `${t.name} – ${groupName} (${t.seatedGuests.length}/${t.seats})`;
}


  /* ===== FILTER + SEARCH ===== */
  function guestVisible(g: Guest) {
  const q = search.trim().toLowerCase();
  const gid = seatGuestId(g);
  const isSeated = guestTableMap.has(gid);

  if (filter === "seated" && !isSeated) return false;
  if (filter === "unseated" && isSeated) return false;

  // ✅ שם קבוצה מסונכרן (מונע בעיות String/ObjectId)
  const groupName =
    groups.find((gr) => String(gr._id) === String(g.groupId))?.name || "";

  if (!q) return true;

  const nameMatch = (g.name || "").toLowerCase().includes(q);
  const phoneMatch = String(g.phone || "").includes(q);
  const groupMatch = groupName.toLowerCase().includes(q);

  return nameMatch || phoneMatch || groupMatch;
}

useEffect(() => {
  const q = search.trim().toLowerCase();
  if (!q) return;

  setOpenGroups((prev) => {
    const next = { ...prev };
    for (const [groupId, list] of Object.entries(groupedGuests)) {
      const hasVisible = list.some(guestVisible);
      if (hasVisible) next[groupId] = true; // ✅ פותח קבוצות עם תוצאות
    }
    return next;
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [search, groupedGuests]);



  return (
    <aside className="h-full w-[340px] flex flex-col bg-[#fdf9f6] border-l border-[#ead8cc]">
      {/* ===== Header ===== */}
      <div className="p-4 border-b border-[#ead8cc]">
        <div className="font-semibold text-base mb-2">הקצאת מקומות</div>

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
    ? groups.find((g) => String(g._id) === String(groupId))
    : null;


          const visibleGuests = list.filter(guestVisible);
          if (!visibleGuests.length) return null;

          const isOpen = openGroups[groupId];

          const groupName = group?.name || "";
const selectedTable = group?.tableId
  ? tables.find((t) => String(t.id) === String(group.tableId))
  : null;




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
  {group
    ? `${group.name} (${getGroupSize(group._id)} אנשים · ${visibleGuests.length} אורחים)`
    : `ללא קבוצה (${visibleGuests.length})`}
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
  <option value="">
  {selectedTable ? tableLabel(selectedTable, groupName) : "ללא שולחן"}
</option>


  {tables.map((t) => {
    const free = t.seats - (t.seatedGuests?.length ?? 0);
    const label = tableLabel(t, groupName);


    return (
      <option
        key={t.id}
        value={t.id}
        disabled={free < getGroupSize(group._id)}
      >
        {label}
      </option>
    );
  })}
</select>


                )}
              </div>

              {/* ===== Guests ===== */}
              {isOpen &&
                visibleGuests.map((g) => {
                  const gid = seatGuestId(g);
                  const table = guestTableMap.get(gid);

                  return (
                    <div
                      key={g._id}
                      className="px-5 py-2 flex justify-between items-center hover:bg-[#f2e6de]"
                    >
                      <div>
                        <div className="text-sm">{g.name}</div>
                        <div className="text-xs text-gray-500">

                          {table
  ? (() => {
      const gName =
        g.groupId
          ? groups.find((gr) => String(gr._id) === String(g.groupId))?.name
          : null;

      return gName ? `${gName} · שולחן ${table.name}` : `שולחן ${table.name}`;
    })()
  : "לא משובץ"}

                        </div>
                      </div>

                      <select
  className="text-xs border border-[#e6c3ad] rounded-lg px-2 py-1 bg-white"
  value={table?.id ?? ""}
  onChange={(e) => {
    const tableId = e.target.value;
    if (!tableId) {
      removeFromSeat(gid);
    } else {
      assignGuestBlock({ guestId: gid, tableId });
    }
  }}
>
  <option value="">ללא שולחן</option>

  {tables.map((t) => {
    const free = t.seats - (t.seatedGuests?.length ?? 0);

    // ✅ אם האורח שייך לקבוצה – נציג "שולחן X – שם קבוצה (6/12)"
    const groupNameForGuest =
      g.groupId
        ? groups.find((gr) => String(gr._id) === String(g.groupId))?.name || ""
        : "";

    const label = groupNameForGuest
      ? `${t.name} – ${groupNameForGuest} (${t.seatedGuests.length}/${t.seats})`
      : `${t.name} (${t.seatedGuests.length}/${t.seats})`;

    return (
      <option key={t.id} value={t.id} disabled={free < 1}>
        {label}
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
