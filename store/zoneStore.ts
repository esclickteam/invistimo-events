import { create } from "zustand";

export type Zone = {
  id: string;
  zoneType: string;
  label: string;
  icon: string;
  color: string;
  opacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked?: boolean;
};

type ZoneStore = {
  zones: Zone[];

  setZones: (zones: Zone[]) => void;
  addZone: (zone: Zone) => void;

  updateZone: (id: string, data: Partial<Zone>) => void;
  removeZone: (id: string) => void;
};

export const useZoneStore = create<ZoneStore>((set) => ({
  zones: [],

  setZones: (zones) => set({ zones }),

  addZone: (zone) =>
    set((state) => ({
      zones: [...state.zones, zone],
    })),

  updateZone: (id, data) =>
    set((state) => ({
      zones: state.zones.map((z) =>
        z.id === id ? { ...z, ...data } : z
      ),
    })),

  removeZone: (id) =>
    set((state) => ({
      zones: state.zones.filter((z) => z.id !== id),
    })),
}));
