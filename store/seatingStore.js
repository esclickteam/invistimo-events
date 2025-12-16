import { create } from "zustand";
import { findFreeBlock } from "../logic/seatingEngine";

export const useSeatingStore = create((set, get) => ({
  /* ---------------- STATE ---------------- */
  tables: [],
  guests: [],

  background: null,

  /* ⭐ יישור שם */
  draggingGuest: null,
  ghostPosition: { x: 0, y: 0 },

  highlightedTable: null,
  highlightedSeats: [],

  selectedGuestId: null,

  /* ⭐ מודל הושבה */
  seatingModalTableId: null,
  showSeatingModal: false,

  showAddModal: false,
  addGuestTable: null,

  /* ---------------- ACTIONS ---------------- */
  setAddGuestTable: (tableId) => set({ addGuestTable: tableId }),
  setShowAddModal: (v) => set({ showAddModal: v }),
  setSelectedGuest: (guestId) => set({ selectedGuestId: guestId }),
  clearSelectedGuest: () => set({ selectedGuestId: null }),

  setBackground: (background) => set({ background }),

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

  /* ---------------- ADD TABLE ---------------- */
  addTable: (type, seats) => {
    const { tables } = get();
    const index = tables.length;

    const newTable = {
      id: "t" + (index + 1),
      name: `שולחן ${index + 1}`,
      type,
      seats,
      x: 300 + index * 200,
      y: 200,
      rotation: 0,
      seatedGuests: [],
    };

    set({ tables: [...tables, newTable] });
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
      draggingGuest: guest,
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

    const block = findFreeBlock(hoveredTable, draggingGuest.count);

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

  /* ---------------- MANUAL ASSIGN (MODAL) ---------------- */
  assignGuestsToTable: (tableId, guestId, count) => {
    const { tables, guests } = get();

    const table = tables.find((t) => t.id === tableId);
    const guest = guests.find((g) => g.id === guestId);

    if (!table || !guest)
      return { ok: false, message: "שגיאה בזיהוי שולחן / אורח" };

    const block = findFreeBlock(table, count);
    if (!block)
      return { ok: false, message: "אין מספיק מקומות פנויים" };

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
    });

    return { ok: true };
  },
}));
