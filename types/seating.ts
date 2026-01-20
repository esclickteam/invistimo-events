/* ===============================
   אורח בהושבה (Guest)
   =============================== */
export type SeatingGuest = {
  id?: string;
  _id?: string;

  name: string;

  guestsCount?: number;     // כמה הוזמנו
  arrivedCount?: number;    // ⭐ כמה הגיעו בפועל (בלייב)

  rsvp?: "yes" | "no" | "pending";

  tableId?: string | null;
  tableName?: string | null;
};


/* ===============================
   מושב תפוס בפועל
   =============================== */
export type SeatedGuest = {
  guestId: string;
  seatIndex: number;
  arrived?: boolean; // ⭐ סנכרון ללייב
};


/* ===============================
   שולחן הושבה
   =============================== */
export type SeatingTable = {
  id: string;
  name: string;

  x: number;
  y: number;

  type: "round" | "square" | "rectangle";
  seats: number;

  rotation?: number;

  seatedGuests?: SeatedGuest[];
};
