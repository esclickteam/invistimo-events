export type DemoRsvp = "yes" | "no" | "maybe" | "pending";

export type DemoCallRound = {
  roundNumber: number;
  answerStatus?: "answered" | "no_answer" | null;
  resultStatus?:
    | "yes"
    | "no"
    | "will_reply"
    | "callback"
    | "no_answer"
    | "needs_correction"
    | "undecided"
    | null;
  amount?: number;
  notes?: string;
  calledAt?: string;
  simulated?: boolean;
  channel?: "ivr" | "human";
};

export type DemoGuest = {
  _id: string;
  id: string;
  name: string;
  phone: string;
  token: string;
  relation?: string;
  groupId?: string | null;
  tableId?: string | null;
  tableName?: string;
  tableNumber?: number | null;
  rsvp: DemoRsvp;
  guestsCount: number;
  arrivedCount?: number;
  actualArrivedCount?: number;
  notes?: string;
  firstOpenedAt?: string | null;
  lastOpenedAt?: string | null;
  openCount?: number;
  rsvpRespondedAt?: string | null;
  callRounds?: DemoCallRound[];
  createdAt?: string;
};

export type DemoSeat = {
  guestId: string;
  seatIndex: number;
};

export type DemoTable = {
  id: string;
  number: number;
  name: string;
  type: "round" | "rect";
  seats: number;
  capacity: number;
  x: number;
  y: number;
  rotation: number;
  seatedGuests: DemoSeat[];
};

export type DemoGroup = {
  _id: string;
  name: string;
};

export type DemoMessageRound = {
  id: string;
  channel: "whatsapp" | "sms";
  type: "rsvp" | "reminder" | "thankyou";
  round: number;
  simulated: true;
  scheduled: boolean;
  sentAt: string;
  recipientCount: number;
};

export type DemoActivity = {
  id: string;
  at: string;
  label: string;
  kind: string;
};

export type DemoLead = {
  name: string;
  phone: string;
  email: string;
  note?: string;
  createdAt: string;
};

export type DemoTourState = {
  active: boolean;
  stepIndex: number;
  completed: string[];
  finished: boolean;
};

export type DemoSession = {
  id: string;
  createdAt: number;
  expiresAt: number;
  lastSeenAt: number;
  mode: "guided" | "free" | null;
  tour: DemoTourState;
  event: {
    _id: string;
    title: string;
    eventType: string;
    date: string;
    time: string;
    venue: string;
    location: string;
    lat: number;
    lng: number;
  };
  invitation: Record<string, unknown>;
  guests: DemoGuest[];
  tables: DemoTable[];
  groups: DemoGroup[];
  messages: DemoMessageRound[];
  ivrSchedule: Array<{
    roundNumber: number;
    title: string;
    scheduledAt: string;
    notes: string;
    status: string;
  }>;
  activity: DemoActivity[];
  lead: DemoLead | null;
};

export type DemoInquiry = DemoLead & {
  id: string;
  sessionId: string;
};
