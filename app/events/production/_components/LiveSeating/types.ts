export type LiveGuest = {
  id: string;
  name: string;
  tableId: string | null;
  approved: number;
  arrived: number;
};

export type LiveTable = {
  id: string;
  name: string;
  capacity: number;
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

  /** 🆕 */
  background?: LiveBackground | null;
  canvasView?: LiveCanvasView | null;
};

export type LiveSeatingContextType = {
  state: LiveSeatingState;

  markArrived: (guestId: string, arrived: number) => void;
};
