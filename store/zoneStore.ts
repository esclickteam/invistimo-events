"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";

import { EVENT_PRESETS } from "@/config/eventPresets";
import { ZONE_META } from "@/config/zonesMeta";
import type { Zone, ZoneType } from "@/types/zones";

type ZoneStore = {
  zones: Zone[];

  setZones: (zones: Zone[]) => void;
  addZone: (zone: Zone) => void;
  updateZone: (id: string, data: Partial<Zone>) => void;
  removeZone: (id: string) => void;

  rotateZone: (id: string, delta?: number) => void;
  resizeZone: (id: string, width: number, height: number) => void;

  loadPreset: (eventType: keyof typeof EVENT_PRESETS) => void;
};

export const useZoneStore = create<ZoneStore>((set) => ({
  zones: [],

  setZones: (zones) => set({ zones }),

  addZone: (zone) =>
    set((state) => ({ zones: [...state.zones, zone] })),

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

  rotateZone: (id, delta = 90) =>
    set((state) => ({
      zones: state.zones.map((z) =>
        z.id === id
          ? { ...z, rotation: (z.rotation + delta) % 360 }
          : z
      ),
    })),

  resizeZone: (id, width, height) =>
    set((state) => ({
      zones: state.zones.map((z) =>
        z.id === id
          ? {
              ...z,
              width: Math.max(40, width),
              height: Math.max(40, height),
            }
          : z
      ),
    })),

  loadPreset: (eventType) => {
    const preset = EVENT_PRESETS[eventType];
    if (!preset) return;

    const zones: Zone[] = preset.map((type: ZoneType, index) => {
      const meta = ZONE_META[type];

      return {
        id: nanoid(),
        type,
        name: meta.label,
        icon: meta.icon,
        color: meta.color,
        opacity: 0.35,

        x: 200 + index * 90,
        y: 200 + index * 70,
        width: meta.defaultSize.width,
        height: meta.defaultSize.height,
        rotation: 0,
        locked: false,
      };
    });

    set({ zones });
  },
}));
