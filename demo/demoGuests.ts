// demo/demoGuests.ts

export type DemoGuestStatus = "yes" | "pending" | "no";

export interface DemoGuest {
  id: string;
  name: string;
  guestsCount: number;
  status: DemoGuestStatus;
  tableId: string | null;
  tableName: string | null;
}

export const DEMO_GUESTS: DemoGuest[] = [
  {
    id: "demo-1",
    name: "דנה לוי",
    guestsCount: 2,
    status: "yes",
    tableId: null,
    tableName: null,
  },
  {
    id: "demo-2",
    name: "איתי כהן",
    guestsCount: 1,
    status: "pending",
    tableId: null,
    tableName: null,
  },
  {
    id: "demo-3",
    name: "משפחת ישראלי",
    guestsCount: 4,
    status: "yes",
    tableId: null,
    tableName: null,
  },
  {
    id: "demo-4",
    name: "נועה בר",
    guestsCount: 1,
    status: "no",
    tableId: null,
    tableName: null,
  },
];
