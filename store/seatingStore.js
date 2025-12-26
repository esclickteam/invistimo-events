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
          id: "demo-guest-1",
          _id: "demo-guest-1",
          name: "דנה לוי (דמו)",
          guestsCount: 2,
          tableId: null,
          tableName: null,
        },
        {
          id: "demo-guest-2",
          _id: "demo-guest-2",
          name: "יואב כהן (דמו)",
          guestsCount: 1,
          tableId: null,
          tableName: null,
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

    const cleanedTables = tables.map((t) => ({
      ...t,
      seatedGuests: t.seatedGuests.filter(
        (s) => s.guestId !== draggingGuest.id
      ),
    }));

    const targetTable = cleanedTables.find(
      (t) => t.id === highlightedTable
    );

    targetTable.seatedGuests.push(
      ...highlightedSeats.map((seatIndex) => ({
        guestId: draggingGuest.id,
        seatIndex,
      }))
    );

    set({
      tables: cleanedTables,
      guests: guests.map((g) =>
        g.id === draggingGuest.id
          ? {
              ...g,
              tableId: highlightedTable,
              tableName: targetTable.name,
            }
          : g
      ),
      draggingGuest: null,
      highlightedSeats: [],
      highlightedTable: null,
    });
  },

  /* ---------------- ⭐ ASSIGN BLOCK (CANVAS DRAG) ---------------- */
  assignGuestBlock: ({ guestId, tableId }) => {
    const { tables, guests } = get();
    const guest = guests.find((g) => g.id === guestId);
    const table = tables.find((t) => t.id === tableId);
    if (!guest || !table) return;

    const count =
      guest.guestsCount ||
      guest.count ||
      1;

    const block = findFreeBlock(table, count);
    if (!block) return;

    tables.forEach((t) => {
      t.seatedGuests = t.seatedGuests.filter(
        (s) => s.guestId !== guestId
      );
    });

    table.seatedGuests.push(
      ...block.map((seatIndex) => ({
        guestId,
        seatIndex,
      }))
    );

    guest.tableId = tableId;
    guest.tableName = table.name;

    set({
      tables: [...tables],
      guests: [...guests],
      draggingGuest: null,
      highlightedSeats: [],
      highlightedTable: null,
    });
  },

  /* ---------------- ⭐ DROP ישיר על מושב ---------------- */
  assignGuestToSeat: ({ guestId, tableId, seatIndex }) => {
    const { tables, guests } = get();

    const cleanedTables = tables.map((t) => ({
      ...t,
      seatedGuests: t.seatedGuests.filter(
        (s) => s.guestId !== guestId
      ),
    }));

    const targetTable = cleanedTables.find((t) => t.id === tableId);
    if (!targetTable) return;

    targetTable.seatedGuests.push({ guestId, seatIndex });

    set({
      tables: cleanedTables,
      guests: guests.map((g) =>
        g.id === guestId
          ? { ...g, tableId, tableName: targetTable.name }
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
