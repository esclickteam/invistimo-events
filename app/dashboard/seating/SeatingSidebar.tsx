"use client";

import { useEffect, useMemo, useState } from "react";
import { useSeatingStore } from "@/store/seatingStore";
import { useSeatingStats } from "../../hooks/useSeatingStats";
import { useGroupStore } from "@/store/groupStore";



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

export default function SeatingSidebar({ invitationId }: { invitationId?: string | null }) {

  /* ===== STORE ===== */
  const guests = useSeatingStore((s) => s.guests) as Guest[];
  const groups = useGroupStore((s) => s.groups) as Group[];
  const tables = useSeatingStore((s) => s.tables) as Table[];
  const isLiveMode = useSeatingStore((s) => s.seatingMode === "live");



  const assignGuestBlock = useSeatingStore((s) => s.assignGuestBlock);
  const removeFromSeat = useSeatingStore((s) => s.removeFromSeat);
  const [mobileOpen, setMobileOpen] = useState(false);


  const {
  stats,
  isGuestSeated,
  getGroupStats,
} = useSeatingStats();


  /* ===== UI STATE ===== */
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const [selectingGuestId, setSelectingGuestId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);


  /* ================= HELPERS ================= */

  const seatGuestId = (g: Guest) => String(g.id ?? g._id);

  const getPlannedSeatCount = (g: Guest) =>
    useSeatingStore.getState().getPlannedSeatCount(g);

  // ⭐ ספירת מושבים לפי מצב (רגיל / לייב)
const getSeatCount = (g: any) => {
  const store = useSeatingStore.getState();

  // מצב רגיל – תכנון
  if (!isLiveMode) {
    return store.getPlannedSeatCount(g);
  }

  // מצב לייב – מגיעים בפועל (האמת היחידה)
  return Number(
    store.liveArrivals[String(g.id ?? g._id)] ?? 0
  );
};

// האם האורח "כשיר להושבה" לפי מצב המערכת
const isEligibleInCurrentMode = (g: Guest) => {
  // במצב רגיל - רק מי שאישר הגעה
  if (!isLiveMode) return g.rsvp === "yes";

  // במצב לייב - מי שהגיע בפועל (גם אם RSVP לא yes)
  return getSeatCount(g) > 0;
};


  

  const syncAssignToServer = async (guestId: string, tableId: string) => {
  if (!invitationId) return false;

  try {
    const res = await fetch("/api/guests/assign-table", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestId,
        invitationId,
        tableId,
      }),
    });

    const data = await res.json().catch(() => ({}));
    return res.ok && data?.success !== false;
  } catch {
    return false;
  }
};

const syncRemoveFromServer = async (guestId: string) => {
  if (!invitationId) return false;

  try {
    const res = await fetch("/api/guests/remove-from-table", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestId,
        invitationId,
      }),
    });

    const data = await res.json().catch(() => ({}));
    return res.ok && data?.success !== false;
  } catch {
    return false;
  }
};


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
    const key = normalizeGroupId(g.groupId);

    if (!map[key]) map[key] = [];
    map[key].push(g);
  });

  return map;
}, [guests]);

  /* ================= TABLE LOOKUPS ================= */

  const getGroupTableId = (groupId: string) => {
  const guest = guests.find(
    (g) =>
      isEligibleInCurrentMode(g) &&
      normalizeGroupId(g.groupId) === String(groupId) &&
      isGuestSeated(g)
  );

  if (!guest) return "";
  return guestTableMap.get(seatGuestId(guest))?.id ?? "";
};


  const getNoGroupTableId = (list: Guest[]) => {
  const first = list.find(
    (g) => isEligibleInCurrentMode(g) && isGuestSeated(g)
  );

  if (!first) return "";
  return guestTableMap.get(seatGuestId(first))?.id ?? "";
};


  /* ================= LABELS ================= */

  const getTableGroupLabel = (tableId: string) => {
  const seatedGuests = guests.filter(
    (g) =>
      isEligibleInCurrentMode(g) &&
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
      isEligibleInCurrentMode(g) &&
      guestTableMap.get(seatGuestId(g))?.id === t.id
  )
  .reduce((sum, g) => sum + getSeatCount(g), 0);



  const groupLabel = getTableGroupLabel(t.id);

  return groupLabel
    ? `${groupLabel} · ${t.name} (${count}/${t.seats})`
    : `${t.name} (${count}/${t.seats})`;
};


  /* ================= FILTER ================= */

  function guestVisible(g: Guest) {
    if (!isEligibleInCurrentMode(g)) return false;


    const q = search.trim().toLowerCase();
    const gid = seatGuestId(g);
    const isSeated = isGuestSeated(g);


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

  useEffect(() => {
  setOpenGroups((prev) => {
    const next = { ...prev };

    Object.entries(groupedGuests).forEach(([gid, list]) => {
      const { remaining } = getGroupStats(list);
      if (remaining === 0) next[gid] = false;
    });

    return next;
  });
}, [tables, groupedGuests]);



  /* ================= RENDER ================= */

  return (
  <>

  {/* ===== MOBILE BUTTON ===== */}
<button
  onClick={() => setMobileOpen(true)}
  className="md:hidden fixed bottom-5 left-5 z-40 bg-[#e6c3ad] text-white px-4 py-2 rounded-full shadow"
>
  אורחים
</button>

{/* ===== OVERLAY ===== */}
{mobileOpen && (
  <div
    className="fixed inset-0 bg-black/40 z-40 md:hidden"
    onClick={() => setMobileOpen(false)}
  />
)}



     <aside
  className={`
    bg-[#fdf9f6] border-l border-[#ead8cc] flex flex-col
    h-full w-[400px]
    
    fixed top-0 right-0 z-50
    transform transition-transform duration-300
    
    md:static md:translate-x-0 md:z-auto md:pointer-events-auto
    
    ${mobileOpen 
      ? "translate-x-0 pointer-events-auto" 
      : "translate-x-full pointer-events-none"}
  `}
>



      {/* ===== Header ===== */}
      <div className="p-5 border-b border-[#ead8cc]">
  <div className="font-semibold text-[15px] mb-3">הקצאת מקומות</div>

  <div className="text-xs flex gap-3 mt-2">
  <span>סה״כ {stats.total}</span>
  <span className="text-green-700">הושבו {stats.seated}</span>
  <span className="text-orange-700">נשארו {stats.remaining}</span>
</div>

<div className="flex items-center gap-2">
  {/* 🔍 חיפוש */}
  <input
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder="חיפוש אורח / טלפון / קבוצה"
    className="flex-1 rounded-xl border border-[#e6c3ad] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#e6c3ad]"
  />

  {/* 🔽 פילטר הכל / שובצו / לא שובצו */}
  <div className="relative">
    <button
      onClick={() => setFilterOpen((o) => !o)}
      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#e6c3ad] bg-white text-sm whitespace-nowrap"
    >
      {filter === "all" && "הכל"}
      {filter === "seated" && "שובצו"}
      {filter === "unseated" && "לא שובצו"}
      <span className="text-xs opacity-60">▾</span>
    </button>

    {filterOpen && (
      <div className="absolute right-0 z-20 mt-2 w-[220px] rounded-xl border border-[#ead8cc] bg-white shadow">
        <button
          onClick={() => {
            setFilter("all");
            setFilterOpen(false);
          }}
          className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[#f6ede8]"
        >
          <span>הכל</span>
          {filter === "all" && "✓"}
        </button>

        <button
          onClick={() => {
            setFilter("seated");
            setFilterOpen(false);
          }}
          className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[#f6ede8]"
        >
          <span>שובצו</span>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            {stats.seated}
          </span>
        </button>

        <button
          onClick={() => {
            setFilter("unseated");
            setFilterOpen(false);
          }}
          className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[#f6ede8]"
        >
          <span>לא שובצו</span>
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
            {stats.remaining}
          </span>
        </button>
      </div>
    )}
  </div>
</div>

 
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

          const { total, seated, remaining } =
  getGroupStats(visibleGuests);


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
  {seated}/{total} הושבו
</span>

{remaining > 0 && (
  <span className="text-xs text-orange-700">
    נשארו {remaining}
  </span>
)}


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
    onChange={async (e) => {
  const tableId = e.target.value;
  const eligibleGuests = visibleGuests.filter(isEligibleInCurrentMode);

for (const g of eligibleGuests) {

    const gid = seatGuestId(g);

    if (!tableId) {
      removeFromSeat(gid); // optimistic
      const ok = await syncRemoveFromServer(gid);
      if (!ok) {
        // rollback בסיסי: לא מחזירים אוטומטית כדי לא לשבור UX, רק אפשר להציג שגיאה אם תרצי
        console.error("Failed removing guest from server", gid);
      }
    } else {
      assignGuestBlock({ guestId: gid, tableId }); // optimistic
      const ok = await syncAssignToServer(gid, tableId);
      if (!ok) {
        console.error("Failed assigning guest on server", gid, tableId);
      }
    }
  }
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
    const count = getSeatCount(g);


    return (
      <div
        key={gid}

        className="px-5 py-2 flex justify-between items-center gap-2 hover:bg-[#f3e7e0]"
      >
        {/* 🧑 פרטי אורח */}
        <div className="min-w-0">
  <div className="text-sm font-medium truncate">{g.name}</div>
  <div className="text-xs text-gray-500 truncate">
            {table
  ? `${table.name} · ${count} ${isLiveMode ? "הגיעו" : "מוזמנים"}`
  : `לא משובץ · ${count} ${isLiveMode ? "הגיעו" : "מוזמנים"}`}


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
  onClick={async () => {
  setSelectingGuestId(null);

  if (table) {
    removeFromSeat(gid);
const ok = await syncRemoveFromServer(gid);
if (!ok) {
  console.error("Failed removing guest from server", gid);
}

    return;
  }

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
    onChange={async (e) => {
  const tableId = e.target.value;
  if (!tableId) return;

  assignGuestBlock({ guestId: gid, tableId }); // optimistic
  const ok = await syncAssignToServer(gid, tableId);
  if (!ok) {
    console.error("Failed assigning guest on server", gid, tableId);
  }

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
</>
);

}