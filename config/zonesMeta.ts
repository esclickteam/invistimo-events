import { ZoneMeta, ZoneType } from "@/types/zones";

export const ZONE_META: Record<ZoneType, ZoneMeta> = {
  stage: {
    label: "במה",
    icon: "🎤",
    color: "#fecaca",
  },
  chuppah: {
    label: "חופה",
    icon: "💍",
    color: "#ddd6fe",
  },
  danceFloor: {
    label: "רחבת ריקודים",
    icon: "💃",
    color: "#bbf7d0",
  },
  buffet: {
    label: "אוכל",
    icon: "🍽️",
    color: "#fde68a",
  },
  bar: {
    label: "בר",
    icon: "🍸",
    color: "#bae6fd",
  },
  kidsArea: {
    label: "אזור ילדים",
    icon: "🧸",
    color: "#fbcfe8",
  },
};
