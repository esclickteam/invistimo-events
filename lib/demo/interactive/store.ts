import {
  createDemoSessionData,
  createDemoTour,
  DEMO_SESSION_TTL_MS,
} from "@/lib/demo/interactive/seed";
import type {
  DemoActivity,
  DemoGuest,
  DemoInquiry,
  DemoLead,
  DemoRsvp,
  DemoSession,
  DemoTable,
} from "@/lib/demo/interactive/types";

type StoreGlobal = typeof globalThis & {
  __invistimoDemoSessions?: Map<string, DemoSession>;
  __invistimoDemoInquiries?: DemoInquiry[];
};

const root = globalThis as StoreGlobal;
const sessions = root.__invistimoDemoSessions || new Map<string, DemoSession>();
const inquiries = root.__invistimoDemoInquiries || [];
root.__invistimoDemoSessions = sessions;
root.__invistimoDemoInquiries = inquiries;

function now() {
  return Date.now();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createSessionId() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return `dmo_${cryptoApi.randomUUID()}`;
  return `dmo_${now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function pushActivity(session: DemoSession, kind: string, label: string) {
  const item: DemoActivity = {
    id: createSessionId(),
    at: new Date().toISOString(),
    kind,
    label,
  };
  session.activity = [item, ...session.activity].slice(0, 40);
}

function syncGuestTables(session: DemoSession) {
  const tableByGuest = new Map<string, DemoTable>();
  for (const table of session.tables) {
    const seen = new Set<string>();
    for (const seat of table.seatedGuests || []) {
      const id = String(seat.guestId || "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      tableByGuest.set(id, table);
    }
  }

  for (const guest of session.guests) {
    const table = tableByGuest.get(guest._id);
    if (!table) {
      guest.tableId = null;
      guest.tableName = "";
      guest.tableNumber = null;
      continue;
    }
    guest.tableId = table.id;
    guest.tableName = table.name;
    guest.tableNumber = table.number;
  }
}

export function createSession(id = createSessionId()): DemoSession {
  const createdAt = now();
  const session: DemoSession = {
    id,
    createdAt,
    expiresAt: createdAt + DEMO_SESSION_TTL_MS,
    lastSeenAt: createdAt,
    mode: null,
    tour: createDemoTour(),
    lead: null,
    ...createDemoSessionData(),
  };
  sessions.set(id, session);
  return clone(session);
}

export function getSession(id: string | null | undefined): DemoSession | null {
  if (!id) return null;
  const session = sessions.get(id);
  if (!session) return null;
  if (session.expiresAt <= now()) {
    sessions.delete(id);
    return null;
  }
  session.lastSeenAt = now();
  session.expiresAt = now() + DEMO_SESSION_TTL_MS;
  return clone(session);
}

function mutate(id: string): DemoSession | null {
  const session = sessions.get(id);
  if (!session) return null;
  if (session.expiresAt <= now()) {
    sessions.delete(id);
    return null;
  }
  session.lastSeenAt = now();
  session.expiresAt = now() + DEMO_SESSION_TTL_MS;
  return session;
}

export function resetSession(id: string): DemoSession | null {
  const current = sessions.get(id);
  if (!current) return null;
  const fresh = createSession(id);
  const stored = sessions.get(id);
  if (!stored) return fresh;
  stored.mode = current.mode;
  stored.tour = {
    active: current.mode === "guided",
    stepIndex: 0,
    completed: [],
    finished: false,
  };
  pushActivity(stored, "reset", "נתוני הדמו אופסו לנקודת ההתחלה");
  return clone(stored);
}

export function setSessionMode(
  id: string,
  mode: "guided" | "free"
): DemoSession | null {
  const session = mutate(id);
  if (!session) return null;
  session.mode = mode;
  session.tour.active = mode === "guided";
  if (mode === "guided" && session.tour.finished) {
    session.tour.finished = false;
    session.tour.stepIndex = 0;
  }
  return clone(session);
}

export function patchTour(
  id: string,
  patch: Partial<DemoSession["tour"]>
): DemoSession | null {
  const session = mutate(id);
  if (!session) return null;
  session.tour = { ...session.tour, ...patch };
  return clone(session);
}

function findGuest(session: DemoSession, guestId: string) {
  return session.guests.find(
    (guest) => guest._id === guestId || guest.token === guestId || guest.id === guestId
  );
}

export function addGuest(
  id: string,
  input: Partial<DemoGuest>
): { session: DemoSession; guest: DemoGuest } | null {
  const session = mutate(id);
  if (!session) return null;
  const name = String(input.name || "").trim();
  if (!name) return null;
  const guestId = String(input._id || createSessionId());
  const guestsCount = Math.max(1, Number(input.guestsCount) || 1);
  const guest: DemoGuest = {
    _id: guestId,
    id: guestId,
    name,
    phone: String(input.phone || "").replace(/\D/g, ""),
    token: String(input.token || `dmo_${guestId.slice(-8)}`),
    relation: input.relation || "",
    groupId: input.groupId || null,
    tableId: null,
    tableName: "",
    rsvp: "pending",
    guestsCount,
    arrivedCount: 0,
    actualArrivedCount: 0,
    notes: input.notes || "",
    openCount: 0,
    callRounds: [],
    createdAt: new Date().toISOString(),
  };
  session.guests = [...session.guests, guest];
  pushActivity(session, "add-guest", `נוספה רשומת אורח: ${guest.name}`);
  return { session: clone(session), guest: clone(guest) };
}

export function updateGuest(
  id: string,
  guestId: string,
  patch: Partial<DemoGuest>
): { session: DemoSession; guest: DemoGuest } | null {
  const session = mutate(id);
  if (!session) return null;
  const guest = findGuest(session, guestId);
  if (!guest) return null;

  if (patch.name != null) guest.name = String(patch.name).trim() || guest.name;
  if (patch.phone != null) guest.phone = String(patch.phone).replace(/\D/g, "");
  if (patch.relation != null) guest.relation = String(patch.relation);
  if (patch.notes != null) guest.notes = String(patch.notes);
  if (patch.groupId !== undefined) guest.groupId = patch.groupId;
  if (patch.rsvp) {
    guest.rsvp = patch.rsvp;
    guest.rsvpRespondedAt = new Date().toISOString();
  }
  if (patch.guestsCount != null) {
    guest.guestsCount = Math.max(1, Number(patch.guestsCount) || 1);
  }
  if (patch.arrivedCount != null) {
    guest.arrivedCount = Math.max(0, Number(patch.arrivedCount) || 0);
  } else if (patch.rsvp) {
    guest.arrivedCount =
      patch.rsvp === "yes" ? Math.max(1, guest.guestsCount) : 0;
  }
  if (patch.actualArrivedCount != null) {
    guest.actualArrivedCount = Math.max(0, Number(patch.actualArrivedCount) || 0);
  }
  if (patch.callRounds) guest.callRounds = patch.callRounds;
  if (patch.tableId !== undefined) guest.tableId = patch.tableId;
  if (patch.tableName !== undefined) guest.tableName = patch.tableName;
  if (patch.tableNumber !== undefined) guest.tableNumber = patch.tableNumber;

  pushActivity(session, "update-guest", `עודכנה רשומת האורח ${guest.name}`);
  return { session: clone(session), guest: clone(guest) };
}

export function deleteGuest(id: string, guestId: string): DemoSession | null {
  const session = mutate(id);
  if (!session) return null;
  const guest = findGuest(session, guestId);
  if (!guest) return null;
  session.guests = session.guests.filter((item) => item._id !== guest._id);
  for (const table of session.tables) {
    table.seatedGuests = table.seatedGuests.filter(
      (seat) => seat.guestId !== guest._id
    );
  }
  pushActivity(session, "delete-guest", `נמחקה רשומת האורח ${guest.name}`);
  return clone(session);
}

export function markLinkOpened(id: string, token: string): DemoSession | null {
  const session = mutate(id);
  if (!session) return null;
  const guest = findGuest(session, token);
  if (!guest) return clone(session);
  const stamp = new Date().toISOString();
  guest.openCount = Number(guest.openCount || 0) + 1;
  guest.lastOpenedAt = stamp;
  if (!guest.firstOpenedAt) guest.firstOpenedAt = stamp;
  pushActivity(session, "open-link", `${guest.name} פתח/ה את הקישור האישי`);
  return clone(session);
}

export function respondByToken(
  id: string,
  token: string,
  rsvp: DemoRsvp,
  arrivedCount: number
): DemoSession | null {
  const session = mutate(id);
  if (!session) return null;
  const guest = findGuest(session, token);
  if (!guest) return null;
  guest.rsvp = rsvp;
  guest.arrivedCount = rsvp === "yes" ? Math.max(1, arrivedCount || guest.guestsCount) : 0;
  guest.rsvpRespondedAt = new Date().toISOString();
  const label =
    rsvp === "yes" ? "אישר/ה הגעה" : rsvp === "no" ? "עדכן/ה שלא יגיע/תגיע" : "סימן/ה שמתלבט/ת";
  pushActivity(session, "rsvp", `${guest.name} ${label}`);
  return clone(session);
}

const EXTERNAL_SEND_BLOCKED = true;

export function simulateMessageRound(
  id: string,
  input: {
    channel: "whatsapp" | "sms";
    type?: string;
    round?: number;
    guestIds?: string[];
    scheduled?: boolean;
  }
): { session: DemoSession; sent: number } | null {
  const session = mutate(id);
  if (!session) return null;
  if (!EXTERNAL_SEND_BLOCKED) return null;

  const channel = input.channel === "sms" ? "sms" : "whatsapp";
  const rawType = String(input.type || "rsvp");
  const type =
    rawType === "table" || rawType === "reminder"
      ? "reminder"
      : rawType === "custom" || rawType === "thankyou"
        ? "thankyou"
        : "rsvp";
  const round = Number(input.round || 1);
  const ids = Array.isArray(input.guestIds) ? input.guestIds.map(String) : [];
  const recipients =
    ids.length > 0
      ? session.guests.filter((guest) => ids.includes(guest._id) || ids.includes(guest.id))
      : session.guests.filter((guest) => (round === 1 ? true : guest.rsvp === "pending"));

  session.messages.unshift({
    id: createSessionId(),
    channel,
    type,
    round,
    simulated: true,
    scheduled: Boolean(input.scheduled),
    sentAt: new Date().toISOString(),
    recipientCount: recipients.length,
  });

  const invitation = session.invitation as Record<string, any>;
  const key = `round${round}`;
  invitation.rsvpRoundSent = invitation.rsvpRoundSent || {};
  invitation.rsvpRoundSent[key] = {
    sentAt: new Date().toISOString(),
    channel,
    sentCount: recipients.length,
    simulated: true,
  };

  const channelLabel = channel === "sms" ? "SMS" : "WhatsApp";
  pushActivity(
    session,
    "simulate-send",
    `הודגם סבב ${round} ב-${channelLabel} ל-${recipients.length} נמענים. לא נשלחה הודעה אמיתית.`
  );

  return { session: clone(session), sent: recipients.length };
}

export function simulateIvrDigit(
  id: string,
  guestId: string,
  digit: "1" | "2" | "3"
): DemoSession | null {
  const session = mutate(id);
  if (!session) return null;
  const guest = findGuest(session, guestId);
  if (!guest) return null;

  const rsvp: DemoRsvp = digit === "1" ? "yes" : digit === "2" ? "no" : "maybe";
  guest.rsvp = rsvp;
  guest.arrivedCount = rsvp === "yes" ? Math.max(1, guest.guestsCount) : 0;
  guest.rsvpRespondedAt = new Date().toISOString();
  guest.callRounds = [
    ...(guest.callRounds || []),
    {
      roundNumber: 1,
      answerStatus: "answered",
      resultStatus: rsvp === "yes" ? "yes" : rsvp === "no" ? "no" : "undecided",
      amount: guest.arrivedCount,
      calledAt: new Date().toISOString(),
      channel: "ivr",
      simulated: true,
      notes:
        digit === "1"
          ? "הדמיית IVR: האורח הקיש 1 — מגיע"
          : digit === "2"
            ? "הדמיית IVR: האורח הקיש 2 — לא מגיע"
            : "הדמיית IVR: האורח הקיש 3 — מתלבט",
    },
  ];
  pushActivity(
    session,
    "ivr",
    `${guest.name} הקיש ${digit} בשיחת IVR לדוגמה. הסטטוס עודכן בדשבורד.`
  );
  return clone(session);
}

export function syncSeating(
  id: string,
  tables: DemoTable[]
): DemoSession | null {
  const session = mutate(id);
  if (!session) return null;
  session.tables = tables.map((table) => ({
    ...table,
    seats: Number(table.seats || table.capacity || 0),
    capacity: Number(table.capacity || table.seats || 0),
    seatedGuests: Array.isArray(table.seatedGuests) ? table.seatedGuests : [],
  }));
  syncGuestTables(session);
  const occupied = session.tables.reduce(
    (sum, table) => sum + table.seatedGuests.length,
    0
  );
  pushActivity(session, "seat-guest", `מפת ההושבה עודכנה. ${occupied} מושבים תפוסים.`);
  return clone(session);
}

export function assignGuestToTable(
  id: string,
  guestId: string,
  tableId: string
): DemoSession | null {
  const session = mutate(id);
  if (!session) return null;
  const guest = findGuest(session, guestId);
  const table = session.tables.find((item) => item.id === tableId);
  if (!guest || !table) return null;

  for (const item of session.tables) {
    item.seatedGuests = item.seatedGuests.filter((seat) => seat.guestId !== guest._id);
  }
  const count = Math.max(1, guest.rsvp === "yes" ? guest.arrivedCount || guest.guestsCount : guest.guestsCount);
  const used = new Set(table.seatedGuests.map((seat) => seat.seatIndex));
  let seatIndex = 0;
  for (let i = 0; i < count; i += 1) {
    while (used.has(seatIndex)) seatIndex += 1;
    table.seatedGuests.push({ guestId: guest._id, seatIndex });
    used.add(seatIndex);
    seatIndex += 1;
  }
  syncGuestTables(session);
  pushActivity(session, "seat-guest", `${guest.name} שובץ/ה ל${table.name}`);
  return clone(session);
}

export function syncCheckIn(
  id: string,
  counts: Array<{ token: string; checkedInGuestCount: number }>
): DemoSession | null {
  const session = mutate(id);
  if (!session) return null;
  for (const row of counts) {
    const guest = findGuest(session, row.token);
    if (!guest) continue;
    const next = Math.max(0, Math.floor(Number(row.checkedInGuestCount) || 0));
    if (next !== Number(guest.actualArrivedCount || 0)) {
      guest.actualArrivedCount = next;
      if (next > 0) {
        pushActivity(session, "check-in", `${guest.name} סומן/ה בכניסה (${next})`);
      }
    }
  }
  return clone(session);
}

export function updateEventDetails(
  id: string,
  patch: Record<string, unknown>
): DemoSession | null {
  const session = mutate(id);
  if (!session) return null;
  const invitation = session.invitation as Record<string, any>;
  if (typeof patch.title === "string" && patch.title.trim()) {
    invitation.title = patch.title.trim();
    invitation.eventTitle = patch.title.trim();
    invitation.eventName = patch.title.trim();
    session.event.title = patch.title.trim();
  }
  if (typeof patch.eventDate === "string" && patch.eventDate) {
    invitation.eventDate = patch.eventDate;
    session.event.date = patch.eventDate;
  }
  if (typeof patch.eventTime === "string" && patch.eventTime) {
    invitation.eventTime = patch.eventTime;
    session.event.time = patch.eventTime;
  }
  if (typeof patch.eventType === "string") {
    invitation.eventType = patch.eventType;
    session.event.eventType = patch.eventType;
  }
  if (typeof patch.hostsNames === "string") invitation.hostsNames = patch.hostsNames;
  if (patch.location && typeof patch.location === "object") {
    invitation.location = {
      ...(invitation.location || {}),
      ...(patch.location as object),
    };
    const location = invitation.location || {};
    if (location.name) session.event.venue = String(location.name);
    if (location.address) session.event.location = String(location.address);
    if (location.lat != null) session.event.lat = Number(location.lat);
    if (location.lng != null) session.event.lng = Number(location.lng);
  }
  pushActivity(session, "event-details", "פרטי האירוע בדמו עודכנו");
  return clone(session);
}

export function saveIvrSchedule(
  id: string,
  rounds: DemoSession["ivrSchedule"]
): DemoSession | null {
  const session = mutate(id);
  if (!session) return null;
  session.ivrSchedule = rounds.map((round) => ({
    roundNumber: Number(round.roundNumber),
    title: round.title || `סבב מוקלט ${round.roundNumber}`,
    scheduledAt: round.scheduledAt || "",
    notes: round.notes || "",
    status: round.status || "scheduled",
  }));
  pushActivity(session, "ivr-schedule", "תזמון סבבי IVR נשמר בדמו בלבד");
  return clone(session);
}

export function saveLead(id: string, lead: Omit<DemoLead, "createdAt">): DemoInquiry | null {
  const session = mutate(id);
  if (!session) return null;
  const record: DemoInquiry = {
    id: createSessionId(),
    sessionId: id,
    name: lead.name.trim(),
    phone: lead.phone.trim(),
    email: lead.email.trim(),
    note: lead.note?.trim() || "",
    createdAt: new Date().toISOString(),
  };
  session.lead = record;
  inquiries.push(record);
  pushActivity(session, "lead", "נשמרו פרטים לקבלת הצעה");
  return clone(record);
}

export function listInquiries() {
  return clone(inquiries);
}

export function sessionCount() {
  return sessions.size;
}

export function dropSession(id: string) {
  sessions.delete(id);
}

export function expireSession(id: string) {
  const session = sessions.get(id);
  if (!session) return;
  session.expiresAt = Date.now() - 1000;
}
