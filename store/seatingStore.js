import { create } from "zustand";
import { findFreeBlock } from "../logic/seatingEngine";

export const useSeatingStore = create((set, get) => ({

  /* ================= STATE ================= */
  tables: [],
  guests: [],

  draggedGuest: null,
  ghostPosition: { x: 0, y: 0 },

  highlightedTable: null,
  highlightedSeats: [],

  /* ⭐ אורח נבחר (סיידבר / פוקוס) */
  selectedGuestId: null,

  setSelectedGuest: (guestId) =>
    set({
      selectedGuestId:
        guestId !== undefined && guestId !== null
          ? guestId.toString()
          : null,
      highlightedSeats: [],
    }),

  clearSelectedGuest: () =>
    set({
      selectedGuestId: null,
      highlightedTable: null,
      highlightedSeats: [],
    }),

  /* ================= MODALS ================= */
  showAddModal: false,
  setShowAddModal: (v) => set({ showAddModal: !!v }),

  addGuestTable: null,
  setAddGuestTable: (tableId) =>
    set({
      addGuestTable:
        tableId !== undefined && tableId !== null
          ? tableId.toString()
          : null,
    }),

  /* ================= INIT ================= */
  init: (tables, guests) => {
    set({
      tables: Array.isArray(tables)
        ? tables.map((t) => ({
            ...t,
            id: t?.id ?? t?._id ?? "",
            name: typeof t?.name === "string" ? t.name : "",
            seats: Number(t?.seats) || 0,
            x: Number(t?.x) || 0,
            y: Number(t?.y) || 0,
            seatedGuests: Array.isArray(t?.seatedGuests)
              ? t.seatedGuests
              : [],
          }))
        : [],
      guests: Array.isArray(guests) ? guests : [],
    });
  },

  /* ================= FETCH GUESTS ================= */
  fetchGuests: async (invitationId) => {
    try {
      const res = await fetch(`/api/seating/guests/${invitationId}`);
      const data = await res.json();

      if (data?.success && Array.isArray(data.guests)) {
        set({ guests: data.guests });
      }
    } catch (err) {
      console.error("❌ Failed to fetch guests:", err);
    }
  },

  /* ================= ADD TABLE ================= */
  addTable: (type, seats) => {
    const { tables } = get();

    const id = `t${tables.length + 1}`;

    const newTable = {
      id,
      name: `שולחן ${tables.length + 1}`,
      type: type === "square" ? "square" : "round",
      seats: Number(seats) || 0,
      x: 300 + tables.length * 40,
      y: 200,
      seatedGuests: [],
    };

    set({ tables: [...tables, newTable] });
  },

  /* ================= UPDATE TABLE POSITION ================= */
  updateTablePosition: (tableId, x, y) =>
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId
          ? { ...t, x: Number(x), y: Number(y) }
          : t
      ),
    })),

  /* ================= DELETE TABLE ================= */
  deleteTable: (tableId) =>
    set((state) => ({
      tables: state.tables.filter((t) => t.id !== tableId),
      guests: state.guests.map((g) =>
        g?.tableId === tableId ? { ...g, tableId: null } : g
      ),
      highlightedTable: null,
      highlightedSeats: [],
      selectedGuestId: null,
    })),

  /* ================= DRAG GUEST ================= */
  startDragGuest: (guest) => {
    if (!guest || !guest._id) return;

    set({
      draggedGuest: guest,
      selectedGuestId: guest._id.toString(),
      highlightedTable: null,
      highlightedSeats: [],
    });
  },

  updateGhostPosition: (pos) => {
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return;
    set({ ghostPosition: pos });
  },

  /* ================= HOVER ================= */
  evaluateHover: (pointer) => {
    const { tables, draggedGuest } = get();
    if (!draggedGuest || !pointer) return;

    const hoveredTable = tables.find((t) => {
      if (!Number.isFinite(t.x) || !Number.isFinite(t.y)) return false;

      const dx = pointer.x - t.x;
      const dy = pointer.y - t.y;

      const radius =
        t.type === "round" ? 90 :
        t.type === "square" ? 110 : 140;

      return Math.sqrt(dx * dx + dy * dy) < radius;
    });

    if (!hoveredTable) {
      return set({
        highlightedTable: null,
        highlightedSeats: [],
      });
    }

    const safeTable = {
      ...hoveredTable,
      seatedGuests: Array.isArray(hoveredTable.seatedGuests)
        ? hoveredTable.seatedGuests
        : [],
    };

    const block = findFreeBlock(
      safeTable,
      Number(draggedGuest?.guestsCount) || 1
    );

    set({
      highlightedTable: hoveredTable.id,
      highlightedSeats: Array.isArray(block) ? block : [],
    });
  },

  /* ================= DROP ================= */
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

    if (!highlightedTable || highlightedSeats.length === 0) {
      return set({
        draggedGuest: null,
        highlightedTable: null,
        highlightedSeats: [],
      });
    }

    const guestId = draggedGuest._id.toString();

    const newTables = tables.map((t) => {
      const seated = Array.isArray(t.seatedGuests) ? t.seatedGuests : [];

      if (t.id !== highlightedTable) {
        return {
          ...t,
          seatedGuests: seated.filter(
            (s) => s?.guestId?.toString() !== guestId
          ),
        };
      }

      return {
        ...t,
        seatedGuests: [
          ...seated.filter(
            (s) => s?.guestId?.toString() !== guestId
          ),
          ...highlightedSeats.map((seatIndex) => ({
            guestId,
            seatIndex,
          })),
        ],
      };
    });

    const newGuests = guests.map((g) =>
      g?._id?.toString() === guestId
        ? { ...g, tableId: highlightedTable }
        : g
    );

    set({
      tables: newTables,
      guests: newGuests,
      draggedGuest: null,
      highlightedSeats: [],
      highlightedTable: null,
    });
  },

  /* ================= REMOVE FROM SEAT ================= */
  removeFromSeat: (tableId, guestId) => {
    const gid = guestId?.toString();
    if (!gid) return;

    const { tables, guests } = get();

    set({
      tables: tables.map((t) => ({
        ...t,
        seatedGuests:
          t.id === tableId
            ? (Array.isArray(t.seatedGuests)
                ? t.seatedGuests.filter(
                    (s) => s?.guestId?.toString() !== gid
                  )
                : [])
            : (Array.isArray(t.seatedGuests)
                ? t.seatedGuests
                : []),
      })),
      guests: guests.map((g) =>
        g?._id?.toString() === gid
          ? { ...g, tableId: null }
          : g
      ),
      highlightedTable: null,
      highlightedSeats: [],
      selectedGuestId: null,
    });
  },

  /* ================= MANUAL ASSIGN ================= */
  assignGuestsToTable: (tableId, guestId, count) => {
    const gid = guestId?.toString();
    const { tables, guests } = get();

    const table = tables.find((t) => t.id === tableId);
    const guest = guests.find((g) => g?._id?.toString() === gid);

    if (!table || !guest) {
      return { ok: false, message: "שגיאה בזיהוי אורח / שולחן" };
    }

    const safeTable = {
      ...table,
      seatedGuests: Array.isArray(table.seatedGuests)
        ? table.seatedGuests
        : [],
    };

    const block = findFreeBlock(safeTable, Number(count) || 1);
    if (!block) {
      return { ok: false, message: "אין מספיק מקומות פנויים" };
    }

    const newTables = tables.map((t) => {
      const seated = Array.isArray(t.seatedGuests) ? t.seatedGuests : [];

      if (t.id !== tableId) {
        return {
          ...t,
          seatedGuests: seated.filter(
            (s) => s?.guestId?.toString() !== gid
          ),
        };
      }

      return {
        ...t,
        seatedGuests: [
          ...seated.filter(
            (s) => s?.guestId?.toString() !== gid
          ),
          ...block.map((seatIndex) => ({
            guestId: gid,
            seatIndex,
          })),
        ],
      };
    });

    const newGuests = guests.map((g) =>
      g?._id?.toString() === gid
        ? { ...g, tableId }
        : g
    );

    set({
      tables: newTables,
      guests: newGuests,
      selectedGuestId: gid,
      highlightedTable: tableId,
    });

    return { ok: true };
  },

}));
