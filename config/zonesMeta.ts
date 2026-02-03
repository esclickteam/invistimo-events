import { ZoneType } from "@/types/zones";

type ZoneMeta = {
  label: string;
  defaultSize: { width: number; height: number };

  /* ===== UI ===== */
  icon: string;
  color: string;
  gradient?: [string, string];
  borderRadius?: number;
};

export const ZONE_META: Record<ZoneType, ZoneMeta> = {
  stage: {
    label: "במה",
    defaultSize: { width: 280, height: 120 },
    icon: "🎤",
    color: "#fca5a5",
    gradient: ["#fca5a5", "#fb7185"],
    borderRadius: 24,
  },

  chuppah: {
    label: "חופה",
    defaultSize: { width: 200, height: 200 },
    icon: "💍",
    color: "#fde68a",
    gradient: ["#fde68a", "#facc15"],
    borderRadius: 32,
  },

  danceFloor: {
    label: "רחבת ריקודים",
    defaultSize: { width: 360, height: 360 },
    icon: "💃",
    color: "#bfdbfe",
    gradient: ["#bfdbfe", "#60a5fa"],
    borderRadius: 40,
  },

  reception: {
    label: "קבלת פנים",
    defaultSize: { width: 300, height: 160 },
    icon: "🥂",
    color: "#bbf7d0",
    gradient: ["#bbf7d0", "#4ade80"],
    borderRadius: 28,
  },

  bar: {
    label: "בר",
    defaultSize: { width: 220, height: 100 },
    icon: "🍸",
    color: "#ddd6fe",
    gradient: ["#ddd6fe", "#a78bfa"],
    borderRadius: 22,
  },

  buffet: {
    label: "בופה",
    defaultSize: { width: 300, height: 120 },
    icon: "🍽️",
    color: "#fed7aa",
    gradient: ["#fed7aa", "#fb923c"],
    borderRadius: 26,
  },
};
