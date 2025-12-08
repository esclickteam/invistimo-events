import { create } from "zustand";
import { findFreeBlock } from "../logic/seatingEngine";

export const useSeatingStore = create((set, get) => ({
  tables: [],
  guests: [],

  draggedGuest: null,
  ghostPosition: { x: 0, y: 0 },

  highlightedTable: null,
  highlightedSeats: [],

  /* --------------------- INIT DATA --------------------- */
  setInitialData: (tables, guests) =>
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

    // מזהה איזה שולחן העכבר נמצא מעליו
    const hoveredTable = tables.find((t) => {
      const dx = pointer.x - t.x;
      const dy = pointer.y - t.y;
      const radius =
        t.type === "round" ? 90 : t.type === "square" ? 110 : 140;
      return Math.sqrt(dx * dx + dy * dy) < radius;
    });

    if (!hoveredTable) {
      set({
        highlightedTable: null,
        highlightedSeats: [],
      });
      return;
    }

    // מוצא את הבלוק הפנוי
    const block = findFreeBlock(hoveredTable, draggedGuest.count);

    set({
      highlightedTable: hoveredTable.id,
      highlightedSeats: block || [],
    });
  },

  /* --------------------- DROP --------------------- */
  dropGuest: () => {
    const {
      draggedGuest,
      highlightedTable,
      highlightedSeats,
      tables,
      guests,
    } = get();

    if (!draggedGuest || !highlightedTable || highlightedSeats.length === 0)
      return set({
        draggedGuest: null,
        highlightedTable: null,
        highlightedSeats: [],
      });

    const table = tables.find((t) => t.id === highlightedTable);

    // אם האורח כבר הוקצה לשולחן אחר — מחיקה קודם
    const previousTable = tables.find((t) =>
      t.seatedGuests?.some((s) => s.guestId === draggedGuest.id)
    );

    let updatedTables = [...tables];

    if (previousTable) {
      updatedTables = updatedTables.map((t) =>
        t.id === previousTable.id
          ? {
              ...t,
              seatedGuests: t.seatedGuests.filter(
                (s) => s.guestId !== draggedGuest.id
              ),
            }
          : t
      );
    }

    // הוספה לשולחן החדש
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

    // עדכון ה־guest.tableId
    const updatedGuests = guests.map((g) =>
      g.id === draggedGuest.id
        ? { ...g, tableId: table.id }
        : g
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
