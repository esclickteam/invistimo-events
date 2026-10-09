import type {
  DemoGuest,
  DemoSession,
  DemoTable,
  DemoTourState,
} from "@/lib/demo/interactive/types";

export const DEMO_INVITATION_ID = "demo-invitation";
export const DEMO_SHARE_ID = "demo-share";
export const DEMO_EVENT_ID = "demo-event-001";
export const DEMO_SESSION_TTL_MS = 1000 * 60 * 60 * 4;

const EVENT_TITLE = "החתונה של מאיה ואיתי";
const EVENT_DATE = "2026-11-12";
const EVENT_TIME = "19:30";
const VENUE = "גן ורדים";
const ADDRESS = "הרצליה";

function at(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function guest(input: Omit<DemoGuest, "id"> & { _id: string }): DemoGuest {
  return { ...input, id: input._id };
}

function seat(guestId: string, count: number, start = 0) {
  return Array.from({ length: count }, (_, index) => ({
    guestId,
    seatIndex: start + index,
  }));
}

export function createDemoTour(): DemoTourState {
  return {
    active: false,
    stepIndex: 0,
    completed: [],
    finished: false,
  };
}

export function createDemoTables(): DemoTable[] {
  return [
    {
      id: "table-1",
      number: 1,
      name: "שולחן 1",
      type: "round",
      seats: 10,
      capacity: 10,
      x: 180,
      y: 160,
      rotation: 0,
      seatedGuests: [...seat("g-oren", 2), ...seat("g-yossi", 1, 2)],
    },
    {
      id: "table-2",
      number: 2,
      name: "שולחן 2",
      type: "round",
      seats: 10,
      capacity: 10,
      x: 460,
      y: 160,
      rotation: 0,
      seatedGuests: seat("g-alon", 2),
    },
    {
      id: "table-3",
      number: 3,
      name: "שולחן 3",
      type: "round",
      seats: 8,
      capacity: 8,
      x: 180,
      y: 420,
      rotation: 0,
      seatedGuests: [...seat("g-daniel", 3), ...seat("g-tamar", 1, 3)],
    },
    {
      id: "table-4",
      number: 4,
      name: "שולחן 4",
      type: "rect",
      seats: 8,
      capacity: 8,
      x: 460,
      y: 420,
      rotation: 0,
      seatedGuests: [],
    },
  ];
}

export function createDemoGuests(): DemoGuest[] {
  return [
    guest({
      _id: "g-oren",
      name: "אורן לוי",
      phone: "0501234567",
      token: "dmo_oren",
      relation: "משפחה",
      groupId: "group-family",
      tableId: "table-1",
      tableName: "שולחן 1",
      tableNumber: 1,
      rsvp: "yes",
      guestsCount: 2,
      arrivedCount: 2,
      actualArrivedCount: 0,
      firstOpenedAt: at(17, 15),
      lastOpenedAt: at(17, 37),
      openCount: 3,
      rsvpRespondedAt: at(17, 20),
      callRounds: [],
    }),
    guest({
      _id: "g-noa",
      name: "נועה כהן",
      phone: "0529876543",
      token: "dmo_noa",
      relation: "חברים",
      groupId: "group-friends",
      tableId: null,
      tableName: "",
      rsvp: "pending",
      guestsCount: 1,
      arrivedCount: 0,
      actualArrivedCount: 0,
      openCount: 0,
      callRounds: [],
    }),
    guest({
      _id: "g-daniel",
      name: "דניאל לוי",
      phone: "0541112233",
      token: "dmo_daniel",
      relation: "משפחה",
      groupId: "group-family",
      tableId: "table-3",
      tableName: "שולחן 3",
      tableNumber: 3,
      rsvp: "yes",
      guestsCount: 3,
      arrivedCount: 3,
      actualArrivedCount: 0,
      firstOpenedAt: at(16, 5),
      lastOpenedAt: at(16, 40),
      openCount: 2,
      rsvpRespondedAt: at(16, 12),
      callRounds: [
        {
          roundNumber: 1,
          answerStatus: "answered",
          resultStatus: "yes",
          amount: 3,
          notes: "אישרו בשיחה אנושית, מגיעים עם ילד.",
          calledAt: at(15, 10),
          channel: "human",
          simulated: true,
        },
      ],
    }),
    guest({
      _id: "g-maya",
      name: "מאיה ישראלי",
      phone: "0534445566",
      token: "dmo_maya",
      relation: "חברים",
      groupId: "group-friends",
      tableId: null,
      rsvp: "no",
      guestsCount: 1,
      arrivedCount: 0,
      actualArrivedCount: 0,
      firstOpenedAt: at(15, 48),
      lastOpenedAt: at(15, 48),
      openCount: 1,
      rsvpRespondedAt: at(15, 52),
    }),
    guest({
      _id: "g-yossi",
      name: "יוסי כהן",
      phone: "0507778899",
      token: "dmo_yossi",
      relation: "עבודה",
      groupId: "group-work",
      tableId: "table-1",
      tableName: "שולחן 1",
      tableNumber: 1,
      rsvp: "yes",
      guestsCount: 1,
      arrivedCount: 1,
      actualArrivedCount: 0,
      firstOpenedAt: at(14, 10),
      lastOpenedAt: at(18, 2),
      openCount: 4,
      rsvpRespondedAt: at(14, 22),
    }),
    guest({
      _id: "g-shira",
      name: "שירה לוי",
      phone: "0523332211",
      token: "dmo_shira",
      relation: "משפחה",
      groupId: "group-family",
      tableId: null,
      rsvp: "pending",
      guestsCount: 2,
      arrivedCount: 0,
      actualArrivedCount: 0,
      firstOpenedAt: at(13, 30),
      lastOpenedAt: at(13, 30),
      openCount: 1,
    }),
    guest({
      _id: "g-alon",
      name: "אלון פרץ",
      phone: "0549991122",
      token: "dmo_alon",
      relation: "חברים",
      groupId: "group-friends",
      tableId: "table-2",
      tableName: "שולחן 2",
      tableNumber: 2,
      rsvp: "yes",
      guestsCount: 2,
      arrivedCount: 2,
      actualArrivedCount: 0,
      openCount: 2,
      rsvpRespondedAt: at(12, 40),
    }),
    guest({
      _id: "g-roni",
      name: "רוני אברהם",
      phone: "0506665544",
      token: "dmo_roni",
      relation: "עבודה",
      groupId: "group-work",
      tableId: null,
      rsvp: "maybe",
      guestsCount: 1,
      arrivedCount: 0,
      actualArrivedCount: 0,
      openCount: 0,
    }),
    guest({
      _id: "g-tamar",
      name: "תמר כהן",
      phone: "0528887766",
      token: "dmo_tamar",
      relation: "משפחה",
      groupId: "group-family",
      tableId: "table-3",
      tableName: "שולחן 3",
      tableNumber: 3,
      rsvp: "yes",
      guestsCount: 1,
      arrivedCount: 1,
      actualArrivedCount: 0,
      openCount: 1,
      rsvpRespondedAt: at(11, 15),
    }),
    guest({
      _id: "g-itai",
      name: "איתי רוזן",
      phone: "0532223344",
      token: "dmo_itai",
      relation: "חברים",
      groupId: "group-friends",
      tableId: null,
      rsvp: "pending",
      guestsCount: 2,
      arrivedCount: 0,
      actualArrivedCount: 0,
      openCount: 0,
    }),
  ];
}

export function createDemoInvitation() {
  return {
    _id: DEMO_INVITATION_ID,
    id: DEMO_INVITATION_ID,
    shareId: DEMO_SHARE_ID,
    title: EVENT_TITLE,
    eventName: EVENT_TITLE,
    eventTitle: EVENT_TITLE,
    eventType: "wedding",
    eventDate: EVENT_DATE,
    eventTime: EVENT_TIME,
    hostsNames: "מאיה לוי ואיתי כהן",
    brideName: "מאיה",
    groomName: "איתי",
    eventId: DEMO_EVENT_ID,
    ownerId: "demo-owner",
    city: "הרצליה",
    location: {
      name: VENUE,
      address: ADDRESS,
      lat: 32.1624,
      lng: 34.8447,
      placeName: VENUE,
      formattedAddress: `${VENUE}, ${ADDRESS}`,
    },
    rsvpSiteMode: "personal_invitation",
    guestExperienceType: "personal_invitation",
    invitationSettings: {
      rsvpSiteMode: "personal_invitation",
      guestExperienceType: "personal_invitation",
    },
    preRsvpMessages: {
      enabled: true,
      mode: "both",
      saveTheDateEnabled: true,
      invitationOnlyEnabled: true,
    },
    rsvpRoundSent: {},
    giftCreditUrl: "",
  };
}

export function createDemoSessionData(): Omit<
  DemoSession,
  "id" | "createdAt" | "expiresAt" | "lastSeenAt" | "mode" | "tour" | "lead"
> {
  return {
    event: {
      _id: DEMO_EVENT_ID,
      title: EVENT_TITLE,
      eventType: "wedding",
      date: EVENT_DATE,
      time: EVENT_TIME,
      venue: VENUE,
      location: ADDRESS,
      lat: 32.1624,
      lng: 34.8447,
    },
    invitation: createDemoInvitation(),
    guests: createDemoGuests(),
    tables: createDemoTables(),
    groups: [
      { _id: "group-family", name: "משפחה" },
      { _id: "group-friends", name: "חברים" },
      { _id: "group-work", name: "עבודה" },
    ],
    messages: [],
    ivrSchedule: [1, 2, 3].map((roundNumber) => ({
      roundNumber,
      title: `סבב מוקלט ${roundNumber}`,
      scheduledAt: "",
      notes: "",
      status: "scheduled",
    })),
    activity: [
      {
        id: "seed-open",
        at: new Date().toISOString(),
        kind: "session",
        label: "נפתחה סביבת הדמו של החתונה של מאיה ואיתי",
      },
    ],
  };
}
