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

  // ⭐ חדש — שולחן שאליו רוצים להוסיף אנשים בלחיצה
  addGuestTable: null,
  setAddGuestTable: (tableId) => set({ addGuestTable: tableId }),

  /* ---------------- INIT DATA ---------------- */
  init: (tables, guests) => {
    console.log("🟦 INIT — Loading tables & guests:", { tables, guests });
    set({
      tables: tables || [],
      guests: guests || [],
    });
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

    console.log("🟩 ADD TABLE — New Table:", newTable);

    set({
      tables: [...tables, newTable],
    });
  },

  /* ---------------- DELETE TABLE ---------------- */
  deleteTable: (tableId) =>
    set((state) => {
      console.log("🗑️ DELETE TABLE:", tableId);

      // הוצאת אורחים מהשולחן
      const updatedGuests = state.guests.map((g) =>
        g.tableId === tableId ? { ...g, tableId: null } : g
      );

      return {
        tables: state.tables.filter((t) => t.id !== tableId),
        guests: updatedGuests,
        highlightedTable: null,
        highlightedSeats: [],
      };
    }),

  /* ---------------- MODAL ---------------- */
  setShowAddModal: (v) => set({ showAddModal: v }),

  /* ---------------- DRAG START ---------------- */
  startDragGuest: (guest) => {
    console.log("🟡 DRAG START — Guest:", guest);
    set({
      draggedGuest: guest,
      highlightedTable: null,
      highlightedSeats: [],
    });
  },

  /* ---------------- DRAG MOVE ---------------- */
  updateGhostPosition: (pos) => set({ ghostPosition: pos }),

  evaluateHover: (pointer) => {
    const { tables, draggedGuest } = get();
    if (!draggedGuest) return;

    const hoveredTable = tables.find((t) => {
      const dx = pointer.x - t.x;
      const dy = pointer.y - t.y;

      const radius =
        t.type === "round" ? 90 :
        t.type === "square" ? 110 :
        140;

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

    console.log("🔵 DROP — Data:", {
      draggedGuest,
      highlightedTable,
      highlightedSeats,
    });

    // CASE 1 – שוחרר לשטח ריק
    if (draggedGuest && !highlightedTable) {
      console.log("🔴 DROP EMPTY — Remove guest from any table");

      const cleanedTables = tables.map((t) => ({
        ...t,
        seatedGuests: t.seatedGuests.filter(
          (s) => s.guestId !== draggedGuest.id
        ),
      }));

      const cleanedGuests = guests.map((g) =>
        g.id === draggedGuest.id ? { ...g, tableId: null } : g
      );

      return set({
        tables: cleanedTables,
        guests: cleanedGuests,
        draggedGuest: null,
        highlightedSeats: [],
        highlightedTable: null,
      });
    }

    // CASE 2 — נתונים חסרים
    if (!draggedGuest || !highlightedTable || highlightedSeats.length === 0) {
      console.log("🔴 DROP CANCELLED — Missing data");
      return set({
        draggedGuest: null,
        highlightedTable: null,
        highlightedSeats: [],
      });
    }

    // CASE 3 — שיבוץ תקין
    let updatedTables = tables.map((t) => ({
      ...t,
      seatedGuests: t.seatedGuests.filter(
        (s) => s.guestId !== draggedGuest.id
      ),
    }));

    const targetTable = updatedTables.find((t) => t.id === highlightedTable);

    updatedTables = updatedTables.map((t) =>
      t.id === targetTable.id
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
      g.id === draggedGuest.id ? { ...g, tableId: targetTable.id } : g
    );

    set({
      tables: updatedTables,
      guests: updatedGuests,
      draggedGuest: null,
      highlightedTable: null,
      highlightedSeats: [],
    });

    console.log("✅ DROP FINISHED");
  },

  /* ---------------- REMOVE SEAT ---------------- */
  removeFromSeat: (tableId, guestId) => {
    console.log("❌ REMOVE SEAT — Table:", tableId, "Guest:", guestId);

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

  /* ---------------- MANUAL TABLE ASSIGN (NEW) ---------------- */
  assignGuestsToTable: (tableId, guestIds) => {
    const { tables, guests } = get();
    const table = tables.find((t) => t.id === tableId);

    if (!table) return;

    guestIds.forEach((guestId) => {
      const guest = guests.find((g) => g.id === guestId);
      if (!guest) return;

      const block = findFreeBlock(table, guest.count);
      if (!block) return;

      // שיבוץ בפועל
      table.seatedGuests.push(
        ...block.map((seatIndex) => ({
          guestId,
          seatIndex,
        }))
      );

      guest.tableId = tableId;
    });

    set({ tables: [...tables], guests: [...guests] });
  },

}));
