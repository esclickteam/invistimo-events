export type Group = {
  _id: string;

  invitationId: string;

  name: string;
  color?: string;        // צבע לקבוצה (UI)
  order: number;         // סידור ידני

  createdAt?: string;
};
