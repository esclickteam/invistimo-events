export type Guest = {
  _id: string;

  /* זיהוי */
  name: string;
  phone: string;
  token: string;

  /* אישור הגעה */
  rsvp: "yes" | "no" | "pending";

  /* הושבה */
  tableId?: string | null;     // ⭐ מקור אמת (לא tableName)
  tableName?: string | null;   // ⚠️ אופציונלי / נגזר
  seatIndex?: number | null;   // ⭐ מקום בשולחן

  /* קבוצה */
  groupId?: string | null;     // ⭐ חיבור לקבוצות
  groupName?: string;          // ⚠️ נגזר בלבד (ל־UI)

  /* נתונים כלליים */
  guestsCount?: number;
  notes?: string;

  /* Live */
  arrived?: boolean;           // ⭐ הגיע לאירוע
  seated?: boolean;            // ⭐ הושיבו בפועל
};
