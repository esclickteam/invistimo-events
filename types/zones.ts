/* ============================================================
   ZONE TYPES
============================================================ */

/** סוגי אזורים אפשריים במערכת */
export type ZoneType =
  | "stage"
  | "chuppah"
  | "danceFloor"
  | "reception"
  | "bar"
  | "buffet";

/* ============================================================
   ZONE MODEL
============================================================ */

export interface Zone {
  id: string;

  /** 🧠 סוג לוגי (לפי preset / מערכת) */
  type: ZoneType;

  /** 🏷️ שם לתצוגה */
  name: string;

  /* ================= UI ================= */

  /** אייקון (אימוג'י / אייקון טקסטואלי) */
  icon: string;

  /** צבע בסיס */
  color: string;

  /** גרדיאנט אופציונלי (ל־UX מתקדם) */
  gradient?: [string, string];

  /** שקיפות */
  opacity: number;

  /** צל (ל־card feeling) */
  shadow?: boolean;

  /** רדיוס פינות (אם לא קיים – מחושב דינמית) */
  borderRadius?: number;

  /* ================= GEOMETRY ================= */

  /** מיקום על הקנבס */
  x: number;
  y: number;

  /** גודל */
  width: number;
  height: number;

  /** סיבוב */
  rotation: number;

  /** נעילה (לא ניתן לגרירה / שינוי) */
  locked?: boolean;
}
