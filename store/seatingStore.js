import { create } from "zustand";
import { findFreeBlock } from "../logic/seatingEngine";

export const useSeatingStore = create((set, get) => ({
  tables: [],
  guests: [],

  draggedGuest: null,
  ghostPosition: { x: 0, y: 0 },

  highlightedTable: null,
  highlightedSeats: [],

  /* --------------------- INIT REAL DATA --------------------- */
  init: (tables, guests) =>
    set({
      tables,
      guests,
    }),

  /* --------------------- DRAG START --------------------- */
  startDragGuest: (guest) =>
    set({
      draggedGuest: guest,
      highlightedTable: null,
      highlightedSeats: [],
    }),

  /* --------------------- DRAG MOVE --------------------- */
  updateGhostPosition: (pos) => set({ ghostPosition: pos }),

  evaluateHover: (pointer) => {
    const { tables, draggedGuest } = get();
    if (!draggedGuest) return;

    // מזהה איזה שולחן אנו מרחפים מעליו
    const hoveredTable = tables.find((t) => {
      const dx = pointer.x - t.x;
      const dy = pointer.y - t.y;
      const radius =
        t.type === "round"
          ? 90
          : t.type === "square"
          ? 110
          : 140; // banquet

      return Math.sqrt(dx * dx + dy * dy) < radius;
    });

    if (!hoveredTable) {
      return set({
        highlightedTable: null,
        highlightedSeats: [],
      });
    }

    // מוצא בלוק פנוי
    const block = findFreeBlock(hoveredTable, draggedGuest.count);

    set({
      highlightedTable: hoveredTable.id,
      highlightedSeats: block || [],
    });
  },

  /* --------------------- DROP GUEST --------------------- */
  dropGuest: () => {
    const {
      draggedGuest,
      highlightedTable,
      highlightedSeats,
      tables,
      guests,
    } = get();

    // אין לאן לשבץ
    if (!draggedGuest || !highlightedTable || highlightedSeats.length === 0) {
      return set({
        draggedGuest: null,
        highlightedTable: null,
        highlightedSeats: [],
      });
    }

    let updatedTables = [...tables];

    const table = updatedTables.find((t) => t.id === highlightedTable);

    // אם האורח כבר ישב בשולחן אחר — מסירים אותו משם
    updatedTables = updatedTables.map((t) => ({
      ...t,
      seatedGuests: t.seatedGuests.filter(
        (s) => s.guestId !== draggedGuest.id
      ),
    }));

    // משבצים לשולחן החדש
    updatedTables = updatedTables.map((t) =>
      t.id === table.id
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

    // עדכון guest.tableId
    const updatedGuests = guests.map((g) =>
      g.id === draggedGuest.id ? { ...g, tableId: table.id } : g
    );

    set({
      tables: updatedTables,
      guests: updatedGuests,
      draggedGuest: null,
      highlightedTable: null,
      highlightedSeats: [],
    });
  },

  /* --------------------- REMOVE FROM SEAT --------------------- */
  removeFromSeat: (tableId, guestId) => {
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
      g.id === guestId ? { ...g, tableId: null } : g
    );

    set({
      tables: updatedTables,
      guests: updatedGuests,
    });
  },
}));
