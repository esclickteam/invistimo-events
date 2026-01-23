export type LiveGuest = {
  id: string;
  name: string;
  tableId: string | null;
  approved: number;
  arrived: number;

  /** 🆕 שיוך לקבוצה */
  groupId?: string | null;
};

export type LiveTable = {
  id: string;
  name: string;
  capacity: number;
};

/** 🆕 קבוצה (כמו בדשבורד) */
export type LiveGroup = {
  id: string;
  name: string;
  color?: string;
};

/**
 * 🆕 Snapshot מלא של הושבה
 * זהה למה שקיים במסך העריכה
 */
export type LiveBackground = {
  url: string;
  opacity?: number;
};

export type LiveCanvasView = {
  x: number;
  y: number;
  scale: number;
};

export type LiveSeatingState = {
  tables: LiveTable[];
  guests: LiveGuest[];

  /** 🆕 קבוצות */
  groups: LiveGroup[];

  /** 🆕 */
  background?: LiveBackground | null;
  canvasView?: LiveCanvasView | null;
};

export type LiveSeatingContextType = {
  state: LiveSeatingState;

  markArrived: (guestId: string, arrived: number) => void;
};
