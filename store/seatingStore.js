import { create } from "zustand";
import { findFreeBlock } from "../logic/seatingEngine";

export const useSeatingStore = create((set, get) => ({
  /* ======================= STATE ======================= */
  tables: [],
  guests: [],

  background: null,

  draggedGuest: null,
  ghostPosition: { x: 0, y: 0 },

  highlightedTable: null,
  highlightedSeats: [],

  /* ⭐ אורח נבחר – מה־URL */
  selectedGuestId: null,

  showAddModal: false,
  addGuestTable: null,

  /* ======================= BASIC ACTIONS ======================= */
  setAddGuestTable: (tableId) => set({ addGuestTable: tableId }),
  setShowAddModal: (v) => set({ showAddModal: v }),
  setSelectedGuest: (guestId) => set({ selectedGuestId: guestId }),
  clearSelectedGuest: () => set({ selectedGuestId: null }),

  setBackground: (background) => set({ background }),

  setTables: (tables) =>
    set({
      tables: tables || [],
    }),

  /* ======================= INIT ======================= */
  init: (tables, guests, background = null) => {
    console.log("🟦 INIT Seating:", { tables, guests, background });
    set({
      tables: tables || [],
      guests: guests || [],
      background,
    });
  },

  /* ======================= FETCH GUESTS ======================= */
  fetchGuests: async (invitationId) => {
    try {
      const res = await fetch(`/api/seating/guests/${invitationId}`);
      const data = await res.json();

      if (data.success) {
        set({ guests: data.guests });
      }
    } catch (err) {
      console.error("❌ fetchGuests error:", err);
    }
  },

  /* ======================= ADD TABLE ======================= */
  addTable: (type, seats, extra = {}) => {
    const { tables } = get();

    const newTable = {
      id: "t" + Date.now(),
      name: `שולחן ${tables.length + 1}`,
      type,
      seats,

      x: 300 + tables.length * 40,
      y: 200,

      /* ⭐⭐ חדש – לשולחן אבירים בלבד */
      orientation: type === "banquet" ? "horizontal" : undefined,

      /* ⭐⭐ עתידי – אובייקטים מיוחדים */
      elementType: extra.elementType || null, // stage | chuppah | exit

      seatedGuests: [],
    };

    set({ tables: [...tables, newTable] });
  },

  /* ======================= UPDATE ORIENTATION ======================= */
  rotateBanquet: (tableId) => {
    const { tables } = get();

    set({
      tables: tables.map((t) =>
        t.id === tableId && t.type === "banquet"
          ? {
              ...t,
              orientation:
                t.orientation === "horizontal" ? "vertical" : "horizontal",
            }
          : t
      ),
    });
  },

  /* ======================= DELETE TABLE ======================= */
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

  /* ======================= DRAG START ======================= */
  startDragGuest: (guest) => {
    set({
      draggedGuest: guest,
      highlightedSeats: [],
      highlightedTable: null,
    });
  },

  updateGhostPosition: (pos) => set({ ghostPosition: pos }),

  /* ======================= HOVER ======================= */
  evaluateHover: (pointer) => {
    const { tables, draggedGuest } = get();
    if (!draggedGuest) return;

    const hoveredTable = tables.find((t) => {
      const dx = pointer.x - t.x;
      const dy = pointer.y - t.y;

      let radius = 110;
      if (t.type === "round") radius = 90;
      if (t.type === "square") radius = 120;
      if (t.type === "banquet") radius = 160;

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

  /* ======================= DROP ======================= */
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
        draggedGuest: null,
        highlightedSeats: [],
        highlightedTable: null,
      });
    }

    /* ❌ dropped outside */
    if (!highlightedTable || highlightedSeats.length === 0) {
      const cleanedTables = tables.map((t) => ({
        ...t,
        seatedGuests: t.seatedGuests.filter(
          (s) => s.guestId !== draggedGuest.id
        ),
      }));

      const cleanedGuests = guests.map((g) =>
        g.id === draggedGuest.id
          ? { ...g, tableId: null, tableName: null }
          : g
      );

      return set({
        tables: cleanedTables,
        guests: cleanedGuests,
        draggedGuest: null,
        highlightedSeats: [],
        highlightedTable: null,
      });
    }

    const updatedTables = tables.map((t) => ({
      ...t,
      seatedGuests: t.seatedGuests.filter(
        (s) => s.guestId !== draggedGuest.id
      ),
    }));

    const targetTable = tables.find((t) => t.id === highlightedTable);

    const finalTables = updatedTables.map((t) =>
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
            tableName: targetTable?.name || "שולחן",
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

  /* ======================= REMOVE FROM SEAT ======================= */
  removeFromSeat: (guestId) => {
    const { tables, guests } = get();

    set({
      tables: tables.map((t) => ({
        ...t,
        seatedGuests: t.seatedGuests.filter((s) => s.guestId !== guestId),
      })),
      guests: guests.map((g) =>
        g.id === guestId ? { ...g, tableId: null, tableName: null } : g
      ),
    });
  },

  /* ======================= MANUAL ASSIGN ======================= */
  assignGuestsToTable: (tableId, guestId, count) => {
    const { tables, guests } = get();

    const table = tables.find((t) => t.id === tableId);
    const guest = guests.find((g) => g.id === guestId);

    if (!table || !guest)
      return { ok: false, message: "שגיאה בזיהוי" };

    const block = findFreeBlock(table, count);
    if (!block)
      return { ok: false, message: "אין מספיק מקומות" };

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
