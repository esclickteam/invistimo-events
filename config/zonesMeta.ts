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
    // 🔴 חי / אדום-ורוד
    color: "#fb7185",
    gradient: ["#fb7185", "#ef4444"],
    borderRadius: 24,
  },

  chuppah: {
    label: "חופה",
    defaultSize: { width: 200, height: 200 },
    icon: "💍",
    // 🟡 חי / זהב
    color: "#fbbf24",
    gradient: ["#fbbf24", "#f59e0b"],
    borderRadius: 32,
  },

  danceFloor: {
    label: "רחבת ריקודים",
    defaultSize: { width: 360, height: 360 },
    icon: "💃",
    // 🔵 חי / כחול-טורקיז
    color: "#38bdf8",
    gradient: ["#38bdf8", "#06b6d4"],
    borderRadius: 40,
  },

  reception: {
    label: "קבלת פנים",
    defaultSize: { width: 300, height: 160 },
    icon: "🥂",
    // 🟢 חי / ירוק-מנטה
    color: "#34d399",
    gradient: ["#34d399", "#22c55e"],
    borderRadius: 28,
  },

  bar: {
    label: "בר",
    defaultSize: { width: 220, height: 100 },
    icon: "🍸",
    // 🟣 חי / סגול-פוקסיה
    color: "#a855f7",
    gradient: ["#a855f7", "#ec4899"],
    borderRadius: 22,
  },

  buffet: {
    label: "בופה",
    defaultSize: { width: 300, height: 120 },
    icon: "🍽️",
    // 🟠 חי / כתום
    color: "#fb923c",
    gradient: ["#fb923c", "#f97316"],
    borderRadius: 26,
  },
};
