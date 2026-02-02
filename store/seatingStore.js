import { create } from "zustand";
import { findFreeBlock } from "../logic/seatingEngine";

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
setSeatingMode: (mode) => set({ seatingMode: mode }),


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
  set((state) => ({
    liveArrivals: {
      ...state.liveArrivals,
      [guestId]: count,
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

  return Number(guest.arrivedCount ?? 0);
},



getSeatingCountForGuest: (guest) => {
  if (get().seatingMode === "live") {
    return Number(
      get().liveArrivals[String(guest.id ?? guest._id)] ?? 0
    );
  }

  return Number(guest.arrivedCount ?? 0);
},


getPlannedSeatCount: (guest) => {
  return Number(guest.guestsCount ?? 0);
},



getFreeSeats: (tableId) => {
  const table = get().tables.find((t) => t.id === tableId);
  if (!table) return 0;

  const occupied = table.seatedGuests.length;


  return Math.max(0, table.seats - occupied);
},



canSeatGuestAtTable: (tableId, guest) => {
  const needed = get().getPlannedSeatCount(guest);
  if (needed <= 0) return false;

  const free = get().getFreeSeats(tableId);
  return free >= needed;
},


canSeatGroupAtTable: (tableId, groupId) => {
  const { guests, getPlannedSeatCount, getFreeSeats } = get();

  const groupGuests = guests.filter(
    (g) => String(g.groupId) === String(groupId)
  );

  if (!groupGuests.length) return false;

  const needed = groupGuests.reduce(
    (sum, g) => sum + getPlannedSeatCount(g),
    0
  );

  const free = getFreeSeats(tableId);
  return free >= needed;
},


canSeatGuests: (tableId, guest) => {
  const { tables } = get();
  const table = tables.find((t) => t.id === tableId);
  if (!table) return false;

  const count = get().getPlannedSeatCount(guest);
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
  const { groups, guests, tables } = get();

  const group = groups.find((g) => g._id === groupId);
  if (!group) return { ok: false };

  const groupGuests = guests.filter(
    (g) => g.groupId === groupId
  );





const totalCount = groupGuests.reduce(
  (sum, g) => sum + get().getPlannedSeatCount(g),
  0
);






  if (totalCount === 0) {
    return { ok: false, message: "אין מוזמנים בקבוצה" };
  }

  // ניקוי קודם של הקבוצה מכל השולחנות
 let updatedTables = tables.map((t) => ({
  ...t,
  seatedGuests: (t.seatedGuests || []).filter(
    (sg) =>
      sg.groupId !== groupId // ⬅️ זה השינוי
  ),
}));

  const targetTable = updatedTables.find(
    (t) => t.id === tableId
  );
  if (!targetTable) {
    return { ok: false, message: "שולחן לא נמצא" };
  }

  const block = findFreeBlock(targetTable, totalCount);
  if (!block) {
    return { ok: false, message: "אין מספיק מקומות פנויים" };
  }

  let cursor = 0;

const newSeats = groupGuests.flatMap((guest) => {
  const count = get().getPlannedSeatCount(guest);
  const seats = block.slice(cursor, cursor + count);
  cursor += count;

  return seats.map((seatIndex) => ({
    guestId: String(guest.id ?? guest._id),
    seatIndex,
    arrived: false,
    groupId,
  }));
});





  updatedTables = updatedTables.map((t) =>
  t.id === tableId
    ? {
        ...t,
        seatedGuests: [
          ...t.seatedGuests,
          ...newSeats,
        ],
        // ⭐ זה השורה הקריטית
        displayName: t.displayName || group.name,
      }
    : t
);

  set({
    tables: updatedTables,
    guests: guests.map((g) =>
      g.groupId === groupId
        ? {
            ...g,
            tableId,
            tableName: targetTable.name,
          }
        : g
    ),
    groups: groups.map((g) =>
      g._id === groupId
        ? { ...g, tableId, isSeated: true }
        : g
    ),
  });

  console.log("🟢 seatGroup AFTER set");
console.table(
  updatedTables.map((t) => ({
    id: t.id,
    name: t.name,
    displayName: t.displayName,
  }))
);


  return { ok: true };
},


unseatGroup: (groupId) => {
  const { tables, guests, groups } = get();

  set({
    tables: tables.map((t) => ({
      ...t,
      seatedGuests: (t.seatedGuests || []).filter(
        (sg) => sg.groupId !== groupId
      ),
    })),
    guests: guests.map((g) =>
      g.groupId === groupId
        ? { ...g, tableId: null, tableName: null }
        : g
    ),
    groups: groups.map((g) =>
      g._id === groupId
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
  });
},




  /* ---------------- INIT ---------------- */
init: (tables, guests, background = null, canvasView = null) => {
  const seatingMode = get().seatingMode;

  set((state) => ({
    ...state,

    // ⬅️ לטעון את ההושבה בדיוק כמו שהיא מהשרת
    tables: (tables || []).map((t) => ({
      ...t,
      displayName: t.displayName || "",
      seatedGuests: t.seatedGuests || [], // ❌ בלי arrived=false
    })),

    guests: guests || [],

    // ⬅️ Live: רק מפת הגעה, לא נגיעה בהושבה
    liveArrivals:
      seatingMode === "live"
        ? Object.fromEntries(
            (guests || []).map((g) => [
              String(g.id ?? g._id),
              Number(g.actualArrivedCount ?? 0),
            ])
          )
        : {},

    background,
    canvasView: canvasView || { scale: 1, x: 0, y: 0 },
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
    displayName: t.displayName,
  }))
);


  set({
    tables: (snapshot.tables || []).map((t) => ({
      ...t,
      displayName: t.displayName || "",
      seatedGuests: (t.seatedGuests || []).map((sg) => ({
        ...sg,
        arrived: sg.arrived ?? false, // ⭐⭐ זה החסר
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
  set({
    demoMode: true,


    guests: [
  {
    id: "1",
    _id: "1",
    name: "אורן לוי",
    guestsCount: 2,
    confirmedGuestsCount: 2, // מגיעים
    confirmed: true,
    tableId: "table-5",
    tableName: "5",
  },
  {
    id: "2",
    _id: "2",
    name: "נועה כהן",
    guestsCount: 1,
    confirmedGuestsCount: 0, // ממתינה
    confirmed: false,
    tableId: undefined,
    tableName: undefined,
  },
  {
    id: "3",
    _id: "3",
    name: "דניאל לוי",
    guestsCount: 3,
    confirmedGuestsCount: 3,
    confirmed: true,
    tableId: "table-3",
    tableName: "3",
  },
  {
    id: "4",
    _id: "4",
    name: "מאיה ישראלי",
    guestsCount: 1,
    confirmedGuestsCount: 0, // לא מגיעה
    confirmed: false,
    tableId: undefined,
    tableName: undefined,
  },
  {
    id: "5",
    _id: "5",
    name: "יוסי כהן",
    guestsCount: 1,
    confirmedGuestsCount: 1,
    confirmed: true,
    tableId: "table-1",
    tableName: "1",
  },
  {
    id: "6",
    _id: "6",
    name: "שירה לוי",
    guestsCount: 2,
    confirmedGuestsCount: 0,
    confirmed: false,
    tableId: undefined,
    tableName: undefined,
  },
  {
    id: "7",
    _id: "7",
    name: "אלון פרץ",
    guestsCount: 2,
    confirmedGuestsCount: 2,
    confirmed: true,
    tableId: "table-2",
    tableName: "2",
  },
  {
    id: "8",
    _id: "8",
    name: "רוני אברהם",
    guestsCount: 1,
    confirmedGuestsCount: 0,
    confirmed: false,
    tableId: undefined,
    tableName: undefined,
  },
  {
    id: "9",
    _id: "9",
    name: "תמר כהן",
    guestsCount: 1,
    confirmedGuestsCount: 1,
    confirmed: true,
    tableId: "table-3",
    tableName: "3",
  },
  {
    id: "10",
    _id: "10",
    name: "איתי רוזן",
    guestsCount: 2,
    confirmedGuestsCount: 0,
    confirmed: false,
    tableId: undefined,
    tableName: undefined,
  },
],

background: null,

  });
},


  /* ---------------- ADD TABLE ---------------- */
  addTable: (type, seats, position) => {
  const { tables } = get();

  const newTable = {
  id: crypto.randomUUID(),
  name: `שולחן ${tables.length + 1}`,
  displayName: "",          // ⭐️ חדש
  type,
  seats,
  x: position?.x ?? 0,
  y: position?.y ?? 0,
  rotation: 0,
  seatedGuests: [],
};

  set({
    tables: [...tables, newTable], // ✅ append אמיתי
  });

  return newTable; // אופציונלי, אבל שימושי ל-auto pan
},

/* ---------------- UPDATE TABLE DISPLAY NAME ---------------- */
updateTableDisplayName: (tableId, displayName) =>
  set((state) => ({
    tables: state.tables.map((t) =>
      t.id === tableId
        ? { ...t, displayName }
        : t
    ),
  })),


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

const count = get().getPlannedSeatCount(draggingGuest);





if (count === 0) return;

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

  

  set({
    tables: updatedTables,
    guests: guests.map((g) =>
      String(g.id ?? g._id) === guestId
        ? {
            ...g,
            tableId: highlightedTable,
            tableName: targetTable?.name,
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


const count = get().getPlannedSeatCount(guest)




if (count === 0) return;


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

  set({
    tables: updatedTables,
    guests: guests.map((g) =>
      String(g.id ?? g._id) === String(guestId)
        ? {
            ...g,
            tableId,
            tableName: targetTable?.name,
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

  const targetTable = updatedTables.find((t) => t.id === tableId);

  set({
    tables: updatedTables,
    guests: guests.map((g) =>
      String(g.id ?? g._id) === String(guestId)
        ? {
            ...g,
            tableId,
            tableName: targetTable?.name,
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


  if (!table || !guest) {
    return { ok: false, message: "שגיאה בזיהוי שולחן / אורח" };
  }


const { liveArrivals } = get();

const realCount = get().getPlannedSeatCount(guest)



if (get().seatingMode === "live" && realCount === 0) {
  return { ok: false, message: "האורח לא הגיע בפועל" };
}






  // ⭐️ שולחן נקי – בלי המושבים הקודמים של האורח
const cleanTable = {
  ...table,
  seatedGuests: table.seatedGuests.filter(
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
  (s) => s.guestId !== guestId
),
}));



  // עדכון האורח
  guest.tableId = tableId;
  guest.tableName = table.name;

  set({
  tables: updatedTables.map((t) =>
    t.id === tableId
      ? {
          ...t,
          seatedGuests: [
            ...t.seatedGuests,
            ...block.map((seatIndex) => ({
              guestId,
              seatIndex,
              arrived: false,
            })),
          ],
        }
      : t
  ),
  guests: [...guests],
});

  return { ok: true };
},


  removeGuestFromTable: (tableId, guestId) => {
    const { tables, guests } = get();
    const updatedTables = tables.map((t) =>
      t.id === tableId
        ? {
            ...t,
            seatedGuests: t.seatedGuests.filter(
              (s) => s.guestId !== guestId
            ),
          }
        : t
    );
    const updatedGuests = guests.map((g) =>
      g.id === guestId ? { ...g, tableId: null, tableName: null } : g
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
