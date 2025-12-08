import { create } from "zustand";
import { findFreeBlock } from "../logic/seatingEngine";

export const useSeatingStore = create((set, get) => ({

  /* ---------------- STATE ---------------- */
  tables: [],
  guests: [],

  draggedGuest: null,
  ghostPosition: { x: 0, y: 0 },

  highlightedTable: null,
  highlightedSeats: [],

  showAddModal: false,

  /* ---------------- INIT DATA ---------------- */
  init: (tables, guests) =>
    set({
      tables,
      guests,
    }),

  /* ---------------- MODAL ---------------- */
  setShowAddModal: (v) => set({ showAddModal: v }),

  /* ---------------- DRAG START ---------------- */
  startDragGuest: (guest) =>
    set({
      draggedGuest: guest,
      highlightedTable: null,
      highlightedSeats: [],
    }),

  /* ---------------- DRAG MOVE ---------------- */
  updateGhostPosition: (pos) => set({ ghostPosition: pos }),

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
          : 140;

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

  /* ---------------- DROP GUEST ---------------- */
  dropGuest: () => {
    const {
      draggedGuest,
      highlightedTable,
      highlightedSeats,
      tables,
      guests,
    } = get();

    if (!draggedGuest || !highlightedTable || highlightedSeats.length === 0) {
      return set({
        draggedGuest: null,
        highlightedTable: null,
        highlightedSeats: [],
      });
    }

    let updatedTables = [...tables];

    // שולחן היעד
    const table = updatedTables.find((t) => t.id === highlightedTable);

    // מסירים אותו מכל שולחן קודם
    updatedTables = updatedTables.map((t) => ({
      ...t,
      seatedGuests: t.seatedGuests.filter(
        (s) => s.guestId !== draggedGuest.id
      ),
    }));

    // מוסיפים אותו לשולחן החדש
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

    // עדכון ה־guest עצמו
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

  /* ---------------- REMOVE SEAT ---------------- */
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
