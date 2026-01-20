// src/types/seating.ts

export type SeatingTable = {
  id: string;
  name: string;
  x: number;
  y: number;
  type: "round" | "square" | "rectangle";
  seats: number;
  rotation?: number;
  seatedGuests?: {
    guestId: string;
    seatIndex: number;
  }[];
};
