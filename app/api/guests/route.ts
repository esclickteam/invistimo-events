import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import SeatingTable from "@/models/SeatingTable";
import User from "@/models/User";
import CallTask from "@/models/CallTask";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import mongoose, { Types } from "mongoose";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   Types
========================================================= */

type SeatedGuest = {
  guestId: Types.ObjectId;
  seatIndex: number;
};

type TableItem = {
  id: string;
  name?: string;
  seatedGuests?: SeatedGuest[];
};

type SeatingDoc = {
  eventId: Types.ObjectId;
  tables?: TableItem[];
};

type InvitationDoc = {
  _id: Types.ObjectId;
  eventId?: Types.ObjectId;
  ownerId?: Types.ObjectId;
  userId?: Types.ObjectId;
  producerId?: Types.ObjectId;
  guests?: any[];
};

type GuestDoc = {
  _id: Types.ObjectId;
  invitationId: Types.ObjectId;
  actualArrivedCount?: number;
  [key: string]: any;
};

/* =========================================================
   Helpers
========================================================= */

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toObjectId(value: unknown) {
  const id = cleanString(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

function objectIdOrString(value: unknown) {
  const stringValue = cleanString(value);
  const objectIdValue = toObjectId(stringValue);

  return objectIdValue ? [objectIdValue, stringValue] : [stringValue];
}

function getCollection(name: string) {
  return mongoose.connection.db?.collection(name);
}

function normalizeRsvp(value: unknown): "yes" | "no" | "pending" {
  const raw = cleanString(value).toLowerCase();

  if (
    raw === "yes" ||
    raw === "confirmed" ||
    raw === "arriving" ||
    raw === "arrive" ||
    raw === "attending" ||
    raw === "approved" ||
    raw === "מגיע" ||
    raw === "מגיעים" ||
    raw === "אישר" ||
    raw === "מאשר" ||
    raw.includes("מגיע")
  ) {
    return "yes";
  }

  if (
    raw === "no" ||
    raw === "declined" ||
    raw === "not_coming" ||
    raw === "not-coming" ||
    raw === "not coming" ||
    raw === "cancelled" ||
    raw === "לא מגיע" ||
    raw === "לא מגיעים" ||
    raw === "לא מאשר" ||
    raw.includes("לא מגיע")
  ) {
    return "no";
  }

  return "pending";
}

function normalizeEmbeddedGuest(row: any, invitationId: string) {
  const id = cleanString(row?._id || row?.id) || String(new mongoose.Types.ObjectId());

  const guestsCount =
    Number(
      row?.guestsCount ??
        row?.guestCount ??
        row?.quantity ??
        row?.amount ??
        row?.guestsAmount ??
        row?.totalGuests ??
        1
    ) || 1;

  const rsvp = normalizeRsvp(
    row?.rsvp ||
      row?.status ||
      row?.rsvpStatus ||
      row?.responseStatus ||
      row?.attendanceStatus ||
      "pending"
  );

  return {
    ...row,
    _id: id,
    id,
    invitationId,
    name: cleanString(row?.name),
    phone: cleanString(row?.phone),
    relation: cleanString(row?.relation),
    token: cleanString(row?.token),
    rsvp,
    guestsCount,
    arrivedCount:
      row?.arrivedCount !== undefined
        ? Number(row.arrivedCount) || 0
        : rsvp === "yes"
          ? guestsCount
          : 0,
    actualArrivedCount: Number(row?.actualArrivedCount || 0),
    notes: cleanString(row?.notes),
  };
}


function normalizePreRsvpMessagesAccess(user: any) {
  const preRsvpMessages = user?.salesUpsells?.preRsvpMessages || {};
  const mode = cleanString(preRsvpMessages.mode || "none");

  const saveTheDateEnabled = Boolean(
    preRsvpMessages.saveTheDateEnabled ??
      (mode === "save_the_date_only" || mode === "both")
  );

  const invitationOnlyEnabled = Boolean(
    preRsvpMessages.invitationOnlyEnabled ??
      (mode === "invitation_only" || mode === "both")
  );

  const saveTheDateSentCount = Number(
    preRsvpMessages.saveTheDateSentCount ||
      (mode === "save_the_date_only" ? preRsvpMessages.sentCount : 0) ||
      0
  );

  const invitationOnlySentCount = Number(
    preRsvpMessages.invitationOnlySentCount ||
      (mode === "invitation_only" ? preRsvpMessages.sentCount : 0) ||
      0
  );

  const saveTheDateSentAt =
    preRsvpMessages.saveTheDateSentAt ||
    (mode === "save_the_date_only" ? preRsvpMessages.sentAt : null) ||
    null;

  const invitationOnlySentAt =
    preRsvpMessages.invitationOnlySentAt ||
    (mode === "invitation_only" ? preRsvpMessages.sentAt : null) ||
    null;

  return {
    enabled: Boolean(preRsvpMessages.enabled),
    mode,
    price: Number(preRsvpMessages.price || 0),
    givenFree: Boolean(preRsvpMessages.givenFree),
    notes: cleanString(preRsvpMessages.notes),

    saveTheDateEnabled,
    invitationOnlyEnabled,

    saveTheDateSentCount,
    saveTheDateSentAt,

    invitationOnlySentCount,
    invitationOnlySentAt,

    sentCount: Number(preRsvpMessages.sentCount || 0),
    sentAt: preRsvpMessages.sentAt || null,
  };
}


async function canVenueOwnerAccessInvitation({
  userId,
  invitationId,
  eventId,
}: {
  userId: string;
  invitationId: string;
  eventId?: string | null;
}) {
  const events = getCollection("events");

  if (!events) return false;

  const userValues = objectIdOrString(userId);
  const invitationValues = objectIdOrString(invitationId);
  const eventValues = eventId ? objectIdOrString(eventId) : [];

  const orQuery: any[] = [
    { venueClientInvitationId: { $in: invitationValues } },
    { invitationId: { $in: invitationValues } },
  ];

  if (eventValues.length) {
    orQuery.push({ _id: { $in: eventValues } });
    orQuery.push({ venueClientEventId: { $in: eventValues } });
    orQuery.push({ linkedEventId: { $in: eventValues } });
    orQuery.push({ productionEventId: { $in: eventValues } });
  }

  const linkedEvent = await events.findOne(
    {
      venueOwnerId: { $in: userValues },
      venueAccessStatus: "linked",
      $or: orQuery,
    },
    {
      projection: {
        _id: 1,
        venueOwnerId: 1,
        venueClientInvitationId: 1,
        venueAccessStatus: 1,
      },
    }
  );

  return Boolean(linkedEvent);
}

async function attachTableNamesToGuests({
  guests,
  invitation,
}: {
  guests: any[];
  invitation: InvitationDoc;
}) {
  const eventId = invitation?.eventId;

  if (!eventId) {
    return guests.map((guest) => ({
      ...guest,
      actualArrivedCount: guest.actualArrivedCount ?? 0,
      tableName: guest.tableName || null,
    }));
  }

  const seatings = (await SeatingTable.find({
    eventId,
  }).lean()) as SeatingDoc[];

  const guestToTableMap = new Map<string, string>();

  for (const seating of seatings) {
    for (const table of seating.tables || []) {
      const tableName = table.name || "-";

      for (const seatedGuest of table.seatedGuests || []) {
        if (seatedGuest?.guestId) {
          guestToTableMap.set(String(seatedGuest.guestId), tableName);
        }
      }
    }
  }

  return guests.map((guest) => {
    const guestId = String(guest._id || guest.id || "");
    const foundTable = guestToTableMap.get(guestId);

    return {
      ...guest,
      actualArrivedCount: guest.actualArrivedCount ?? 0,
      tableName: foundTable || guest.tableName || null,
    };
  });
}


function normalizeCallRoundAnswerStatus(value: unknown) {
  const raw = cleanString(value).toLowerCase();

  if (
    raw === "answered" ||
    raw === "answer" ||
    raw === "yes" ||
    raw === "confirmed" ||
    raw === "declined" ||
    raw === "callback" ||
    raw === "will_reply_message" ||
    raw === "undecided" ||
    raw === "ענה" ||
    raw === "ענתה"
  ) {
    return "answered";
  }

  if (
    raw === "no_answer" ||
    raw === "not_answered" ||
    raw === "unanswered" ||
    raw === "needs_fix" ||
    raw === "wrong_number" ||
    raw === "לא ענה" ||
    raw === "לא ענתה" ||
    raw === "אין מענה"
  ) {
    return "no_answer";
  }

  return "";
}

function normalizeCallRoundResultStatus(value: unknown) {
  const raw = cleanString(value).toLowerCase();

  if (
    raw === "yes" ||
    raw === "confirmed" ||
    raw === "attending" ||
    raw === "arriving" ||
    raw === "מגיע" ||
    raw === "מגיעה" ||
    raw === "מגיעים"
  ) {
    return "yes";
  }

  if (
    raw === "no" ||
    raw === "declined" ||
    raw === "not_attending" ||
    raw === "not_coming" ||
    raw === "לא מגיע" ||
    raw === "לא מגיעה" ||
    raw === "לא מגיעים"
  ) {
    return "no";
  }

  if (raw === "will_reply" || raw === "will_reply_message") {
    return "will_reply";
  }

  if (raw === "callback" || raw === "call_back" || raw === "follow_up") {
    return "callback";
  }

  if (raw === "no_answer" || raw === "not_answered" || raw === "unanswered") {
    return "no_answer";
  }

  if (
    raw === "needs_correction" ||
    raw === "needs_fix" ||
    raw === "wrong_number" ||
    raw === "requires_correction"
  ) {
    return "needs_correction";
  }

  if (raw === "undecided" || raw === "maybe") {
    return "undecided";
  }

  return raw || "";
}

function normalizeGuestCallRoundsForApi(guest: any) {
  const result: any[] = [];

  const addRound = (roundNumber: number, source: any) => {
    if (!source || !roundNumber) return;

    const status = cleanString(source.status || source.callStatus || source.result);
    const resultValue = cleanString(source.result || source.resultStatus || status);

    const answerStatus =
      normalizeCallRoundAnswerStatus(source.answerStatus) ||
      normalizeCallRoundAnswerStatus(source.callAnswerStatus) ||
      normalizeCallRoundAnswerStatus(source.callAnswered) ||
      normalizeCallRoundAnswerStatus(status);

    const resultStatus =
      normalizeCallRoundResultStatus(source.resultStatus) ||
      normalizeCallRoundResultStatus(source.callResultStatus) ||
      normalizeCallRoundResultStatus(source.result) ||
      normalizeCallRoundResultStatus(source.answeredResult) ||
      normalizeCallRoundResultStatus(source.noAnswerResult) ||
      normalizeCallRoundResultStatus(status);

    if (!status && !resultValue && !answerStatus && !resultStatus) return;

    result.push({
      roundNumber,
      ...source,
      status: status || source.status,
      result: resultValue || source.result,
      answerStatus,
      resultStatus,
      calledAt:
        source.calledAt ||
        source.completedAt ||
        source.updatedAt ||
        source.callCompletedAt ||
        null,
      updatedAt:
        source.updatedAt ||
        source.completedAt ||
        source.calledAt ||
        source.callCompletedAt ||
        null,
    });
  };

  if (Array.isArray(guest?.callRounds)) {
    for (const round of guest.callRounds) {
      addRound(Number(round?.roundNumber || 0), round);
    }
  }

  if (guest?.callRounds && !Array.isArray(guest.callRounds)) {
    addRound(1, guest.callRounds.round1);
    addRound(2, guest.callRounds.round2);
    addRound(3, guest.callRounds.round3);
  }

  if (guest?.rsvpCallRounds && !Array.isArray(guest.rsvpCallRounds)) {
    addRound(1, guest.rsvpCallRounds.round1);
    addRound(2, guest.rsvpCallRounds.round2);
    addRound(3, guest.rsvpCallRounds.round3);
  }

  for (const roundNumber of [1, 2, 3]) {
    const status = guest?.[`round${roundNumber}CallStatus`];

    if (status) {
      addRound(roundNumber, {
        status,
        result: guest?.[`round${roundNumber}CallResult`],
        answerStatus:
          guest?.[`round${roundNumber}CallAnswerStatus`] ||
          guest?.[`round${roundNumber}CallAnswered`],
        resultStatus:
          guest?.[`round${roundNumber}CallResultStatus`] ||
          guest?.[`round${roundNumber}AnsweredResult`] ||
          guest?.[`round${roundNumber}NoAnswerResult`],
        completedAt: guest?.[`round${roundNumber}CallCompletedAt`],
        taskId: guest?.[`round${roundNumber}CallTaskId`],
        workOrderId: guest?.[`round${roundNumber}CallWorkOrderId`],
        employeeId: guest?.[`round${roundNumber}CallEmployeeId`],
        employeeName: guest?.[`round${roundNumber}CallEmployeeName`],
        employeeEmail: guest?.[`round${roundNumber}CallEmployeeEmail`],
        note: guest?.[`round${roundNumber}CallNote`],
      });
    }
  }

  const byRound = new Map<number, any>();

  for (const round of result) {
    const roundNumber = Number(round?.roundNumber || 0);
    if (!roundNumber) continue;

    byRound.set(roundNumber, {
      ...(byRound.get(roundNumber) || {}),
      ...round,
      roundNumber,
    });
  }

  return Array.from(byRound.values()).sort(
    (a, b) => Number(a.roundNumber || 0) - Number(b.roundNumber || 0)
  );
}

function getTaskRoundResultStatus(status: string) {
  return normalizeCallRoundResultStatus(status);
}

function getTaskRoundAnswerStatus(status: string) {
  return normalizeCallRoundAnswerStatus(status) || "answered";
}

async function attachCallRoundsFromTasks(guests: any[]) {
  const guestIds = guests
    .map((guest) => guest?._id || guest?.id)
    .filter(Boolean);

  if (!guestIds.length) return guests;

  const objectIds = guestIds
    .map((id) => toObjectId(id))
    .filter(Boolean) as Types.ObjectId[];

  const stringIds = guestIds.map((id) => String(id));

  const tasks = (await CallTask.find({
    $or: [
      objectIds.length ? { guestId: { $in: objectIds } } : {},
      { guestId: { $in: stringIds } },
    ].filter((item) => Object.keys(item).length),
    status: {
      $in: [
        "confirmed",
        "declined",
        "no_answer",
        "callback",
        "will_reply_message",
        "needs_fix",
        "wrong_number",
        "undecided",
      ],
    },
  })
    .select(
      "_id guestId workOrderId invitationId assignedToEmployeeId assignedEmployeeId employeeId handledByEmployeeId handledByEmployeeName handledByEmployeeEmail round status result note guestNotes attendingCount arrivedCount completedAt lastAttemptAt updatedAt callAnswered answeredResult messageFollowUpAction noAnswerResult moveToNextRound nextRound nextRoundReason"
    )
    .lean()) as any[];

  const tasksByGuest = new Map<string, any[]>();

  for (const task of tasks) {
    const key = String(task?.guestId || "");
    if (!key) continue;

    if (!tasksByGuest.has(key)) {
      tasksByGuest.set(key, []);
    }

    tasksByGuest.get(key)!.push(task);
  }

  return guests.map((guest) => {
    const guestId = String(guest?._id || guest?.id || "");
    const guestTasks = tasksByGuest.get(guestId) || [];
    const existingRounds = normalizeGuestCallRoundsForApi(guest);
    const byRound = new Map<number, any>();

    for (const round of existingRounds) {
      const roundNumber = Number(round?.roundNumber || 0);
      if (!roundNumber) continue;
      byRound.set(roundNumber, round);
    }

    for (const task of guestTasks) {
      const roundNumber = Number(task?.round || 1);
      const status = cleanString(task?.status);
      if (!status) continue;

      const answerStatus = getTaskRoundAnswerStatus(status);
      const resultStatus = getTaskRoundResultStatus(status);

      byRound.set(roundNumber, {
        ...(byRound.get(roundNumber) || {}),
        roundNumber,
        status,
        result: task?.result || status,
        answerStatus,
        resultStatus,
        taskId: task?._id || null,
        workOrderId: task?.workOrderId || null,
        invitationId: task?.invitationId || guest?.invitationId || null,
        guestId: guest?._id || guest?.id || null,
        employeeId:
          task?.handledByEmployeeId ||
          task?.assignedToEmployeeId ||
          task?.assignedEmployeeId ||
          task?.employeeId ||
          null,
        employeeName: cleanString(task?.handledByEmployeeName),
        employeeEmail: cleanString(task?.handledByEmployeeEmail),
        amount:
          typeof task?.attendingCount === "number"
            ? task.attendingCount
            : typeof task?.arrivedCount === "number"
              ? task.arrivedCount
              : null,
        arrivedCount:
          typeof task?.attendingCount === "number"
            ? task.attendingCount
            : typeof task?.arrivedCount === "number"
              ? task.arrivedCount
              : null,
        notes: cleanString(task?.note),
        note: cleanString(task?.note),
        guestNote: cleanString(task?.guestNotes),
        callAnswered: cleanString(task?.callAnswered) || answerStatus,
        answeredResult: cleanString(task?.answeredResult) || status,
        messageFollowUpAction: cleanString(task?.messageFollowUpAction),
        noAnswerResult: cleanString(task?.noAnswerResult),
        movedToNextRound: Boolean(task?.moveToNextRound),
        nextRound: task?.nextRound || null,
        nextRoundReason: cleanString(task?.nextRoundReason),
        calledAt: task?.completedAt || task?.lastAttemptAt || task?.updatedAt || null,
        completedAt: task?.completedAt || null,
        updatedAt: task?.updatedAt || task?.completedAt || task?.lastAttemptAt || null,
        source: byRound.has(roundNumber) ? "guest_and_call_task" : "call_task_fallback",
      });
    }

    return {
      ...guest,
      callRounds: Array.from(byRound.values()).sort(
        (a, b) => Number(a.roundNumber || 0) - Number(b.roundNumber || 0)
      ),
    };
  });
}

/* =========================================================
   GET /api/guests
========================================================= */

export async function GET(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      return NextResponse.json({
        success: false,
        guests: [],
        usage: null,
      });
    }

    const userId = String(auth.userId);

    const invitationId = req.nextUrl.searchParams.get("invitation");
    const eventId = req.nextUrl.searchParams.get("eventId");
    const isVenueView = req.nextUrl.searchParams.get("venueView") === "1";

    /* =========================================================
       אם יש invitation בפרמטרים — מחזיר רק אותה
       כולל הרשאת venue_owner דרך venueView=1
    ========================================================= */

    if (invitationId) {
      const invitation = (await Invitation.findById(invitationId)
        .select("_id ownerId userId producerId eventId guests")
        .lean()) as InvitationDoc | null;

      if (!invitation) {
        return NextResponse.json({
          success: false,
          guests: [],
          usage: null,
          message: "הזמנה לא נמצאה",
        });
      }

      const ownerId = invitation.ownerId?.toString();
      const invitationUserId = invitation.userId?.toString();
      const producerId = invitation.producerId?.toString();

      let allowed =
        ownerId === userId ||
        invitationUserId === userId ||
        producerId === userId;

      if (!allowed && isVenueView) {
        allowed = await canVenueOwnerAccessInvitation({
          userId,
          invitationId,
          eventId,
        });
      }

      if (!allowed) {
        return NextResponse.json({
          success: false,
          guests: [],
          usage: null,
          message: "אין הרשאה לצפייה במוזמנים",
        });
      }

      let guests = (await InvitationGuest.find({
        invitationId,
      }).lean()) as GuestDoc[];

      /*
        גיבוי:
        אם אין רשומות ב־InvitationGuest,
        לוקחים מתוך guests שבתוך מסמך ההזמנה.
      */
      if (!guests.length && Array.isArray(invitation.guests)) {
        guests = invitation.guests.map((guest: any) =>
          normalizeEmbeddedGuest(guest, invitationId)
        ) as any[];
      }

      const guestsWithTable = await attachTableNamesToGuests({
        guests,
        invitation,
      });

      const guestsWithCallRounds = await attachCallRoundsFromTasks(
        guestsWithTable
      );

      const invitationAccessOwnerId = ownerId || invitationUserId || userId;
      const accessOwnerUser = invitationAccessOwnerId
        ? await User.findById(invitationAccessOwnerId)
            .select("salesUpsells.preRsvpMessages")
            .lean()
        : null;

      const preRsvpMessages = normalizePreRsvpMessagesAccess(accessOwnerUser);

      return NextResponse.json({
        success: true,
        guests: guestsWithCallRounds,
        usage: null,
        invitation: {
          ...invitation,
          _id: invitation._id ? String(invitation._id) : "",
          eventId: invitation.eventId ? String(invitation.eventId) : null,
          ownerId: ownerId || null,
          userId: invitationUserId || null,
          producerId: producerId || null,
          preRsvpMessages,
        },
      });
    }

    /* =========================================================
       אם אין invitation — ממשיך ללוגיקה המקורית
    ========================================================= */

    const user = await User.findById(userId).select("guests").lean();
    const maxGuests = Number((user as any)?.guests || 0);

    const invitations = (await Invitation.find({
      $or: [{ ownerId: userId }, { userId }, { producerId: userId }],
    })
      .select("_id eventId")
      .lean()) as InvitationDoc[];

    if (!invitations.length) {
      return NextResponse.json({
        success: true,
        guests: [],
        usage: {
          current: 0,
          limit: maxGuests,
          remaining: Math.max(0, maxGuests),
        },
      });
    }

    const invitationIds = invitations.map((i) => i._id);
    const eventIds = invitations
      .map((i) => i.eventId)
      .filter(Boolean) as Types.ObjectId[];

    const guests = (await InvitationGuest.find({
      invitationId: { $in: invitationIds },
    }).lean()) as GuestDoc[];

    const seatings = (await SeatingTable.find({
      eventId: { $in: eventIds },
    }).lean()) as SeatingDoc[];

    const invitationById = new Map<string, InvitationDoc>();

    for (const inv of invitations) {
      invitationById.set(inv._id.toString(), inv);
    }

    const eventGuestToTableMap = new Map<string, Map<string, string>>();

    for (const seating of seatings) {
      const eventKey = seating.eventId?.toString();

      if (!eventKey) continue;

      if (!eventGuestToTableMap.has(eventKey)) {
        eventGuestToTableMap.set(eventKey, new Map<string, string>());
      }

      const guestToTable = eventGuestToTableMap.get(eventKey)!;

      for (const table of seating.tables || []) {
        const tableName = table.name || "-";

        for (const seatedGuest of table.seatedGuests || []) {
          guestToTable.set(seatedGuest.guestId.toString(), tableName);
        }
      }
    }

    const guestsWithTable = guests.map((guest) => {
      let tableName: string | null = null;

      const invitation = invitationById.get(guest.invitationId.toString());
      const currentEventId = invitation?.eventId?.toString();

      if (currentEventId) {
        const guestToTable = eventGuestToTableMap.get(currentEventId);
        const found = guestToTable?.get(guest._id.toString());

        if (found) {
          tableName = found;
        }
      }

      return {
        ...guest,
        actualArrivedCount: guest.actualArrivedCount ?? 0,
        tableName,
      };
    });

    const guestsWithCallRounds = await attachCallRoundsFromTasks(guestsWithTable);

    const current = guestsWithCallRounds.length;
    const limit = maxGuests;
    const remaining = Math.max(0, limit - current);

    return NextResponse.json({
      success: true,
      guests: guestsWithCallRounds,
      usage: {
        current,
        limit,
        remaining,
      },
    });
  } catch (err) {
    console.error("🔥 ERROR in /api/guests GET:", err);

    return NextResponse.json({
      success: false,
      guests: [],
      usage: null,
    });
  }
}

/* =========================================================
   POST — נשאר כמעט כמו שהיה
========================================================= */

export async function POST(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const userId = String(auth.userId);
    const body = await req.json();

    const {
      invitationId,
      name,
      phone,
      side = "unknown",
      rsvpStatus = "pending",
      quantity = 1,
      notes = "",
      groupId = null,
      source = "manual",
      tags = [],
      actualArrivedCount = 0,
    } = body || {};

    if (!invitationId || !String(name || "").trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    const invitation = (await Invitation.findById(invitationId)
      .select("_id ownerId userId producerId")
      .lean()) as InvitationDoc | null;

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: "Invitation not found",
        },
        { status: 404 }
      );
    }

    const ownerId = invitation.ownerId?.toString();
    const invitationUserId = invitation.userId?.toString();
    const producerId = invitation.producerId?.toString();

    if (
      ownerId !== userId &&
      invitationUserId !== userId &&
      producerId !== userId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        { status: 403 }
      );
    }

    const user = await User.findById(userId).select("guests").lean();
    const limit = Number((user as any)?.guests || 0);
    const current = await InvitationGuest.countDocuments({ invitationId });

    if (current >= limit) {
      return NextResponse.json(
        {
          success: false,
          code: "GUEST_LIMIT_REACHED",
          error: `הגעת למכסה המותרת (${limit})`,
        },
        { status: 409 }
      );
    }

    const created = await InvitationGuest.create({
      invitationId,
      name: String(name).trim(),
      phone: phone ? String(phone).trim() : "",
      side,
      rsvpStatus,
      quantity: Number(quantity) || 1,
      notes,
      groupId,
      source,
      tags,
      actualArrivedCount: Number(actualArrivedCount) || 0,
    });

    return NextResponse.json({
      success: true,
      guest: created,
    });
  } catch (err: any) {
    console.error("🔥 ERROR in /api/guests POST:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Server error",
      },
      { status: 500 }
    );
  }
}