import { ZoneType } from "@/types/zones";

export const ZONE_META: Record<
  ZoneType,
  {
    label: string;
    defaultSize: { width: number; height: number };
    color: string;
    icon: string;
  }
> = {
  stage: {
    label: "במה",
    defaultSize: { width: 280, height: 120 },
    color: "#fca5a5",
    icon: "🎤",
  },
  chuppah: {
    label: "חופה",
    defaultSize: { width: 200, height: 200 },
    color: "#fde68a",
    icon: "💍",
  },
  danceFloor: {
    label: "רחבת ריקודים",
    defaultSize: { width: 360, height: 360 },
    color: "#bfdbfe",
    icon: "💃",
  },
  reception: {
    label: "קבלת פנים",
    defaultSize: { width: 300, height: 160 },
    color: "#bbf7d0",
    icon: "🥂",
  },
  bar: {
    label: "בר",
    defaultSize: { width: 220, height: 100 },
    color: "#ddd6fe",
    icon: "🍸",
  },
  buffet: {
    label: "בופה",
    defaultSize: { width: 300, height: 120 },
    color: "#fed7aa",
    icon: "🍽️",
  },
};
