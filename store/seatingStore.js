

import { create } from "zustand";
import { findFreeBlock } from "../logic/seatingEngine";

function extractNumberFromName(name) {
  const m = String(name || "").match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

export const useSeatingStore = create((set, get) => ({
  /* ---------------- STATE ---------------- */
  tables: [],
  guests: [],
  liveArrivals: {},

  groups: [],
draggingGroup: null,


  background: null,

   demoMode: false, // ⭐ מצב דמו

seatingMode: "regular", // "regular" | "live"

setSeatingMode: (mode) =>
  set((state) => {
    if (mode !== "regular" && mode !== "live") return state;
    if (mode === state.seatingMode) return state;

    const next = { seatingMode: mode };

    if (mode === "live") {
      next.liveArrivals = Object.fromEntries(
        (state.guests || []).map((g) => [
          String(g.id ?? g._id),
          Number(g.actualArrivedCount ?? 0),
        ])
      );
    }

    if (mode === "regular") {
      next.tables = (state.tables || []).map((t) => ({
        ...t,
        seatedGuests: (t.seatedGuests || []).map((sg) => ({
          ...sg,
          arrived: false,
        })),
      }));
    }

    return next;
  }),




  /* ---------------- ACTIONS ---------------- */
  setDemoMode: (isDemo) => set({ demoMode: isDemo }),



  draggingGuest: null,
  ghostPosition: { x: 0, y: 0 },

  highlightedTable: null,
  highlightedSeats: [],

  selectedGuestId: null,

  seatingModalTableId: null,
  showSeatingModal: false,

  showAddModal: false,
  addGuestTable: null,

  /* ================= ⭐ CANVAS VIEW (ADDED) ================= */
  canvasView: {
    scale: 1,
    x: 0,
    y: 0,
  },

  /* ---------------- ACTIONS ---------------- */
  setAddGuestTable: (tableId) => set({ addGuestTable: tableId }),
  setShowAddModal: (v) => set({ showAddModal: v }),
  setSelectedGuest: (guestId) => set({ selectedGuestId: guestId }),
  clearSelectedGuest: () => set({ selectedGuestId: null }),

  setBackground: (background) => set({ background }),

  /* ================= ⭐ SET CANVAS VIEW (ADDED) ================= */
  setCanvasView: (view) =>
    set({
      canvasView: view,
    }),

    /* ================= ⭐ AUTO FIT CANVAS ================= */
fitCanvasToTables: (stageWidth, stageHeight, padding = 120) => {
  const { tables } = get();
  if (!tables || tables.length === 0) return;

  // נקודות קצה של כל השולחנות
  const xs = tables.map((t) => t.x);
  const ys = tables.map((t) => t.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const contentWidth = maxX - minX + padding * 2;
  const contentHeight = maxY - minY + padding * 2;

  const scale = Math.min(
    stageWidth / contentWidth,
    stageHeight / contentHeight,
    1 // לא להגדיל מעבר ל־1
  );

  const x =
    stageWidth / 2 - ((minX + maxX) / 2) * scale;
  const y =
    stageHeight / 2 - ((minY + maxY) / 2) * scale;

  set({
    canvasView: {
      scale,
      x,
      y,
    },
  });
},

  setLiveArrived: (guestId, count) => {
  if (get().seatingMode !== "live") return;
  const key = String(guestId);

  set((state) => ({
    liveArrivals: {
      ...state.liveArrivals,
      [key]: Number(count ?? 0),
    },
  }));
},



setLiveArrivalsBulk: (map) =>
  set({ liveArrivals: map }),

resetLiveArrivals: () =>
  set({ liveArrivals: {} }),



  setTables: (tables) =>
    set(() => ({
      tables: tables || [],
    })),

    setGuests: (guests) =>
  set(() => ({
    guests: guests || [],
  })),

  /* ================= ⭐ GROUP UTILS ================= */

getGroupSize: (groupId) => {
  const { guests, getPlannedSeatCount } = get();

  return guests
    .filter((g) => String(g.groupId) === String(groupId))
    .reduce((sum, g) => sum + getPlannedSeatCount(g), 0);
},


// ⭐️ ספירת מושבים להושבה מה-SIDEBAR (תכנון, לא live)
getSidebarSeatCount: (guest) => {
  return Number(guest.guestsCount ?? 0);
},


getGuestSeatCount: (guest) => {
  if (get().seatingMode === "live") {
    return Number(
      get().liveArrivals[String(guest.id ?? guest._id)] ?? 0
    );
  }

  return Number(
    guest.arrivedCount ??
    (guest.rsvp === "yes" ? guest.guestsCount : 0)
  );
},




getSeatingCountForGuest: (guest) => {
  if (get().seatingMode === "live") {
    return Number(
      get().liveArrivals[String(guest.id ?? guest._id)] ?? 0
    );
  }

  return Number(
    guest.arrivedCount ??
    (guest.rsvp === "yes" ? guest.guestsCount : 0)
  );
},



getPlannedSeatCount: (guest) => {
  return Number(
    guest.arrivedCount ??
    (guest.rsvp === "yes" ? guest.guestsCount : 0)
  );
},



getFreeSeats: (tableId) => {
  const table = get().tables.find((t) => t.id === tableId);
  if (!table) return 0;

  const occupied = table.seatedGuests.length;


  return Math.max(0, table.seats - occupied);
},

getOccupiedSeatsForTable: (tableId) => {
  const { tables, guests, seatingMode, getGuestSeatCount } = get();

  const table = tables.find(t => t.id === tableId);
  if (!table) return 0;

  if (seatingMode !== "live") {
    return table.seatedGuests.length;
  }

  const guestMap = {};

  table.seatedGuests.forEach((sg) => {
    guestMap[sg.guestId] = true;
  });

  return Object.keys(guestMap).reduce((sum, guestId) => {
    const guest = guests.find(
      g => String(g.id ?? g._id) === String(guestId)
    );
    if (!guest) return sum;

    return sum + getGuestSeatCount(guest);
  }, 0);
},



canSeatGuestAtTable: (tableId, guest) => {
  const needed =
    get().seatingMode === "live"
      ? get().getGuestSeatCount(guest)
      : get().getPlannedSeatCount(guest);

  if (needed <= 0) return false;

  const free = get().getFreeSeats(tableId);
  return free >= needed;
},



canSeatGroupAtTable: (tableId, groupId) => {
  const {
    guests,
    tables,
    getPlannedSeatCount,
    getGuestSeatCount,
    getFreeSeats,
    seatingMode,
  } = get();

  const table = tables.find((t) => String(t.id) === String(tableId));
  if (!table) return false;

  const seatedGuestIds = new Set(
    tables.flatMap((t) =>
      (t.seatedGuests || []).map((s) => String(s.guestId))
    )
  );

  const remainingGroupGuests = guests.filter(
    (g) =>
      String(g.groupId) === String(groupId) &&
      !seatedGuestIds.has(String(g.id ?? g._id))
  );

  if (!remainingGroupGuests.length) return false;

  const free = getFreeSeats(tableId);
  if (free <= 0) return false;

  return remainingGroupGuests.some((g) => {
    const count =
      seatingMode === "live" ? getGuestSeatCount(g) : getPlannedSeatCount(g);

    return count > 0 && count <= free;
  });
},


canSeatGuests: (tableId, guest) => {
  const { tables, seatingMode, getPlannedSeatCount, getGuestSeatCount } = get();
  const table = tables.find((t) => t.id === tableId);
  if (!table) return false;

  const count =
    seatingMode === "live"
      ? getGuestSeatCount(guest)
      : getPlannedSeatCount(guest);

  if (!count || count <= 0) return false;

  const block = findFreeBlock(table, count);
  return !!block;
},





  /* ================= ⭐ GROUPS ================= */

setGroups: (groups) =>
  set(() => ({
    groups: groups || [],
  })),

addGroup: (group) =>
  set((state) => ({
    groups: [...state.groups, group],
  })),

updateGroup: (groupId, patch) =>
  set((state) => ({
    groups: state.groups.map((g) =>
      g._id === groupId ? { ...g, ...patch } : g
    ),
  })),

removeGroup: (groupId) =>
  set((state) => ({
    groups: state.groups.filter((g) => g._id !== groupId),
    guests: state.guests.map((guest) =>
      guest.groupId === groupId
        ? { ...guest, groupId: null }
        : guest
    ),
  })),

  /* ================= ⭐ GROUP SEATING ================= */

seatGroup: (groupId, tableId) => {
  const {
    groups,
    guests,
    tables,
    seatingMode,
    getPlannedSeatCount,
    getGuestSeatCount,
  } = get();

  const group = groups.find(
    (g) => String(g._id) === String(groupId)
  );

  if (!group) {
    return { ok: false, message: "קבוצה לא נמצאה" };
  }

  const targetTable = tables.find(
    (t) => String(t.id) === String(tableId)
  );

  if (!targetTable) {
    return { ok: false, message: "שולחן לא נמצא" };
  }

  const seatCountFn =
    seatingMode === "live"
      ? getGuestSeatCount
      : getPlannedSeatCount;

  /*
    כאן התיקון:
    לא בודקים אם הקבוצה כבר שובצה.
    בודקים מי מתוך הקבוצה עדיין לא יושב בשום שולחן.
  */
  const seatedGuestIds = new Set(
    tables.flatMap((table) =>
      (table.seatedGuests || []).map((seat) =>
        String(seat.guestId)
      )
    )
  );

  const remainingGroupGuests = guests.filter(
    (guest) =>
      String(guest.groupId) === String(groupId) &&
      !seatedGuestIds.has(String(guest.id ?? guest._id))
  );

  if (!remainingGroupGuests.length) {
    return {
      ok: false,
      message: "כל האורחים בקבוצה כבר שובצו",
    };
  }

  const currentTargetSeats = targetTable.seatedGuests || [];

  const freeSeats =
    Number(targetTable.seats || 0) -
    Number(currentTargetSeats.length || 0);

  if (freeSeats <= 0) {
    return { ok: false, message: "אין מקומות פנויים בשולחן" };
  }

  /*
    לוקחים רק את מי שנכנס לשולחן הזה.
    אם יש קבוצה של 55 ושולחן של 12 —
    ייכנסו רק עד 12 מקומות.
  */
  const guestsToSeat = [];
  let neededSeats = 0;

  for (const guest of remainingGroupGuests) {
    const count = Number(seatCountFn(guest) || 0);

    if (count <= 0) continue;

    if (neededSeats + count > freeSeats) {
      continue;
    }

    guestsToSeat.push(guest);
    neededSeats += count;

    if (neededSeats >= freeSeats) break;
  }

  if (!guestsToSeat.length || neededSeats <= 0) {
    return {
      ok: false,
      message: "אין מספיק מקום לאורחים הבאים בקבוצה",
    };
  }

  const block = findFreeBlock(targetTable, neededSeats);

  if (!block || block.length < neededSeats) {
    return {
      ok: false,
      message: "אין רצף מקומות פנוי בשולחן",
    };
  }

  let cursor = 0;

  const newSeats = guestsToSeat.flatMap((guest) => {
    const count = Number(seatCountFn(guest) || 0);
    const seats = block.slice(cursor, cursor + count);

    cursor += count;

    return seats.map((seatIndex) => ({
      guestId: String(guest.id ?? guest._id),
      seatIndex,
      arrived: false,
      groupId: String(groupId),
    }));
  });

  const resolvedTableName = String(
    targetTable?.number ??
      extractNumberFromName(targetTable?.name) ??
      targetTable?.name ??
      ""
  ).trim();

  const seatedNowIds = new Set(
    guestsToSeat.map((guest) =>
      String(guest.id ?? guest._id)
    )
  );

  const updatedTables = tables.map((table) =>
    String(table.id) === String(tableId)
      ? {
          ...table,
          seatedGuests: [
            ...(table.seatedGuests || []),
            ...newSeats,
          ],
        }
      : table
  );

  const updatedGuests = guests.map((guest) =>
    seatedNowIds.has(String(guest.id ?? guest._id))
      ? {
          ...guest,
          tableId,
          tableName: resolvedTableName || null,
        }
      : guest
  );

  /*
    אם נשארו עוד אנשים בקבוצה ללא שולחן,
    הקבוצה לא מסומנת כסגורה לגמרי.
  */
  const stillRemaining = updatedGuests.some(
    (guest) =>
      String(guest.groupId) === String(groupId) &&
      !guest.tableId
  );

  set({
    tables: updatedTables,
    guests: updatedGuests,
    groups: groups.map((g) =>
      String(g._id) === String(groupId)
        ? {
            ...g,
            tableId: stillRemaining ? null : tableId,
            isSeated: !stillRemaining,
          }
        : g
    ),
  });

  return {
    ok: true,
    seatedGuests: guestsToSeat.length,
    seatsUsed: neededSeats,
    hasRemaining: stillRemaining,
  };
},



unseatGroup: (groupId) => {
  const { tables, guests, groups } = get();

  set({
    tables: tables.map((t) => ({
      ...t,
      seatedGuests: (t.seatedGuests || []).filter(
        (sg) => String(sg.groupId) !== String(groupId)
      ),
    })),
    guests: guests.map((g) =>
      String(g.groupId) === String(groupId)
        ? { ...g, tableId: null, tableName: null }
        : g
    ),
    groups: groups.map((g) =>
      String(g._id) === String(groupId)
        ? { ...g, tableId: null, isSeated: false }
        : g
    ),
  });

  // 🔴 זה החסר – הוספה כאן בדיוק
  fetch(`/api/groups/${groupId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    tableId: null,
    isSeated: false,
  }),
}).catch((err) => {
  console.error("unseatGroup PATCH failed:", err);
});
},




  /* ---------------- INIT ---------------- */
init: (tables, guests, background = null, canvasView = null) => {
  const seatingMode = get().seatingMode;

  set((state) => ({
    ...state,

    tables: (tables || []).map((t) => ({
  ...t,
  number: t.number ?? extractNumberFromName(t.name) ?? null,
  seatedGuests: t.seatedGuests || [],
})),


    guests: guests || [],

    liveArrivals:
      seatingMode === "live"
        ? Object.fromEntries(
            (guests || []).map((g) => [
              String(g.id ?? g._id),
              Number(g.actualArrivedCount ?? 0),
            ])
          )
        : state.liveArrivals,

    background,

    // ✅ קריטי: לא לדרוס אם אין canvasView חדש
    canvasView:
      canvasView ??
      state.canvasView ??
      { scale: 1, x: 0, y: 0 },
  }));
},








  /* ================= ⭐ SNAPSHOT IMPORT ================= */
importSnapshot: (snapshot) => {
  if (!snapshot) return;

  console.log("🔵 IMPORT SNAPSHOT tables");
console.table(
  (snapshot.tables || []).map((t) => ({
    id: t.id,
    name: t.name,
  }))
);


  set({
    tables: (snapshot.tables || []).map((t) => ({
  ...t,
  number: t.number ?? extractNumberFromName(t.name) ?? null, // ✅ חדש
  seatedGuests: (t.seatedGuests || []).map((sg) => ({
    ...sg,
    arrived: sg.arrived ?? false,
  })),
})),


    

    groups: snapshot.groups || [],

    background: snapshot.background || null,
    canvasView: snapshot.canvasView || {
      scale: 1,
      x: 0,
      y: 0,
    },
  });
},



  /* ---------------- DEMO INIT ---------------- */
initDemo: () => {
  // 🧹 איפוס מוחלט של כל הסטור
  set({
    demoMode: true,
    seatingMode: "regular",

    tables: [],      // 🔥 מוחק שולחנות קיימים
    guests: [],
    groups: [],
    liveArrivals: {},
    background: null,
    highlightedTable: null,
    highlightedSeats: [],
    draggingGuest: null,
  });

  // ⭐ יצירת שולחנות דמו חדשים
  set({
    

    guests: [
      { id: "1", _id: "1", name: "אורן לוי", guestsCount: 2, arrivedCount: 2, actualArrivedCount: 0, rsvp: "yes" },
      { id: "2", _id: "2", name: "נועה כהן", guestsCount: 3, arrivedCount: 3, actualArrivedCount: 0, rsvp: "yes" },
      { id: "3", _id: "3", name: "דניאל פרץ", guestsCount: 1, arrivedCount: 1, actualArrivedCount: 0, rsvp: "yes" },
      { id: "4", _id: "4", name: "שירה כהן", guestsCount: 4, arrivedCount: 4, actualArrivedCount: 0, rsvp: "yes" },

      { id: "5", _id: "5", name: "אלון מזרחי", guestsCount: 2, arrivedCount: 0, actualArrivedCount: 0, rsvp: "pending" },
      { id: "6", _id: "6", name: "תמר לוי", guestsCount: 1, arrivedCount: 0, actualArrivedCount: 0, rsvp: "pending" },

      { id: "7", _id: "7", name: "רוני אברהם", guestsCount: 2, arrivedCount: 0, actualArrivedCount: 0, rsvp: "no" },
      { id: "8", _id: "8", name: "מאיה ישראלי", guestsCount: 1, arrivedCount: 0, actualArrivedCount: 0, rsvp: "no" },

      { id: "9", _id: "9", name: "משפחת כהן", guestsCount: 5, arrivedCount: 5, actualArrivedCount: 0, rsvp: "yes", groupId: "group-1" },
      { id: "10", _id: "10", name: "משפחת כהן 2", guestsCount: 3, arrivedCount: 3, actualArrivedCount: 0, rsvp: "yes", groupId: "group-1" },
    ],

    groups: [
      { _id: "group-1", name: "משפחת כהן", tableId: "table-4", isSeated: true },
    ],
  });

  // ⭐ שיבוץ אמיתי אחרי יצירת השולחנות
  const { assignGuestBlock } = get();

  assignGuestBlock({ guestId: "1", tableId: "table-1" });
  assignGuestBlock({ guestId: "2", tableId: "table-2" });
  assignGuestBlock({ guestId: "3", tableId: "table-3" });
  assignGuestBlock({ guestId: "4", tableId: "table-4" });
  assignGuestBlock({ guestId: "9", tableId: "table-4" });
  assignGuestBlock({ guestId: "10", tableId: "table-4" });
},




  /* ---------------- ADD TABLE ---------------- */
  addTable: (type, seats, position) => {
  const { tables, canvasView } = get();

  // ✅ אם משום מה לא הגיע position – ניצור במרכז המסך (יחסית ל-canvasView)
  const fallbackX = (-Number(canvasView?.x ?? 0) + 600) / Number(canvasView?.scale ?? 1);
  const fallbackY = (-Number(canvasView?.y ?? 0) + 350) / Number(canvasView?.scale ?? 1);

  const newTable = {
  id: crypto.randomUUID(),
  number: tables.length + 1,          // ✅ חדש
  name: `שולחן ${tables.length + 1}`,
  type,
  seats,
  x: position?.x ?? fallbackX,
  y: position?.y ?? fallbackY,
  rotation: 0,
  seatedGuests: [],
};

  set({
    tables: [...tables, newTable],
  });

  return newTable;
},


/* ---------------- UPDATE TABLE DISPLAY NAME ---------------- */

 updateTableNumber: (tableId, nextNumber) =>
  set((state) => {
    const n = Number(nextNumber);

    const tables = state.tables.map((t) =>
      t.id === tableId
        ? {
            ...t,
            number: n,
            name: `שולחן ${n}`, // ⭐ זה השם האמיתי
          }
        : t
    );

    const guests = state.guests.map((g) =>
      String(g.tableId) === String(tableId)
        ? { ...g, tableName: `שולחן ${n}` }
        : g
    );

    return { tables, guests };
  }),





  /* ---------------- DELETE TABLE ---------------- */
  deleteTable: (tableId) =>
    set((state) => ({
      tables: state.tables.filter((t) => t.id !== tableId),
      guests: state.guests.map((g) =>
        g.tableId === tableId
          ? { ...g, tableId: null, tableName: null }
          : g
      ),
      highlightedTable: null,
      highlightedSeats: [],
    })),

  /* ---------------- DRAG START / END ---------------- */
  startDragGuest: (guest) =>
  set({
    draggingGuest: {
      ...guest,
      id: String(guest.id ?? guest._id), // ⭐⭐⭐ השורה הקריטית
      __isDragging: true,
    },
    highlightedSeats: [],
    highlightedTable: null,
  }),


  endDragGuest: () =>
    set({
      draggingGuest: null,
      highlightedSeats: [],
      highlightedTable: null,
    }),

  updateGhostPosition: (pos) => set({ ghostPosition: pos }),

  /* ---------------- HOVER ---------------- */
  evaluateHover: (pointer) => {
    const { tables, draggingGuest } = get();
    if (!draggingGuest) return;

    const hoveredTable = tables.find((t) => {
      const dx = pointer.x - t.x;
      const dy = pointer.y - t.y;
      const radius =
        t.type === "round" ? 90 : t.type === "square" ? 110 : 160;
      return Math.sqrt(dx * dx + dy * dy) < radius;
    });
    
    if (!hoveredTable) {
  return set({
    highlightedTable: null,
    highlightedSeats: [],
  });
}

const count =
  get().seatingMode === "live"
    ? get().getGuestSeatCount(draggingGuest)
    : get().getPlannedSeatCount(draggingGuest);

if (count <= 0) return;


    const block = findFreeBlock(hoveredTable, count);

    set({
      highlightedTable: hoveredTable.id,
      highlightedSeats: block || [],
    });
  },

  /* ---------------- DROP (SIDEBAR → TABLE) ---------------- */
dropGuest: () => {
  const {
    draggingGuest,
    highlightedTable,
    highlightedSeats,
    tables,
    guests,
  } = get();

  if (!draggingGuest) return;

  if (!highlightedTable || highlightedSeats.length === 0) {
    return set({
      draggingGuest: null,
      highlightedTable: null,
      highlightedSeats: [],
    });
  }

  const guestId = String(draggingGuest.id ?? draggingGuest._id);

  const guestObj = guests.find(
  (g) => String(g.id ?? g._id) === String(guestId)
);

if (!guestObj) {
  return set({
    draggingGuest: null,
    highlightedTable: null,
    highlightedSeats: [],
  });
}

const count =
  get().seatingMode === "live"
    ? get().getGuestSeatCount(guestObj)
    : get().getPlannedSeatCount(guestObj);

if (count <= 0) {
  return set({
    draggingGuest: null,
    highlightedTable: null,
    highlightedSeats: [],
  });
}


  const updatedTables = tables.map((t) => {
    // ניקוי הושבות קודמות
    const cleanedSeats =
      t.seatedGuests?.filter((s) => s.guestId !== guestId) ?? [];

    if (t.id !== highlightedTable) {
      return { ...t, seatedGuests: cleanedSeats };
    }

    // ⬅️ כאן הקסם: יוצרים array חדש
    return {
      ...t,
      seatedGuests: [
        ...cleanedSeats,
        ...highlightedSeats.map((seatIndex) => ({
          guestId,
          seatIndex,
          arrived: false,
        })),
      ],
    };
  });

  const targetTable = updatedTables.find(
  (t) => t.id === highlightedTable
);

const resolvedTableName = String(
  targetTable?.number ??
    extractNumberFromName(targetTable?.name) ??
    targetTable?.name ??
    ""
).trim();


  

  set({
  tables: updatedTables,
  guests: guests.map((g) =>
    String(g.id ?? g._id) === String(guestId)
      ? {
          ...g,
          tableId: highlightedTable,
          tableName: resolvedTableName || null,
        }
      : g
  ),
  draggingGuest: null,
  highlightedSeats: [],
  highlightedTable: null,
});
},

assignGuestBlock: ({ guestId, tableId }) => {
  const { tables, guests } = get();

  const guest = guests.find(
    (g) => String(g.id ?? g._id) === String(guestId)
  );
  if (!guest) return;


const count =
  get().seatingMode === "live"
    ? get().getGuestSeatCount(guest)
    : get().getPlannedSeatCount(guest);

if (count <= 0) return;


  const updatedTables = tables.map((t) => {
    const prevSeats = Array.isArray(t.seatedGuests)
      ? t.seatedGuests
      : [];

    // ניקוי הושבות קודמות
    const cleanedSeats = prevSeats.filter(
      (s) => String(s.guestId) !== String(guestId)
    );

    if (t.id !== tableId) {
      return { ...t, seatedGuests: cleanedSeats };
    }

    const block = findFreeBlock(
      { ...t, seatedGuests: cleanedSeats },
      count
    );

    if (!block) {
      return { ...t, seatedGuests: cleanedSeats };
    }

    return {
      ...t,
      seatedGuests: [
        ...cleanedSeats,
        ...block.map((seatIndex) => ({
          guestId: String(guestId),
          seatIndex,
          arrived: false,
        })),
      ],
    };
  });

  const targetTable = updatedTables.find((t) => t.id === tableId);

const resolvedTableName = String(
  targetTable?.number ??
    extractNumberFromName(targetTable?.name) ??
    targetTable?.name ??
    ""
).trim();

set({
  tables: updatedTables,
  guests: guests.map((g) =>
    String(g.id ?? g._id) === String(guestId)
      ? {
          ...g,
          tableId: tableId,
          tableName: resolvedTableName || null,
        }
      : g
  ),
  draggingGuest: null,
  highlightedSeats: [],
  highlightedTable: null,
});

},



 /* ---------------- ⭐ DROP ישיר על מושב ---------------- */
assignGuestToSeat: ({ guestId, tableId, seatIndex }) => {
  const { tables, guests } = get();

  const updatedTables = tables.map((t) => {
    // ניקוי הושבות קודמות של האורח
    const cleanedSeats =
      t.seatedGuests?.filter(
        (s) => String(s.guestId) !== String(guestId)
      ) ?? [];

    if (t.id !== tableId) {
      return { ...t, seatedGuests: cleanedSeats };
    }

    // ⬅️ יצירת seatedGuests חדש (immutable)
    return {
      ...t,
      seatedGuests: [
        ...cleanedSeats,
        {
          guestId: String(guestId),
          seatIndex,
          arrived: false,
        },
      ],
    };
  });

   const targetTable = updatedTables.find(
  (t) => t.id === tableId
);

  const resolvedTableName = String(
    targetTable?.number ??
      extractNumberFromName(targetTable?.name) ??
      targetTable?.name ??
      ""
  ).trim();

  set({
    tables: updatedTables,
    guests: guests.map((g) =>
      String(g.id ?? g._id) === String(guestId)

        ? {
            ...g,
            tableId: tableId,
            tableName: resolvedTableName || null,
          }
        : g
    ),
    draggingGuest: null,
    highlightedSeats: [],
    highlightedTable: null,
  });
},

  /* ---------------- REMOVE FROM SEAT ---------------- */
  removeFromSeat: (guestId) => {
    const { tables, guests } = get();

    set({
      tables: tables.map((t) => ({
        ...t,
        seatedGuests: (t.seatedGuests || []).filter(
  (s) => s.guestId !== guestId
),

      })),
      guests: guests.map((g) =>
        String(g.id ?? g._id) === String(guestId)

          ? { ...g, tableId: null, tableName: null }
          : g
      ),
    });
  },

  /* ---------------- ⭐ MODAL ---------------- */
  openSeatingModal: (tableId) =>
    set({
      seatingModalTableId: tableId,
      showSeatingModal: true,
    }),

  closeSeatingModal: () =>
    set({
      seatingModalTableId: null,
      showSeatingModal: false,
    }),

  /* ---------------- ⭐️ עדכון למודאל ---------------- */
assignGuestsToTable: (tableId, guestId, count, seatIndex) => {
  const { tables, guests } = get();

  const table = tables.find((t) => t.id === tableId);
  const guest = guests.find(
    (g) => String(g.id ?? g._id) === String(guestId)
  );

  const resolvedTableName = String(
    table?.number ??
      extractNumberFromName(table?.name) ??
      table?.name ??
      ""
  ).trim();

  if (!table || !guest) {
    return { ok: false, message: "שגיאה בזיהוי שולחן / אורח" };
  }

  const realCount =
  get().seatingMode === "live"
    ? get().getGuestSeatCount(guest)
    : get().getPlannedSeatCount(guest);

if (realCount <= 0) {
  return {
    ok: false,
    message:
      get().seatingMode === "live"
        ? "האורח לא הגיע בפועל"
        : "אין כמות מושבים תקינה לאורח",
  };
}


  // ⭐️ שולחן נקי – בלי המושבים הקודמים של האורח
  const cleanTable = {
    ...table,
    seatedGuests: (table.seatedGuests || []).filter(
      (s) => String(s.guestId) !== String(guestId)
    ),
  };

  const block = findFreeBlock(cleanTable, realCount);

  // guard חובה
  if (!block || block.length === 0) {
    return { ok: false, message: "אין מספיק מקומות פנויים" };
  }

  // ניקוי הושבות קודמות של האורח מכל השולחנות
  const updatedTables = tables.map((t) => ({
    ...t,
    seatedGuests: (t.seatedGuests || []).filter(
      (s) => String(s.guestId) !== String(guestId)
    ),
  }));

  set({
    tables: updatedTables.map((t) =>
      t.id === tableId
        ? {
            ...t,
            seatedGuests: [
              ...(t.seatedGuests || []),
              ...block.map((seatIndex) => ({
                guestId: String(guestId),
                seatIndex,
                arrived: false,
              })),
            ],
          }
        : t
    ),
    guests: guests.map((g) =>
      String(g.id ?? g._id) === String(guestId)
        ? { ...g, tableId, tableName: resolvedTableName || null }
        : g
    ),
  });

  return { ok: true };
},



  removeGuestFromTable: (tableId, guestId) => {
  const { tables, guests } = get();
  const updatedTables = tables.map((t) =>
    t.id === tableId
      ? {
          ...t,
          seatedGuests: (t.seatedGuests || []).filter(
            (s) => String(s.guestId) !== String(guestId)
          ),
        }
      : t
  );

  const updatedGuests = guests.map((g) =>
    String(g.id ?? g._id) === String(guestId)
      ? { ...g, tableId: null, tableName: null }
      : g
  );

  set({ tables: updatedTables, guests: updatedGuests });
},




  
syncArrivedSeats: (guestId) => {
  // 🔒 רק בלייב
  if (get().seatingMode !== "live") return;

  set((state) => {
    const arrivedCount = Number(
      state.liveArrivals[String(guestId)] ?? 0
    );

    const tables = state.tables.map((table) => {
      if (!Array.isArray(table.seatedGuests)) return table;

      // כל הכיסאות של האורח, ממוינים
      const guestSeats = table.seatedGuests
        .filter(
          (sg) => String(sg.guestId) === String(guestId)
        )
        .sort((a, b) => a.seatIndex - b.seatIndex);

      if (!guestSeats.length) return table;

      // סט של כיסאות שהגיעו בפועל
      const arrivedSeatIndexes = new Set(
        guestSeats
          .slice(0, arrivedCount)
          .map((s) => s.seatIndex)
      );

      const updatedSeats = table.seatedGuests.map((sg) => {
        if (String(sg.guestId) !== String(guestId)) return sg;

        return {
          ...sg,
          arrived: arrivedSeatIndexes.has(sg.seatIndex),
        };
      });

      return {
        ...table,
        seatedGuests: updatedSeats,
      };
    });

    return { tables };
  });
},

syncPlannedSeatsForGuest: (guestId, nextGuestsCount) => {
  set((state) => {
    const gid = String(guestId);

    const tables = state.tables.map((table) => {
      if (!Array.isArray(table.seatedGuests)) return table;

      // כל הכיסאות של האורח בשולחן הזה
      const guestSeats = table.seatedGuests
        .filter((s) => String(s.guestId) === gid)
        .sort((a, b) => a.seatIndex - b.seatIndex);

      // אם אין הושבה – לא נוגעים
      if (guestSeats.length === 0) return table;

      // אם הכמות עדיין תקינה – לא נוגעים
      if (guestSeats.length <= nextGuestsCount) return table;

      // ✂️ כיסאות להשאיר
      const seatsToKeep = new Set(
        guestSeats
          .slice(0, nextGuestsCount)
          .map((s) => s.seatIndex)
      );

      return {
        ...table,
        seatedGuests: table.seatedGuests.filter((s) => {
          // כיסאות של אורח אחר – לא נוגעים
          if (String(s.guestId) !== gid) return true;

          // רק הראשונים נשארים
          return seatsToKeep.has(s.seatIndex);
        }),
      };
    });

    return { tables };
  });
},


resetArrivedSeatsForGuest: (guestId) =>
  set((state) => ({
    tables: state.tables.map((table) => ({
      ...table,
      seatedGuests: (table.seatedGuests || []).map((sg) =>
        String(sg.guestId) === String(guestId)
          ? { ...sg, arrived: false }
          : sg
      ),
    })),
  })),



}));
