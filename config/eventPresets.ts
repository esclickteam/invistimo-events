import type { ZoneType } from "@/types/zones";

export const EVENT_PRESETS: Record<string, ZoneType[]> = {
  wedding: [
    "chuppah",
    "danceFloor",
    "stage",
    "bar",
    "buffet",
  ],

  bar_mitzvah: [
    "stage",
    "danceFloor",
    "buffet",
    "kidsArea",
  ],

  bat_mitzvah: [
    "stage",
    "danceFloor",
    "buffet",
  ],

  brit: [
    "stage",
    "buffet",
  ],

  henna: [
    "stage",
    "danceFloor",
    "buffet",
  ],
};
