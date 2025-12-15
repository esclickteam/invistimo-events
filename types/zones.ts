export type ZoneType =
  | "stage"
  | "chuppah"
  | "danceFloor"
  | "reception"
  | "bar"
  | "buffet"      // ✅ הוספה
  | "kidsArea";

export interface Zone {
  id: string;
  type: ZoneType;
  name: string;

  x: number;
  y: number;
  width: number;
  height: number;

  rotation?: number;
  locked?: boolean;
}
