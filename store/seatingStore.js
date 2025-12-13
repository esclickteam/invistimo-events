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

  /* ⭐ אורח נבחר – מגיע מה־URL */
  selectedGuestId: null,

  showAddModal: false,
  addGuestTable: null,

  /* ---------------- ACTIONS ---------------- */
  setAddGuestTable: (tableId) => set({ addGuestTable: tableId }),
  setShowAddModal: (v) => set({ showAddModal: v }),
  setSelectedGuest: (guestId) => set({ selectedGuestId: guestId }),
  clearSelectedGuest: () => set({ selectedGuestId: null }),

  /* ---------------- INIT ---------------- */
  init: (tables, guests) => {
    console.log("🟦 INIT — Loading tables & guests:", { tables, guests });
    set({
      tables: tables || [],
      guests: guests || [],
    });
  },

  /* ---------------- FETCH GUESTS ---------------- */
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

  /* ---------------- ADD TABLE ---------------- */
  addTable: (type, seats) => {
    const { tables } = get();

    const newTable = {
      id: "t" + (tables.length + 1),
      name: `שולחן ${tables.length + 1}`,
      type,
      seats,
      x: 300 + tables.length * 40,
      y: 200,
      seatedGuests: [],
    };

    set({ tables: [...tables, newTable] });
  },

  /* ---------------- DELETE TABLE ---------------- */
  deleteTable: (tableId) =>
    set((state) => {
      const updatedGuests = state.guests.map((g) =>
        g.tableId === tableId ? { ...g, tableId: null, tableName: null } : g
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

  /* ---------------- HOVER TABLE ---------------- */
  evaluateHover: (pointer) => {
    const { tables, draggedGuest } = get();
    if (!draggedGuest) return;

    const hoveredTable = tables.find((t) => {
      const dx = pointer.x - t.x;
      const dy = pointer.y - t.y;
      const radius = t.type === "round" ? 90 : t.type === "square" ? 110 : 140;
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

    if (draggedGuest && !highlightedTable) {
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
      });
    }

    if (!draggedGuest || !highlightedTable || highlightedSeats.length === 0) {
      return set({
        draggedGuest: null,
        highlightedTable: null,
        highlightedSeats: [],
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

    const updatedTables = tables.map((t) => ({
      ...t,
      seatedGuests: t.seatedGuests.filter((s) => s.guestId !== guestId),
    }));

    const updatedGuests = guests.map((g) =>
      g.id === guestId ? { ...g, tableId: null, tableName: null } : g
    );

    set({ tables: updatedTables, guests: updatedGuests });
  },

  /* ---------------- ASSIGN MANUALLY ---------------- */
  assignGuestsToTable: (tableId, guestId, count) => {
    const { tables, guests } = get();

    const table = tables.find((t) => t.id === tableId);
    const guest = guests.find((g) => g.id === guestId);

    if (!table || !guest)
      return { ok: false, message: "שגיאה בזיהוי אורח / שולחן" };

    const block = findFreeBlock(table, count);
    if (!block)
      return { ok: false, message: "אין מספיק מקומות פנויים בשולחן" };

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
    guest.tableName = table.name || `שולחן ${tableId}`;

    set({
      tables: [...tables],
      guests: [...guests],
    });

    return { ok: true };
  },
}));
