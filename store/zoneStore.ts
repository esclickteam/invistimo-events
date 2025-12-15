"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";

import { EVENT_PRESETS } from "@/config/eventPresets";
import { ZONE_META } from "@/config/zonesMeta";
import type { ZoneType } from "@/types/zones";

/* ============================================================
   TYPES
============================================================ */

/** ✅ חייב להיות export */
export type Zone = {
  id: string;
  type: ZoneType;

  name: string;
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
              width: Math.max(60, width),
              height: Math.max(60, height),
            }
          : z
      ),
    })),

  /* ================= PRESET ================= */

  loadPreset: (eventType) => {
    const preset = EVENT_PRESETS[eventType];
    if (!preset) return;

    const zones: Zone[] = preset.map((type, index) => {
      const meta = ZONE_META[type];

      return {
        id: nanoid(),
        type,
        name: meta.label,
        icon: meta.icon,
        color: meta.color,
        opacity: 0.35,

        x: 200 + index * 120,
        y: 200 + index * 90,
        width: meta.defaultSize.width,
        height: meta.defaultSize.height,
        rotation: 0,
        locked: false,
      };
    });

    set({ zones });
  },
}));
