export type Guest = {
  id: string;
  name: string;
  phone: string;
  tableId: string;
  approved: number;
  arrived: number;
};

export type Table = {
  id: string;
  name: string;
  capacity: number;
};

export type LiveState = {
  guests: Guest[];
  tables: Table[];
};
