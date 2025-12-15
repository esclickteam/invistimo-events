"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";

import { EVENT_PRESETS } from "@/config/eventPresets";
import { ZONE_META } from "@/config/zonesMeta";

/* ============================================================
   TYPES
============================================================ */

export type Zone = {
  id: string;
  zoneType: string; // stage | chuppah | danceFloor | ...
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

  /* ===== BASIC ===== */
  setZones: (zones: Zone[]) => void;
  addZone: (zone: Zone) => void;

  updateZone: (id: string, data: Partial<Zone>) => void;
  removeZone: (id: string) => void;

  /* ===== TRANSFORM ===== */
  rotateZone: (id: string, delta?: number) => void;
  resizeZone: (id: string, width: number, height: number) => void;

  /* ===== PRESET ===== */
  loadPreset: (eventType: string) => void;
};

/* ============================================================
   STORE
============================================================ */

export const useZoneStore = create<ZoneStore>((set) => ({
  zones: [],

  /* ================= BASIC ================= */

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

  /* ================= TRANSFORM ================= */

  rotateZone: (id, delta = 90) =>
    set((state) => ({
      zones: state.zones.map((z) =>
        z.id === id
          ? {
              ...z,
              rotation: ((z.rotation || 0) + delta) % 360,
            }
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

  /* ================= PRESET ================= */

  loadPreset: (eventType) => {
    const preset = EVENT_PRESETS[eventType];
    if (!preset) return;

    const zones: Zone[] = preset.map((zoneType, index) => {
      const meta = ZONE_META[zoneType];

      return {
        id: nanoid(),
        zoneType,
        label: meta.label,
        icon: meta.icon,
        color: meta.color,
        opacity: 0.35,

        // מיקום אוטומטי – אפשר לשפר בהמשך
        x: 200 + index * 80,
        y: 200 + index * 60,

        width: meta.defaultSize.width,
        height: meta.defaultSize.height,
        rotation: 0,
        locked: false,
      };
    });

    set({ zones });
  },
}));
