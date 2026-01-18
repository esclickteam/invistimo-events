export type LiveGuest = {
  id: string;
  name: string;
  tableId: string;
  approved: number;
  arrived: number;
};

export type LiveTable = {
  id: string;
  name: string;
  capacity: number;
};

export type LiveSeatingState = {
  tables: LiveTable[];
  guests: LiveGuest[];
};

export type LiveSeatingContextType = {
  state: LiveSeatingState;
  markArrived: (guestId: string, arrived: number) => void;
};
