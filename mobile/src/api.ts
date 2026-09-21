import Constants from "expo-constants";
import * as Device from "expo-device";
import { readLoginTokenFromBody } from "@/src/authToken";
import { customerError, networkErrorMessage, timeoutErrorMessage } from "@/src/errors";
import {
  accessTokenNeedsRefresh,
  clearSecureSession,
  readSecureSession,
  saveSecureSession,
} from "@/src/sessionStore";

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  extra?.apiUrl ||
  "https://www.invistimo.com"
).replace(/\/$/, "");

type Session = {
  token: string | null;
  refreshToken: string | null;
};

let session: Session = { token: null, refreshToken: null };
let onUnauthorized: (() => void) | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export function setAuthToken(token: string | null, refreshToken?: string | null) {
  session = {
    token,
    refreshToken: refreshToken === undefined ? session.refreshToken : refreshToken,
  };
}

export function getAuthToken() {
  return session.token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export function tokenFromLoginResponse(_res: Response, body: unknown) {
  return readLoginTokenFromBody(body);
}

function nativeHeaders() {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("X-Invistimo-Client", "native");
  return headers;
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function persistSession(accessToken: string, refreshToken?: string | null) {
  setAuthToken(accessToken, refreshToken ?? session.refreshToken);
  await saveSecureSession({
    accessToken,
    refreshToken: refreshToken ?? session.refreshToken,
  });
}

export async function hydrateSessionFromStore() {
  const stored = await readSecureSession();
  session = {
    token: stored.accessToken,
    refreshToken: stored.refreshToken,
  };
  return stored;
}

export async function refreshAccessToken() {
  if (!session.refreshToken) return false;
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const headers = nativeHeaders();
      headers.set("Content-Type", "application/json");
      const res = await fetchWithTimeout(`${API_URL}/api/auth/mobile/refresh`, {
        method: "POST",
        headers,
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        token?: string;
        refreshToken?: string;
      };
      if (!res.ok || !data.success || !data.token) return false;
      await persistSession(data.token, data.refreshToken || session.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function api<T = Record<string, unknown>>(
  path: string,
  init: RequestInit = {},
  options?: { auth?: boolean; _retried?: boolean }
) {
  if (options?.auth !== false && session.token && accessTokenNeedsRefresh(session.token)) {
    await refreshAccessToken();
  }

  const headers = nativeHeaders();
  const incoming = new Headers(init.headers);
  incoming.forEach((value, key) => headers.set(key, value));
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options?.auth !== false && session.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_URL}${path}`, { ...init, headers });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    throw new Error(aborted ? timeoutErrorMessage : networkErrorMessage);
  }

  const data = (await res.json().catch(() => ({}))) as T;
  if (
    res.status === 401 &&
    options?.auth !== false &&
    !options?._retried &&
    session.refreshToken
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return api<T>(path, init, { ...options, _retried: true });
    }
    await clearSecureSession();
    setAuthToken(null, null);
    onUnauthorized?.();
  } else if (res.status === 401 && options?.auth !== false) {
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
  impersonationRole?: string;
  originalTargetRole?: string;
  venueOwner?: boolean;
  venueUser?: boolean;
  isVenueUser?: boolean;
  staffType?: string | null;
  employeeScope?: string | null;
  isProducerStaff?: boolean;
  isSystemStaff?: boolean;
  isUsherStaff?: boolean;
  hasPaid?: boolean;
  isTrial?: boolean;
  guests?: number;
  packageName?: string;
  includeSeating?: boolean;
  includeDigitalSeating?: boolean;
  includeCalls?: boolean;
  includeCreditGifts?: boolean;
  includeEventManagement?: boolean;
  includeTransportationManagement?: boolean;
  includeWeddingChallenges?: boolean;
  weddingChallengesOnly?: boolean;
  selfManageEnabled?: boolean;
  guestExperienceType?: string;
  callRoundsSchedule?: { enabled?: boolean; rounds?: unknown[] } | unknown[];
  accessModules?: Record<string, boolean>;
  features?: Record<string, boolean>;
  permissions?: Record<string, boolean>;
  planLimits?: Record<string, boolean | number | undefined>;
  salesUpsells?: {
    weddingChallenges?: { enabled?: boolean; price?: number };
  };
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
  tableId?: string | null;
  tableName?: string;
  tableNumber?: number | null;
  groupId?: string | null;
  token?: string;
  firstOpenedAt?: string | null;
  lastOpenedAt?: string | null;
  openCount?: number;
  respondedAt?: string;
  rsvpRespondedAt?: string;
  rsvpUpdatedAt?: string;
  lastResponseAt?: string;
  callRounds?: unknown[];
};

export type GuestGroup = {
  _id: string;
  name: string;
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
    refreshToken?: string;
    user?: MeUser;
  }>(
    "/api/login",
    {
      method: "POST",
      headers: { "X-Invistimo-Client": "native" },
      body: JSON.stringify({
        email: identifier,
        password,
        client: "native",
        deviceLabel: [Device.osName, Device.modelName].filter(Boolean).join(" ").slice(0, 80),
      }),
    },
    { auth: false }
  );

  const token = tokenFromLoginResponse(result.response, result.data);
  return { ...result, token, refreshToken: result.data.refreshToken || null };
}

export async function logoutRequest(
  refreshToken = session.refreshToken,
  extra?: { expoPushToken?: string; deviceId?: string }
) {
  if (!refreshToken) return;
  await api(
    "/api/auth/mobile/logout",
    {
      method: "POST",
      body: JSON.stringify({
        refreshToken,
        expoPushToken: extra?.expoPushToken || "",
        deviceId: extra?.deviceId || "",
      }),
    },
    { auth: false }
  ).catch(() => undefined);
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
    usage?: GuestUsage | null;
    error?: string;
    message?: string;
  }>(`/api/guests?invitation=${encodeURIComponent(invitationId)}`);
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

export async function fetchGuestGroups(invitationId: string) {
  return api<{ success?: boolean; groups?: GuestGroup[] }>(
    `/api/groups?invitationId=${encodeURIComponent(invitationId)}`
  );
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

export { customerError };
