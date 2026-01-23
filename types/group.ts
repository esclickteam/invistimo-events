export type Group = {
  _id: string;

  invitationId: string;

  name: string;
  color?: string;          // 🎨 צבע קבוצה (UI)
  order: number;           // ↕️ סידור ידני בסיידבר

  guestIds?: string[];     // 👥 אורחים בקבוצה (מקור אמת)
  size?: number;           // 🔢 סה״כ מוזמנים (מחושב / נשמר)

  tableId?: string;        // 🪑 שולחן משויך (אם הושבה)
  isSeated?: boolean;      // ✅ סטטוס מהיר (UX)

  createdAt?: string;
};
