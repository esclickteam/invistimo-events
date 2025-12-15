export type ZoneType =
  | "stage"
  | "chuppah"
  | "danceFloor"
  | "reception"
  | "bar"
  | "buffet"
  | "kidsArea";

export interface Zone {
  id: string;

  /** סוג לוגי */
  type: ZoneType;

  /** שם לתצוגה */
  name: string;

  /** UI */
  icon: string;
  color: string;
  opacity: number;

  /** מיקום וגודל */
  x: number;
  y: number;
  width: number;
  height: number;

  rotation: number;
  locked?: boolean;
}
