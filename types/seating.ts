export type SeatedGuest = {
  guestId: string;
  seatIndex: number;
  arrived?: boolean; // ⭐ חובה
};

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
