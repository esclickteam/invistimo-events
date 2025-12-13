import { create } from "zustand";
import { findFreeBlock } from "../logic/seatingEngine";

export const useSeatingStore = create((set, get) => ({

  /* ============================
     STATE
  ============================ */
  tables: [],
  guests: [],

  draggedGuest: null,
  ghostPosition: { x: 0, y: 0 },

  highlightedTable: null,
  highlightedSeats: [],

  showAddModal: false,

  addGuestTable: null,
  setAddGuestTable: (tableId) => set({ addGuestTable: tableId }),

  /* ============================
     INIT
  ============================ */
  init: (tables, guests) => {
    console.log("🟦 INIT — Loading tables & guests:", { tables, guests });
    set({
      tables: Array.isArray(tables) ? tables : [],
      guests: Array.isArray(guests) ? guests : [],
    });
  },

  /* ============================
     FETCH GUESTS FROM DATABASE
  ============================ */
  fetchGuests: async (invitationId) => {
    try {
      const res = await fetch(`/api/seating/guests/${invitationId}`);
      const data = await res.json();

      if (data.success) {
        console.log("🟩 Loaded guests:", data.guests);
        set({ guests: data.guests });
      } else {
        console.error("⚠ Error loading guests:", data.error);
      }
    } catch (err) {
      console.error("❌ Failed to fetch guests:", err);
    }
  },

  /* ============================
     ADD TABLE
  ============================ */
  addTable: (type, seats) =>
    set((state) => {
      const index = state.tables.length + 1;

      const newTable = {
        id: "t" + index,
        name: `שולחן ${index}`,
        type,
        seats,
        x: 300 + index * 40,
        y: 200,
        seatedGuests: [],
      };

      return {
        tables: [...state.tables, newTable],
      };
    }),

  /* ============================
     DELETE TABLE
  ============================ */
  deleteTable: (tableId) =>
    set((state) => {
      const cleanedTables = state.tables.filter(
        (table) => table.id !== tableId
      );

      return {
        tables: cleanedTables,
        highlightedTable: null,
        highlightedSeats: [],
      };
    }),

  setShowAddModal: (v) => set({ showAddModal: v }),

  /* ============================
     DRAG START
  ============================ */
  startDragGuest: (guest) =>
    set({
      draggedGuest: guest,
      highlightedTable: null,
      highlightedSeats: [],
    }),

  /* ============================
     GHOST POSITION
  ============================ */
  updateGhostPosition: (pos) =>
    set({ ghostPosition: pos }),

  /* ============================
     HOVER TABLE
  ============================ */
  evaluateHover: (pointer) => {
    const { tables, draggedGuest } = get();
    if (!draggedGuest) return;

    const hoveredTable = tables.find((table) => {
      const dx = pointer.x - table.x;
      const dy = pointer.y - table.y;
      const radius =
        table.type === "round" ? 90 :
        table.type === "square" ? 110 :
        140;

      return Math.sqrt(dx * dx + dy * dy) < radius;
    });

    if (!hoveredTable) {
      return set({
        highlightedTable: null,
        highlightedSeats: [],
      });
    }

    const block = findFreeBlock(
      hoveredTable,
      draggedGuest.guestsCount
    );

    set({
      highlightedTable: hoveredTable.id,
      highlightedSeats: block || [],
    });
  },

  /* ============================
     DROP GUEST  ⭐ הקריטי
  ============================ */
  dropGuest: () =>
    set((state) => {
      const {
        draggedGuest,
        highlightedTable,
        highlightedSeats,
        tables,
      } = state;

      if (!draggedGuest) {
        return state;
      }

      /* 1️⃣ הסרה של האורח מכל השולחנות */
      let newTables = tables.map((table) => ({
        ...table,
        seatedGuests: table.seatedGuests.filter(
          (sg) => sg.guestId !== draggedGuest._id
        ),
      }));

      /* 2️⃣ אם שוחרר מחוץ לשולחן */
      if (!highlightedTable || highlightedSeats.length === 0) {
        return {
          ...state,
          tables: newTables,
          draggedGuest: null,
          highlightedTable: null,
          highlightedSeats: [],
        };
      }

      /* 3️⃣ הוספה לשולחן היעד */
      newTables = newTables.map((table) =>
        table.id === highlightedTable
          ? {
              ...table,
              seatedGuests: [
                ...table.seatedGuests,
                ...highlightedSeats.map((seatIndex) => ({
                  guestId: draggedGuest._id,
                  seatIndex,
                })),
              ],
            }
          : table
      );

      return {
        ...state,
        tables: newTables,
        draggedGuest: null,
        highlightedTable: null,
        highlightedSeats: [],
      };
    }),

  /* ============================
     REMOVE FROM SEAT
  ============================ */
  removeFromSeat: (tableId, guestId) =>
    set((state) => ({
      tables: state.tables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              seatedGuests: table.seatedGuests.filter(
                (sg) => sg.guestId !== guestId
              ),
            }
          : table
      ),
    })),

  /* ============================
     ASSIGN GUESTS MANUALLY
  ============================ */
  assignGuestsToTable: (tableId, guestId, count) =>
    set((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) {
        return state;
      }

      const block = findFreeBlock(table, count);
      if (!block) {
        return state;
      }

      const cleanedTables = state.tables.map((t) => ({
        ...t,
        seatedGuests: t.seatedGuests.filter(
          (sg) => sg.guestId !== guestId
        ),
      }));

      const updatedTables = cleanedTables.map((t) =>
        t.id === tableId
          ? {
              ...t,
              seatedGuests: [
                ...t.seatedGuests,
                ...block.map((seatIndex) => ({
                  guestId,
                  seatIndex,
                })),
              ],
            }
          : t
      );

      return {
        tables: updatedTables,
      };
    }),

}));
