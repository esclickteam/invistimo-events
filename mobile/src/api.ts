import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  extra?.apiUrl ||
  "https://www.invistimo.com"
).replace(/\/$/, "");

type Session = {
  token: string | null;
};

let session: Session = { token: null };
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  session = { token };
}

export function getAuthToken() {
  return session.token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

function readSetCookie(res: Response) {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  const values =
    typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  const single = res.headers.get("set-cookie");
  return [...values, single].filter(Boolean).join("; ");
}

export function tokenFromLoginResponse(res: Response, body: unknown) {
  const fromHeader = readSetCookie(res).match(/(?:^|;\s*)authToken=([^;]+)/);
  if (fromHeader?.[1]) {
    try {
      return decodeURIComponent(fromHeader[1]);
    } catch {
      return fromHeader[1];
    }
  }
  if (body && typeof body === "object") {
    const token = (body as { token?: unknown }).token;
    if (typeof token === "string" && token) return token;
  }
  return null;
}

export async function api<T = Record<string, unknown>>(
  path: string,
  init: RequestInit = {},
  options?: { auth?: boolean }
) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options?.auth !== false && session.token) {
    headers.set("Cookie", `authToken=${session.token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  const data = (await res.json().catch(() => ({}))) as T;
  if (res.status === 401 && options?.auth !== false) {
    onUnauthorized?.();
  }
  return { ok: res.ok, status: res.status, data, response: res };
}

export type MeUser = {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  effectiveRole?: string;
  hasPaid?: boolean;
  isTrial?: boolean;
  guests?: number;
  packageName?: string;
  includeSeating?: boolean;
  includeCalls?: boolean;
  includeCreditGifts?: boolean;
  includeEventManagement?: boolean;
  includeTransportationManagement?: boolean;
  includeWeddingChallenges?: boolean;
  weddingChallengesOnly?: boolean;
  accessModules?: Record<string, boolean>;
  features?: Record<string, boolean>;
  permissions?: Record<string, boolean>;
};

export type Invitation = {
  _id: string;
  eventId?: string;
  shareId?: string;
  title?: string;
  eventDate?: string;
  eventTime?: string;
  location?: unknown;
  previewImage?: string;
  scheduledMessages?: ScheduledMessage[];
  invitationSettings?: Record<string, unknown>;
  [key: string]: unknown;
};

export type Guest = {
  _id: string;
  name: string;
  phone?: string;
  relation?: string;
  notes?: string;
  rsvp?: string;
  guestsCount?: number;
  arrivedCount?: number;
  actualArrivedCount?: number;
  tableName?: string;
  tableNumber?: number | null;
  groupId?: string | null;
  token?: string;
  callRounds?: unknown[];
};

export type GuestUsage = {
  current?: number;
  limit?: number;
  remaining?: number;
};

export type ScheduledMessage = {
  _id?: string;
  type?: string;
  channel?: string;
  status?: string;
  scheduledAt?: string;
  sentAt?: string;
  templateKey?: string;
};

export async function loginRequest(identifier: string, password: string) {
  const result = await api<{
    success?: boolean;
    error?: string;
    token?: string;
    user?: MeUser;
  }>(
    "/api/login",
    {
      method: "POST",
      body: JSON.stringify({ email: identifier, password }),
    },
    { auth: false }
  );

  const token = tokenFromLoginResponse(result.response, result.data);
  return { ...result, token };
}

export async function fetchMe() {
  const result = await api<{ success?: boolean; user?: MeUser }>("/api/me");
  if (!result.ok || !result.data.user) return null;
  return result.data.user;
}

export async function fetchInvitation() {
  const result = await api<{ success?: boolean; invitation?: Invitation | null }>(
    "/api/invitations/my"
  );
  return result.data.invitation || null;
}

export async function fetchEvent() {
  const result = await api<{ success?: boolean; event?: Record<string, unknown> | null }>(
    "/api/events"
  );
  return result.data.event || null;
}

export async function fetchGuests(invitationId: string) {
  const result = await api<{
    success?: boolean;
    guests?: Guest[];
    usage?: GuestUsage;
    error?: string;
    message?: string;
  }>(`/api/invitations/${invitationId}/guests`);
  return result;
}

export async function createGuest(
  invitationId: string,
  guest: {
    name: string;
    phone: string;
    relation?: string;
    rsvp?: string;
    guestsCount?: number;
    notes?: string;
  }
) {
  return api<{
    success?: boolean;
    error?: string;
    message?: string;
    code?: string;
    guest?: Guest;
  }>(`/api/invitations/${invitationId}/guests`, {
    method: "POST",
    body: JSON.stringify(guest),
  });
}

export async function updateGuest(guestId: string, patch: Record<string, unknown>) {
  return api(`/api/guests/${guestId}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function deleteGuest(guestId: string) {
  return api(`/api/guests/${guestId}`, { method: "DELETE" });
}

export async function importGuests(
  invitationId: string,
  guests: Record<string, unknown>[]
) {
  return api<{
    success?: boolean;
    count?: number;
    message?: string;
    error?: string;
    code?: string;
  }>("/api/guests/import", {
    method: "POST",
    body: JSON.stringify({ invitationId, guests }),
  });
}

export function notesWithEmail(email: string, notes = "") {
  const cleanEmail = email.trim();
  const cleanNotes = notes.trim();
  if (!cleanEmail) return cleanNotes;
  const line = `אימייל: ${cleanEmail}`;
  if (!cleanNotes) return line;
  if (cleanNotes.includes(cleanEmail)) return cleanNotes;
  return `${line}\n${cleanNotes}`;
}
