import {
  addGuest,
  assignGuestToTable,
  deleteGuest,
  markLinkOpened,
  respondByToken,
  saveIvrSchedule,
  simulateIvrDigit,
  simulateMessageRound,
  syncCheckIn,
  syncSeating,
  updateEventDetails,
  updateGuest,
} from "@/lib/demo/interactive/store";
import type { DemoSession } from "@/lib/demo/interactive/types";

export type BridgeResult = {
  status: number;
  json: Record<string, unknown>;
};

const BLOCKED_MESSAGE =
  "בדמו הפעולה לא יוצאת החוצה. אין שליחת WhatsApp, SMS, שיחה או חיוב אמיתיים.";

function blocked(extra: Record<string, unknown> = {}): BridgeResult {
  return {
    status: 403,
    json: {
      success: false,
      ok: false,
      simulated: true,
      code: "DEMO_ISOLATED",
      message: BLOCKED_MESSAGE,
      error: BLOCKED_MESSAGE,
      ...extra,
    },
  };
}

function ok(json: Record<string, unknown>, status = 200): BridgeResult {
  return { status, json };
}

function pathOf(raw: string) {
  const url = new URL(raw, "https://demo.invistimo.local");
  return { pathname: url.pathname, searchParams: url.searchParams };
}

function demoCustomer() {
  return {
    _id: "demo-owner",
    id: "demo-owner",
    role: "user",
    name: "מאיה לוי",
    plan: "premium",
    guests: 500,
    includeCalls: true,
    callsType: "ivr",
    includeDigitalSeating: true,
    includeSeating: true,
    hasPaid: true,
    isDemoSession: true,
    accessModules: {
      checkIn: true,
      liveDashboard: true,
      rsvpSeating: true,
      actualArrivals: true,
    },
    planLimits: {
      seatingEnabled: true,
      liveDashboard: true,
    },
  };
}

function invitationPayload(session: DemoSession) {
  return {
    ...session.invitation,
    event: {
      _id: session.event._id,
      title: session.event.title,
      date: session.event.date,
      time: session.event.time,
      location: (session.invitation as any).location,
    },
  };
}

function isExternalSend(pathname: string) {
  return (
    pathname.startsWith("/api/sms/") ||
    pathname.startsWith("/api/whatsapp") ||
    pathname.startsWith("/api/messages/") ||
    pathname.startsWith("/api/calls") ||
    pathname.startsWith("/api/telnyx") ||
    pathname.startsWith("/api/stripe") ||
    pathname.startsWith("/api/billing") ||
    pathname.startsWith("/api/payments") ||
    pathname.includes("/send")
  );
}

export function bridgeDemoRequest(
  session: DemoSession,
  method: string,
  rawPath: string,
  body: any
): BridgeResult {
  const verb = String(method || "GET").toUpperCase();
  const { pathname, searchParams } = pathOf(rawPath);
  let current = session;

  if (pathname === "/api/me" && verb === "GET") {
    return ok({
      success: true,
      user: {
        ...demoCustomer(),
        callRoundsSchedule: { enabled: true, rounds: current.ivrSchedule },
      },
    });
  }

  if (pathname === "/api/admin/manage-user") {
    return ok({ success: true, isManaging: false, managedUser: null });
  }

  if (pathname === "/api/invitations/my" && verb === "GET") {
    return ok({
      success: true,
      invitation: invitationPayload(current),
      user: demoCustomer(),
    });
  }

  if (pathname.startsWith("/api/invitations/") && verb === "GET") {
    return ok({
      success: true,
      invitation: invitationPayload(current),
      event: {
        ...current.event,
        _id: (current.invitation as any)._id,
        location: (current.invitation as any).location,
      },
    });
  }

  if (pathname.startsWith("/api/invitations/") && (verb === "PUT" || verb === "PATCH")) {
    const next = updateEventDetails(current.id, body || {});
    if (!next) return blocked();
    current = next;
    return ok({
      success: true,
      simulated: true,
      invitation: invitationPayload(current),
      locationWarning: null,
    });
  }

  if (pathname === "/api/guests" && verb === "GET") {
    return ok({ success: true, guests: current.guests });
  }

  const guestWrite = pathname.match(/^\/api\/guests\/([^/]+)$/);
  if (guestWrite && (verb === "PUT" || verb === "PATCH")) {
    const updated = updateGuest(current.id, decodeURIComponent(guestWrite[1]), body || {});
    if (!updated) return ok({ success: false, message: "האורח לא נמצא בדמו" }, 404);
    return ok({ success: true, simulated: true, guest: updated.guest });
  }

  if (guestWrite && verb === "DELETE") {
    const next = deleteGuest(current.id, decodeURIComponent(guestWrite[1]));
    if (!next) return ok({ success: false, message: "האורח לא נמצא בדמו" }, 404);
    return ok({ success: true, simulated: true });
  }

  const invitationGuests = pathname.match(/^\/api\/invitations\/([^/]+)\/guests$/);
  if (invitationGuests && verb === "POST") {
    const created = addGuest(current.id, body || {});
    if (!created) return ok({ success: false, error: "יש למלא שם" }, 400);
    return ok({ success: true, simulated: true, guest: created.guest });
  }

  if (pathname === "/api/guests/assign-table" && verb === "POST") {
    const next = assignGuestToTable(
      current.id,
      String(body?.guestId || ""),
      String(body?.tableId || "")
    );
    if (!next) return ok({ success: false, message: "לא הצלחנו לשבץ בדמו" }, 400);
    return ok({ success: true, simulated: true });
  }

  if (pathname === "/api/guests/remove-from-table" && verb === "POST") {
    const guestId = String(body?.guestId || "");
    const tables = current.tables.map((table) => ({
      ...table,
      seatedGuests: table.seatedGuests.filter((seat) => seat.guestId !== guestId),
    }));
    const next = syncSeating(current.id, tables);
    if (!next) return blocked();
    return ok({ success: true, simulated: true });
  }

  if (pathname === "/api/scheduled-messages" && verb === "GET") {
    return ok({
      success: true,
      messages: current.messages.map((message) => ({
        _id: message.id,
        channel: message.channel,
        type: message.type,
        round: message.round,
        scheduledAt: message.sentAt,
        simulated: true,
        status: message.scheduled ? "scheduled" : "simulated",
      })),
    });
  }

  if (pathname.startsWith("/api/scheduled/by-invitation")) {
    return ok({ success: true, schedule: null });
  }

  if (pathname.startsWith("/api/whatsapp/stats")) {
    const sent = current.messages.filter((message) => message.channel === "whatsapp");
    return ok({
      success: true,
      simulated: true,
      stats: { sent: sent.reduce((sum, message) => sum + message.recipientCount, 0) },
    });
  }

  if (
    (pathname === "/api/whatsapp/send-template" || pathname === "/api/sms/send") &&
    verb === "POST"
  ) {
    const channel = pathname.includes("sms") ? "sms" : "whatsapp";
    const result = simulateMessageRound(current.id, {
      channel,
      type: body?.type || body?.templateKey || "rsvp",
      round: Number(body?.round || body?.roundNumber || 1),
      guestIds: body?.guestIds || body?.audience || [],
      scheduled: Boolean(body?.scheduledAt),
    });
    if (!result) return blocked();
    return ok({
      success: true,
      simulated: true,
      scheduled: Boolean(body?.scheduledAt),
      sent: result.sent,
      message: "הסבב הודגם בתוך הדמו. לא נשלחה הודעה אמיתית.",
    });
  }

  if (pathname === "/api/sms/preview" || pathname === "/api/sms/test") {
    return ok({
      success: true,
      simulated: true,
      preview: "תצוגה מקדימה בלבד. ההודעה לא נשלחה.",
      message: BLOCKED_MESSAGE,
    });
  }

  if (pathname === "/api/ivr/config" && verb === "GET") {
    return ok({
      ok: true,
      simulated: true,
      ivrConfig: {
        eventName: current.event.title,
        eventNamePronunciation: current.event.title,
        audioMode: "ai",
        eventNameAudio: {
          status: "ready",
          approved: true,
          audioUrl: "",
        },
        composedIntroAudio: { approved: true },
        introAudio: { status: "idle", approved: false, audioUrl: "" },
        previewAudio: { seamless: false, playlist: [] },
        recordingApproval: { approved: true },
        systemVoices: [],
      },
    });
  }

  if (pathname === "/api/ivr/config" && (verb === "PATCH" || verb === "PUT" || verb === "POST")) {
    return ok({
      ok: true,
      simulated: true,
      message: "ההגדרה נשמרה בדמו. לא נוצר שמע ולא יצאה שיחה.",
      ivrConfig: {
        eventName: body?.eventName || current.event.title,
        audioMode: body?.audioMode || "ai",
        eventNameAudio: { status: "ready", approved: true, audioUrl: "" },
        composedIntroAudio: { approved: true },
        introAudio: { status: "idle", approved: false },
        previewAudio: { seamless: false },
      },
    });
  }

  if (pathname.startsWith("/api/ivr/rounds/stats")) {
    return ok({
      ok: true,
      simulated: true,
      rounds: [1, 2, 3].map((round) => ({
        round,
        dialed: 0,
        answered: current.guests.filter((guest) =>
          (guest.callRounds || []).some((item) => item.channel === "ivr" && item.roundNumber === round)
        ).length,
        failed: 0,
      })),
    });
  }

  if (pathname.startsWith("/api/ivr/history")) {
    const guestId = searchParams.get("guestId") || "";
    const guest = current.guests.find((item) => item._id === guestId);
    const attempts = (guest?.callRounds || [])
      .filter((round) => round.channel === "ivr")
      .map((round) => ({
        digit: round.resultStatus === "yes" ? "1" : round.resultStatus === "no" ? "2" : "3",
        resultStatus: round.resultStatus,
        at: round.calledAt,
        simulated: true,
      }));
    return ok({ ok: true, attempts });
  }

  if (pathname === "/api/ivr/schedule" && (verb === "PUT" || verb === "POST")) {
    const rounds = Array.isArray(body?.rounds) ? body.rounds : current.ivrSchedule;
    const next = saveIvrSchedule(current.id, rounds);
    if (!next) return blocked();
    return ok({
      ok: true,
      simulated: true,
      callRoundsSchedule: { enabled: true, rounds: next.ivrSchedule },
    });
  }

  if (pathname.startsWith("/api/ivr/audio")) {
    return ok({
      ok: true,
      simulated: true,
      message: "העלאת שמע חסומה בדמו ולא נשמרת מחוץ לסשן.",
    });
  }

  if (pathname.startsWith("/api/invite/") && verb === "GET") {
    const token = searchParams.get("token") || "";
    if (token) markLinkOpened(current.id, token);
    const guest = current.guests.find((item) => item.token === token) || null;
    return ok({
      success: true,
      simulated: true,
      invitation: invitationPayload(current),
      event: current.event,
      guest,
    });
  }

  if (pathname.startsWith("/api/invitationGuests/respondByToken/") && verb === "POST") {
    const token = pathname.split("/").pop() || "";
    const rsvp = body?.rsvp || body?.status || "pending";
    const next = respondByToken(
      current.id,
      token,
      rsvp,
      Number(body?.arrivedCount || body?.guestsCount || 1)
    );
    if (!next) return ok({ success: false, error: "האורח לא נמצא בדמו" }, 404);
    return ok({ success: true, simulated: true });
  }

  if (pathname.startsWith("/api/check-in/")) {
    if (verb === "GET") {
      return ok({
        success: true,
        checkInEnabled: true,
        live: true,
        invitationId: (current.invitation as any)._id,
        simulated: true,
      });
    }
    const counts = Array.isArray(body?.counts) ? body.counts : [];
    if (counts.length) syncCheckIn(current.id, counts);
    return ok({ success: true, simulated: true, live: true });
  }

  if (verb !== "GET" && isExternalSend(pathname)) {
    return blocked();
  }

  if (verb !== "GET") {
    return blocked();
  }

  return ok({ success: true, simulated: true, guests: [], messages: [], data: null });
}

export function applyExplicitDemoAction(sessionId: string, body: any) {
  const type = String(body?.type || "");
  if (type === "addGuest") return addGuest(sessionId, body.guest || body);
  if (type === "updateGuest") return updateGuest(sessionId, body.guestId, body.patch || body.guest || {});
  if (type === "deleteGuest") return deleteGuest(sessionId, body.guestId);
  if (type === "ivr") return simulateIvrDigit(sessionId, body.guestId, body.digit);
  if (type === "syncCheckIn") return syncCheckIn(sessionId, body.counts || []);
  if (type === "syncSeating") return syncSeating(sessionId, body.tables || []);
  if (type === "message") {
    return simulateMessageRound(sessionId, body);
  }
  return null;
}
