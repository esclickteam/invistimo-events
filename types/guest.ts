export type Guest = {
  _id: string;
  name: string;
  phone: string;
  token: string;
  rsvp: "yes" | "no" | "pending";
  tableName?: string | null;
  guestsCount?: number;
  notes?: string;
};
