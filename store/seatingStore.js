import { create } from "zustand";
import { findFreeBlock } from "../logic/seatingEngine";

export const useSeatingStore = create((set, get) => ({
  /* ---------------- STATE ---------------- */
  tables: [],
  guests: [],

  background: null,

  draggedGuest: null,
  ghostPosition: { x: 0, y: 0 },

  highlightedTable: null,
  highlightedSeats: [],

  selectedGuestId: null,

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
    console.log("🟦 INIT seating:", { tables, guests, background });

    set({
      tables: tables || [],
      guests: guests || [],
      background,
    });
  },

  /* ---------------- ADD TABLE (FIXED) ---------------- */
  addTable: (type, seats) => {
    const { tables } = get();

    const index = tables.length;

    // ⭐ פיזור חכם – שלא יפלו אחד על השני
    const START_X = 300;
    const START_Y = 200;
    const GAP_X = 200;

    const newTable = {
      id: "t" + (index + 1),
      name: `שולחן ${index + 1}`,
      type,
      seats,
      x: START_X + index * GAP_X,
      y: START_Y,
      rotation: 0,
      seatedGuests: [],
    };

    set({
      tables: [...tables, newTable],
    });
  },

  /* ---------------- DELETE TABLE ---------------- */
  deleteTable: (tableId) =>
    set((state) => {
      const updatedGuests = state.guests.map((g) =>
        g.tableId === tableId
          ? { ...g, tableId: null, tableName: null }
          : g
      );

      return {
        tables: state.tables.filter((t) => t.id !== tableId),
        guests: updatedGuests,
        highlightedTable: null,
        highlightedSeats: [],
      };
    }),

  /* ---------------- DRAG START ---------------- */
  startDragGuest: (guest) => {
    set({
      draggedGuest: guest,
      highlightedSeats: [],
      highlightedTable: null,
    });
  },

  updateGhostPosition: (pos) => set({ ghostPosition: pos }),

  /* ---------------- HOVER ---------------- */
  evaluateHover: (pointer) => {
    const { tables, draggedGuest } = get();
    if (!draggedGuest) return;

    const hoveredTable = tables.find((t) => {
      const dx = pointer.x - t.x;
      const dy = pointer.y - t.y;

      const radius =
        t.type === "round"
          ? 90
          : t.type === "square"
          ? 110
          : 160;

      return Math.sqrt(dx * dx + dy * dy) < radius;
    });

    if (!hoveredTable) {
      return set({
        highlightedTable: null,
        highlightedSeats: [],
      });
    }

    const block = findFreeBlock(hoveredTable, draggedGuest.count);

    set({
      highlightedTable: hoveredTable.id,
      highlightedSeats: block || [],
    });
  },

  /* ---------------- DROP ---------------- */
  dropGuest: () => {
    const {
      draggedGuest,
      highlightedTable,
      highlightedSeats,
      tables,
      guests,
    } = get();

    if (!draggedGuest) {
      return set({
        highlightedTable: null,
        highlightedSeats: [],
      });
    }

    // הסרה מוחלטת אם לא הופל על שולחן
    if (!highlightedTable) {
      set({
        tables: tables.map((t) => ({
          ...t,
          seatedGuests: t.seatedGuests.filter(
            (s) => s.guestId !== draggedGuest.id
          ),
        })),
        guests: guests.map((g) =>
          g.id === draggedGuest.id
            ? { ...g, tableId: null, tableName: null }
            : g
        ),
        draggedGuest: null,
        highlightedSeats: [],
      });
      return;
    }

    if (highlightedSeats.length === 0) {
      return set({
        draggedGuest: null,
        highlightedTable: null,
        highlightedSeats: [],
      });
    }

    const cleanedTables = tables.map((t) => ({
      ...t,
      seatedGuests: t.seatedGuests.filter(
        (s) => s.guestId !== draggedGuest.id
      ),
    }));

    const targetTable = tables.find((t) => t.id === highlightedTable);

    const finalTables = cleanedTables.map((t) =>
      t.id === highlightedTable
        ? {
            ...t,
            seatedGuests: [
              ...t.seatedGuests,
              ...highlightedSeats.map((seatIndex) => ({
                guestId: draggedGuest.id,
                seatIndex,
              })),
            ],
          }
        : t
    );

    const updatedGuests = guests.map((g) =>
      g.id === draggedGuest.id
        ? {
            ...g,
            tableId: highlightedTable,
            tableName: targetTable?.name || `שולחן ${highlightedTable}`,
          }
        : g
    );

    set({
      tables: finalTables,
      guests: updatedGuests,
      draggedGuest: null,
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

  /* ---------------- MANUAL ASSIGN ---------------- */
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
