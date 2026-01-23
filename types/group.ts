export type Group = {
  _id: string;

  /* ✅ מקור אמת */
  eventId: string;

  /* 🟡 Legacy – לא חובה (לתקופת מעבר בלבד) */
  invitationId?: string;

  /* ===== Core ===== */
  name: string;
  color?: string | null;     // 🎨 צבע קבוצה (UI)
  order: number;             // ↕️ סידור ידני בסיידבר

  /* ===== Relations / Derived ===== */
  guestIds?: string[];       // 👥 אורחים בקבוצה (מקור אמת)
  size?: number;             // 🔢 סה״כ מוזמנים (מחושב / נשמר)

  tableId?: string;          // 🪑 שולחן משויך (אם הושבה)
  isSeated?: boolean;        // ✅ סטטוס מהיר (UX)

  /* ===== Meta ===== */
  createdAt?: string;
};
