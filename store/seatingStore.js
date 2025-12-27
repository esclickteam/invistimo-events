import { create } from "zustand";
import { findFreeBlock } from "../logic/seatingEngine";

export const useSeatingStore = create((set, get) => ({
  /* ---------------- STATE ---------------- */
  tables: [],
  guests: [],

  background: null,

   demoMode: false, // ⭐ מצב דמו

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

  setTables: (tables) =>
    set(() => ({
      tables: tables || [],
    })),

  /* ---------------- INIT ---------------- */
  init: (tables, guests, background = null) => {
    set({
      tables: tables || [],
      guests: guests || [],
      background,
    });
  },

  /* ---------------- DEMO INIT ---------------- */
initDemo: () => {
  set({
    demoMode: true,

    tables: [
      {
        id: "demo-table-1",
        name: "שולחן דמו",
        type: "round",
        seats: 10,
        x: 450,
        y: 300,
        rotation: 0,
        seatedGuests: [],
      },
    ],

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
    id: crypto.randomUUID(), // ✅ קריטי – ID ייחודי באמת
    name: `שולחן ${tables.length + 1}`,
    type,
    seats,
    x: position?.x ?? 0,     // ✅ מיקום גמיש
    y: position?.y ?? 0,
    rotation: 0,
    seatedGuests: [],
  };

  set({
    tables: [...tables, newTable], // ✅ append אמיתי
  });

  return newTable; // אופציונלי, אבל שימושי ל-auto pan
},

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
      draggingGuest.guestsCount ||
      draggingGuest.count ||
      1;

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
        })),
      ],
    };
  });

  const targetTable = updatedTables.find(
    (t) => t.id === highlightedTable
  );

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

  const count = guest.guestsCount || guest.count || 1;

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
        seatedGuests: t.seatedGuests.filter(
          (s) => s.guestId !== guestId
        ),
      })),
      guests: guests.map((g) =>
        g.id === guestId
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
  const guest = guests.find((g) => g.id === guestId);

  if (!table || !guest) {
    return { ok: false, message: "שגיאה בזיהוי שולחן / אורח" };
  }

  // ✅ תיקון קריטי:
  // לא לכפות seatIndex = 0
  // אם לא הגיע seatIndex – נותנים ל-engine לבחור לבד
  const startIndex =
    typeof seatIndex === "number" ? seatIndex : undefined;

  const block = findFreeBlock(table, count, startIndex);

  // guard חובה
  if (!block || block.length === 0) {
    return { ok: false, message: "אין מספיק מקומות פנויים" };
  }

  // ניקוי הושבות קודמות של האורח מכל השולחנות
  tables.forEach((t) => {
    t.seatedGuests = t.seatedGuests.filter(
      (s) => s.guestId !== guestId
    );
  });

  // ✅ כאן נוצר seatIndex לכל מושב – זה מה שצובע באפור
  table.seatedGuests.push(
    ...block.map((seatIndex) => ({
      guestId,
      seatIndex,
    }))
  );

  // עדכון האורח
  guest.tableId = tableId;
  guest.tableName = table.name;

  set({
    tables: [...tables],
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
}));
