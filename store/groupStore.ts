import { create } from "zustand";
import type { Group } from "@/types/group";
import { nanoid } from "nanoid";

type GroupStore = {
  groups: Group[];

  /* ===== State ===== */
  setGroups: (groups: Group[]) => void;

  /* ===== DB ===== */
  loadGroupsByEvent: (eventId: string) => Promise<void>;

  /* ===== CRUD (local-first) ===== */
  addGroup: (eventId: string, name: string) => void;
  updateGroup: (id: string, data: Partial<Group>) => void;
  removeGroup: (id: string) => void;
};

export const useGroupStore = create<GroupStore>((set, get) => ({
  groups: [],

  /* ================= SET ================= */
  setGroups: (groups) => set({ groups }),

  /* ================= LOAD FROM DB ================= */
  loadGroupsByEvent: async (eventId: string) => {
    if (!eventId) return;

    try {
      const res = await fetch(
        `/api/events/${eventId}/groups`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (data?.success) {
        set({ groups: data.groups || [] });
      }
    } catch (err) {
      console.error("❌ loadGroupsByEvent failed:", err);
    }
  },

  /* ================= CRUD (LOCAL) ================= */
  addGroup: (eventId, name) =>
    set((state) => ({
      groups: [
        ...state.groups,
        {
          _id: nanoid(),      // temp id (יוחלף אחרי שמירה ל־DB)
          eventId,            // ✅ שייך לאירוע
          name,
          order: state.groups.length,
          color: null,
        },
      ],
    })),

  updateGroup: (id, data) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g._id === id ? { ...g, ...data } : g
      ),
    })),

  removeGroup: (id) =>
    set((state) => ({
      groups: state.groups.filter((g) => g._id !== id),
    })),
}));
