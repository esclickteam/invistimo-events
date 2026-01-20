import { create } from "zustand";
import type { Group } from "@/types/group";
import { nanoid } from "nanoid";

type GroupStore = {
  groups: Group[];

  /* CRUD */
  setGroups: (groups: Group[]) => void;
  addGroup: (name: string) => void;
  updateGroup: (id: string, data: Partial<Group>) => void;
  removeGroup: (id: string) => void;

  /* DB */
  loadGroups: (invitationId: string) => Promise<void>;
};

export const useGroupStore = create<GroupStore>((set, get) => ({
  groups: [],

  /* ================= SET ================= */
  setGroups: (groups) => set({ groups }),

  /* ================= LOAD FROM DB ================= */
  loadGroups: async (invitationId: string) => {
    try {
      const res = await fetch(
        `/api/groups?invitationId=${invitationId}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await res.json();
      if (data.success) {
        set({ groups: data.groups || [] });
      }
    } catch (err) {
      console.error("❌ loadGroups failed:", err);
    }
  },

  /* ================= CRUD (LOCAL + API HOOK READY) ================= */
  addGroup: (name) =>
    set((state) => ({
      groups: [
        ...state.groups,
        {
          _id: nanoid(),
          invitationId: "",
          name,
          order: state.groups.length,
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
