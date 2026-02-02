"use client";

import { useEffect, useMemo, useState } from "react";
import { useSeatingStore } from "@/store/seatingStore";

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
  displayName?: string; // ⭐ להוסיף
  seats: number;
  seatedGuests: { guestId: string }[];
};

type Filter = "all" | "seated" | "unseated";

export default function SeatingSidebar() {
  /* ===== STORE ===== */
  const guests = useSeatingStore((s) => s.guests) as Guest[];
  const groups = useSeatingStore((s) => s.groups) as Group[];
  const tables = useSeatingStore((s) => s.tables) as Table[];

  const assignGuestBlock = useSeatingStore((s) => s.assignGuestBlock);
  const openSeatGuestModal = useSeatingStore(
  (s) => s.openSeatGuestModal
);

  const removeFromSeat = useSeatingStore((s) => s.removeFromSeat);

  /* ===== UI STATE ===== */
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  /* ===== Helpers ===== */
  const seatGuestId = (g: Guest) => String(g.id ?? g._id);

  const getClientArrivedCount = (g: Guest) =>
  Number((g as any).arrivedCount ?? 0);


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


  const getGroupTableId = (groupId: string) => {
  // מוצאים אורח מהקבוצה שיושב בפועל
  const guest = guests.find(
  (g) =>
    g.rsvp === "yes" &&
    normalizeGroupId(g.groupId) === String(groupId) &&
    guestTableMap.has(String(g.id ?? g._id))
);


  if (!guest) return "";

  const table = guestTableMap.get(
    String(guest.id ?? guest._id)
  );

  return table?.id ?? "";
};

const getNoGroupTableId = (list: Guest[]) => {
  if (!list.length) return "";

  const first = list.find(
  (g) =>
    g.rsvp === "yes" &&
    guestTableMap.has(String(g.id ?? g._id))
);

  if (!first) return "";

  const table = guestTableMap.get(
    String(first.id ?? first._id)
  );

  return table?.id ?? "";
};

const getTableGroupLabel = (tableId: string) => {
  const seatedGuests = guests
    .filter(
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

  if (groupIds.length > 1) {
    return "קבוצות מעורבות";
  }

  return "";
};



  const tableLabel = (t: Table) => {
  const count = t.seatedGuests?.length ?? 0;

  const groupLabel = getTableGroupLabel(t.id);

  const main =
    t.displayName && t.displayName.trim()
      ? `${t.name} – ${t.displayName}`
      : t.name;

  return groupLabel
    ? `${groupLabel} · ${main} (${count}/${t.seats})`
    : `${main} (${count}/${t.seats})`;
};




  function guestVisible(g: Guest) {
      if (g.rsvp !== "yes") return false;

    const q = search.trim().toLowerCase();
    const gid = seatGuestId(g);
    const isSeated = guestTableMap.has(gid);

    if (filter === "seated" && !isSeated) return false;
    if (filter === "unseated" && isSeated) return false;

    const gidNorm = normalizeGroupId(g.groupId);

const groupName =
  gidNorm !== NO_GROUP_KEY
    ? groups.find((gr) => String(gr._id) === String(gidNorm))?.name || ""
    : "";


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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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


          return (
            <div key={groupId} className="border-b border-[#ead8cc]">
              {/* ===== Group Header ===== */}
              <div
                className="px-4 py-3 flex justify-between items-center bg-[#f6ede8]"
                onClick={() =>
                  setOpenGroups((o) => ({ ...o, [groupId]: !o[groupId] }))
                }
              >
                <div className="text-sm font-medium">
  {group
    ? group.name
    : `ללא קבוצה (${visibleGuests.length})`}
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
                    console.log("🟦 GROUP SELECT CHANGE", {
                      groupId,
                      tableId,
                      hasGroup: !!group,
                      visibleGuests,
                      tables,
                    });

                    const seatableGuests = visibleGuests.filter(
  (g) => g.rsvp === "yes"
);

if (!seatableGuests.length) return;

if (!group) {
  seatableGuests.forEach((g) => {
    const gid = seatGuestId(g);
    if (!tableId) removeFromSeat(gid);
    else assignGuestBlock({ guestId: gid, tableId });
  });
  return;
}


                    if (!tableId) {
  console.log("⬅️ unseatGroup (RSVP-safe)", group._id);

  seatableGuests.forEach((g) => {
    removeFromSeat(seatGuestId(g));
  });
} else {
  console.log("➡️ seatGroup (RSVP-safe)", {
    groupId: group._id,
    tableId,
  });

  seatableGuests.forEach((g) => {
    assignGuestBlock({
      guestId: seatGuestId(g),
      tableId,
    });
  });
}
                  }}
                  
                >
                  <option value="">ללא שולחן</option>
                  {tables.map((t) => {
                 
                    return (
                    <option
  key={t.id}
  value={t.id}
  disabled={
    group
      ? !useSeatingStore
          .getState()
          .canSeatGroupAtTable(t.id, group._id)
      : false
  }
>
  {tableLabel(t)}
</option>
                    );
                  })}
                </select>
              </div>

              {/* ===== Guests ===== */}
              {isOpen &&
                visibleGuests.map((g) => {
  const gid = seatGuestId(g);
  const table = guestTableMap.get(gid);

  const plannedCount = getClientArrivedCount(g);


  return (
                    <div
  key={g._id}
  className="px-5 py-2 flex justify-between items-center cursor-pointer hover:bg-[#f3e7e0]"
  onClick={() =>
    useSeatingStore.getState().openSeatGuestModal({
      guestId: seatGuestId(g),
      plannedSeats: useSeatingStore
        .getState()
        .getPlannedSeatCount(g),
    })
  }
>


                      <div>
                        <div className="text-sm">{g.name}</div>
                        <div className="text-xs text-gray-500">
  {table
    ? `${table.displayName || table.name} · ${plannedCount} מוזמנים`
    : `לא משובץ · ${plannedCount} מוזמנים`}
</div>


                      </div>

                      <select
                        className="text-xs border border-[#e6c3ad] rounded-lg px-2 py-1 bg-white"
                        value={table?.id ?? ""}
                        onChange={(e) => {
                            if (g.rsvp !== "yes") return;

                          const tableId = e.target.value;
                          console.log("🟩 GUEST SELECT CHANGE", {
                            guest: g,
                            guestId: gid,
                            tableId,
                            tables,
                          });

                          if (!tableId) {
                            console.log("⬅️ removeFromSeat", gid);
                            removeFromSeat(gid);
                          } else {
                            console.log("➡️ assignGuestBlock", {
                              guestId: gid,
                              tableId,
                            });
                            assignGuestBlock({ guestId: gid, tableId });
                          }
                        }}
                      >
                        <option value="">ללא שולחן</option>
                        {tables.map((t) => {
                      
                          return (
                            <option
  key={t.id}
  value={t.id}
  disabled={
    !useSeatingStore
      .getState()
      .canSeatGuestAtTable(t.id, g)
  }
>


                      
                             {tableLabel(t)}

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
