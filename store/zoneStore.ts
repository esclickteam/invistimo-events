"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";

import { EVENT_PRESETS } from "@/config/eventPresets";
import { ZONE_META } from "@/config/zonesMeta";
import type { ZoneType } from "@/types/zones";

/* ============================================================
   TYPES
============================================================ */

/** ✅ Zone – כולל שדות UX מתקדמים */
export type Zone = {
  id: string;

  /** 🧠 סוג לוגי */
  type: ZoneType;

  /** 🏷️ שם לתצוגה */
  name: string;

  /* ================= UI ================= */

  /** אייקון (אימוג'י / אייקון) */
  icon: string;

  /** צבע בסיס */
  color: string;

  /** ⭐ גרדיאנט (אם קיים – עדיף על color) */
  gradient?: [string, string];

  /** שקיפות */
  opacity: number;

  /** ⭐ צל רך */
  shadow?: boolean;

  /** ⭐ רדיוס פינות (אם לא מוגדר – מחושב דינמית ב־renderer) */
  borderRadius?: number;

  /* ================= GEOMETRY ================= */

  /** מיקום */
  x: number;
  y: number;

  /** גודל */
  width: number;
  height: number;

  /** סיבוב */
  rotation: number;

  /** 🔒 נעילה */
  locked?: boolean;
};

type ZoneStore = {
  zones: Zone[];

  /* ===== SELECTION ===== */
  selectedZoneId: string | null;
  setSelectedZone: (id: string | null) => void;

  /* ===== BASIC ===== */
  setZones: (zones: Zone[]) => void;
  addZone: (zone: Zone) => void;
  updateZone: (id: string, data: Partial<Zone>) => void;
  removeZone: (id: string) => void;

  /* ===== TRANSFORM ===== */
  rotateZone: (id: string, delta?: number) => void;

  /** ✅ resize אמיתי – width / height בלבד */
  resizeZone: (id: string, width: number, height: number) => void;

  /* ===== PRESET ===== */
  loadPreset: (eventType: string) => void;
};

/* ============================================================
   STORE
============================================================ */

export const useZoneStore = create<ZoneStore>((set) => ({
  zones: [],

  /* ================= SELECTION ================= */

  selectedZoneId: null,

  setSelectedZone: (id) =>
    set({
      selectedZoneId: id,
    }),

  /* ================= BASIC ================= */

  setZones: (zones) =>
    set({
      zones,
    }),

  addZone: (zone) =>
    set((state) => ({
      zones: [...state.zones, zone],
      selectedZoneId: zone.id, // ⭐ בוחרים את החדש אוטומטית
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
      selectedZoneId:
        state.selectedZoneId === id ? null : state.selectedZoneId,
    })),

  /* ================= TRANSFORM ================= */

  rotateZone: (id, delta = 90) =>
    set((state) => ({
      zones: state.zones.map((z) =>
        z.id === id && !z.locked
          ? { ...z, rotation: (z.rotation + delta) % 360 }
          : z
      ),
    })),

  /**
   * ✅ resize אמיתי (לא scale!)
   * נקרא מ־onTransformEnd ב־ZoneRenderer
   */
  resizeZone: (id, width, height) =>
    set((state) => ({
      zones: state.zones.map((z) =>
        z.id === id && !z.locked
          ? {
              ...z,
              width: Math.max(60, Math.round(width)),
              height: Math.max(60, Math.round(height)),
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
        gradient: meta.gradient, // ⭐ חדש (אם קיים)
        opacity: 0.35,

        shadow: true,
        borderRadius: meta.borderRadius,

        x: 200 + index * 120,
        y: 200 + index * 90,
        width: meta.defaultSize.width,
        height: meta.defaultSize.height,

        rotation: 0,
        locked: false,
      };
    });

    set({
      zones,
      selectedZoneId: null, // ⭐ אין בחירה אחרי preset
    });
  },
}));
