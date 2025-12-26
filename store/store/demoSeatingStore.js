import { create } from "zustand";
import { findFreeBlock } from "@/logic/seatingEngine";

/**
 * Demo-only seating store (NO persist).
 * Separate instance so demo never pollutes the real store.
 */
export const useDemoSeatingStore = create((set, get) => ({
  /* ---------------- STATE ---------------- */
  tables: [],
  guests: [],
  background: null,
  demoMode: true,

  draggingGuest: null,
  ghostPosition: { x: 0, y: 0 },

  highlightedTable: null,
  highlightedSeats: [],

  selectedGuestId: null,

  seatingModalTableId: null,
  showSeatingModal: false,

  showAddModal: false,
  addGuestTable: null,

  canvasView: {
    scale: 1,
    x: 0,
    y: 0,
  },

  /* ---------------- ACTIONS ---------------- */
  setDemoMode: (isDemo) => set({ demoMode: !!isDemo }),

  init: (tables, guests, background = null) =>
    set({
      tables: Array.isArray(tables) ? tables : [],
      guests: Array.isArray(guests) ? guests : [],
      background,

      // ✅ דמו תמיד ON
      demoMode: true,

      // ✅ איפוס מצב UI כדי שלא "יידבק"
      draggingGuest: null,
      ghostPosition: { x: 0, y: 0 },
      highlightedTable: null,
      highlightedSeats: [],
      selectedGuestId: null,
      seatingModalTableId: null,
      showSeatingModal: false,
      showAddModal: false,
      addGuestTable: null,

      // ✅ איפוס view
      canvasView: { scale: 1, x: 0, y: 0 },
    }),

  resetDemo: () =>
    set({
      tables: [],
      guests: [],
      background: null,
      demoMode: true,

      draggingGuest: null,
      ghostPosition: { x: 0, y: 0 },

      highlightedTable: null,
      highlightedSeats: [],

      selectedGuestId: null,

      seatingModalTableId: null,
      showSeatingModal: false,

      showAddModal: false,
      addGuestTable: null,

      canvasView: { scale: 1, x: 0, y: 0 },
    }),

  setBackground: (background) => set({ background }),

  setCanvasView: (view) =>
    set({
      canvasView: view || { scale: 1, x: 0, y: 0 },
    }),

  setSelectedGuest: (guestId) => set({ selectedGuestId: guestId }),
  clearSelectedGuest: () => set({ selectedGuestId: null }),

  setShowAddModal: (v) => set({ showAddModal: !!v }),
  setAddGuestTable: (tableId) => set({ addGuestTable: tableId || null }),

  openSeatingModal: (tableId) =>
    set({ seatingModalTableId: tableId, showSeatingModal: true }),

  closeSeatingModal: () =>
    set({ seatingModalTableId: null, showSeatingModal: false }),

  /* ---------------- DRAG START / END ---------------- */
  startDragGuest: (guest) =>
    set({
      draggingGuest: { ...guest, __isDragging: true },
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

    const count = draggingGuest.guestsCount || draggingGuest.count || 1;
    const block = findFreeBlock(hoveredTable, count);

    set({
      highlightedTable: hoveredTable.id,
      highlightedSeats: block || [],
    });
  },

  /* ---------------- ASSIGN (CANVAS DRAG / DROP) ---------------- */
  assignGuestBlock: ({ guestId, tableId }) => {
    const { tables, guests } = get();

    const guest = guests.find(
      (g) => String(g.id ?? g._id) === String(guestId)
    );
    const table = tables.find((t) => String(t.id) === String(tableId));
    if (!guest || !table) return;

    const count = guest.guestsCount || guest.count || 1;
    const block = findFreeBlock(table, count);
    if (!block || block.length === 0) return;

    // remove previous seating for that guest
    tables.forEach((t) => {
      t.seatedGuests = (t.seatedGuests || []).filter(
        (s) => String(s.guestId) !== String(guestId)
      );
    });

    table.seatedGuests = table.seatedGuests || [];
    table.seatedGuests.push(
      ...block.map((seatIndex) => ({
        guestId: guest.id ?? guest._id,
        seatIndex,
      }))
    );

    guest.tableId = table.id;
    guest.tableName = table.name;

    set({
      tables: [...tables],
      guests: [...guests],
      draggingGuest: null,
      highlightedSeats: [],
      highlightedTable: null,
    });
  },

  assignGuestToSeat: ({ guestId, tableId, seatIndex }) => {
    const { tables, guests } = get();

    const cleanedTables = tables.map((t) => ({
      ...t,
      seatedGuests: (t.seatedGuests || []).filter(
        (s) => String(s.guestId) !== String(guestId)
      ),
    }));

    const targetTable = cleanedTables.find(
      (t) => String(t.id) === String(tableId)
    );
    if (!targetTable) return;

    targetTable.seatedGuests = targetTable.seatedGuests || [];
    targetTable.seatedGuests.push({ guestId, seatIndex });

    set({
      tables: cleanedTables,
      guests: guests.map((g) =>
        String(g.id ?? g._id) === String(guestId)
          ? { ...g, tableId, tableName: targetTable.name }
          : g
      ),
      draggingGuest: null,
      highlightedSeats: [],
      highlightedTable: null,
    });
  },

  removeFromSeat: (guestId) => {
    const { tables, guests } = get();

    set({
      tables: tables.map((t) => ({
        ...t,
        seatedGuests: (t.seatedGuests || []).filter(
          (s) => String(s.guestId) !== String(guestId)
        ),
      })),
      guests: guests.map((g) =>
        String(g.id ?? g._id) === String(guestId)
          ? { ...g, tableId: null, tableName: null }
          : g
      ),
    });
  },
}));
