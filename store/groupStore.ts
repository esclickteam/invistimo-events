import { create } from "zustand";
import type { Group } from "@/types/group";
import { nanoid } from "nanoid";

type GroupStore = {
  groups: Group[];

  /* CRUD */
  setGroups: (groups: Group[]) => void;
  addGroup: (name: string, invitationId?: string) => void;
  updateGroup: (id: string, data: Partial<Group>) => void;
  removeGroup: (id: string) => void;

  /* Order */
  reorderGroups: (orderedIds: string[]) => void;

  /* Helpers */
  getGroupById: (id?: string | null) => Group | undefined;
};

export const useGroupStore = create<GroupStore>((set, get) => ({
  groups: [],

  /* ================= CRUD ================= */

  setGroups: (groups) =>
    set({
      groups: [...groups].sort((a, b) => a.order - b.order),
    }),

  addGroup: (name, invitationId = "") =>
    set((state) => ({
      groups: [
        ...state.groups,
        {
          _id: nanoid(),
          invitationId,
          name,
          order: state.groups.length,
          createdAt: new Date().toISOString(),
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
      groups: state.groups
        .filter((g) => g._id !== id)
        .map((g, index) => ({ ...g, order: index })), // שמירה על סדר תקין
    })),

  /* ================= ORDER ================= */

  reorderGroups: (orderedIds) =>
    set((state) => ({
      groups: orderedIds
        .map((id, index) => {
          const g = state.groups.find((x) => x._id === id);
          if (!g) return null;
          return { ...g, order: index };
        })
        .filter(Boolean) as Group[],
    })),

  /* ================= HELPERS ================= */

  getGroupById: (id) => {
    if (!id) return undefined;
    return get().groups.find((g) => g._id === id);
  },
}));
