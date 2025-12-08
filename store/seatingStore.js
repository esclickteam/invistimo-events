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
  init: (tables, guests) => {
    console.log("🟦 INIT — Loading tables & guests:", { tables, guests });
    set({
      tables: tables || [],
      guests: guests || [],
    });
  },

  /* ---------------- ADD TABLE (חסר!) ---------------- */
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

    console.log("🟠 HOVER — Pointer:", pointer, "Guest:", draggedGuest);

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

    console.log("🟣 HOVER RESULT — Table:", hoveredTable);

    if (!hoveredTable) {
      set({ highlightedTable: null, highlightedSeats: [] });
      return;
    }

    const block = findFreeBlock(hoveredTable, draggedGuest.count);
    console.log("🟢 FREE BLOCK FOUND:", block);

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

    if (!draggedGuest || !highlightedTable || highlightedSeats.length === 0) {
      console.log("🔴 DROP CANCELLED — Missing data");
      return set({
        draggedGuest: null,
        highlightedTable: null,
        highlightedSeats: [],
      });
    }

    let updatedTables = [...tables];
    const targetTable = updatedTables.find((t) => t.id === highlightedTable);

    console.log("🟤 TARGET TABLE BEFORE UPDATE:", targetTable);

    updatedTables = updatedTables.map((t) => ({
      ...t,
      seatedGuests: t.seatedGuests.filter(
        (s) => s.guestId !== draggedGuest.id
      ),
    }));

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

    console.log("🟧 TABLE UPDATED:", updatedTables);

    const updatedGuests = guests.map((g) =>
      g.id === draggedGuest.id ? { ...g, tableId: targetTable.id } : g
    );

    console.log("🟨 GUEST UPDATED:", updatedGuests);

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

    console.log("🧹 CLEANUP RESULT:", { updatedTables, updatedGuests });

    set({
      tables: updatedTables,
      guests: updatedGuests,
    });
  },
}));
