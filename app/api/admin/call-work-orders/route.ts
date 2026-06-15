import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import CallWorkOrder from "@/models/CallWorkOrder";
import CallTask from "@/models/CallTask";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   Config
============================================================ */

const SHIFT_COLLECTION = "employeeshifts";
const TIMEZONE = "Asia/Jerusalem";
const AUTO_OPEN_HOUR = 8;

type RoundNumber = 1 | 2 | 3;

type AuthUser = {
  id: string;
  role?: string;
  email?: string;
  name?: string;
};

/* ============================================================
   Helpers
============================================================ */

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toObjectId(value: unknown) {
  const id = String(value || "");
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

function isAdminRole(role?: string) {
  const normalized = cleanStr(role).toLowerCase();

  return (
    normalized === "admin" ||
    normalized === "super_admin" ||
    normalized === "owner"
  );
}

function getJwtSecret() {
  return (
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    ""
  );
}

async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("token")?.value ||
    cookieStore.get("auth_token")?.value ||
    cookieStore.get("authToken")?.value ||
    cookieStore.get("jwt")?.value ||
    cookieStore.get("session")?.value ||
    "";

  if (!token) return null;

  const secret = getJwtSecret();
  if (!secret) return null;

  try {
    const decoded = jwt.verify(token, secret) as any;

    const id = String(
      decoded.id ||
        decoded._id ||
        decoded.userId ||
        decoded.sub ||
        ""
    );

    if (!id) return null;

    return {
      id,
      role: decoded.role,
      email: decoded.email,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

async function requireAdmin() {
  const auth = await getAuthUser();

  if (!auth?.id) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "לא מחובר",
        },
        { status: 401 }
      ),
    };
  }

  const userObjectId = toObjectId(auth.id);

  const userConditions: any[] = [];

  if (userObjectId) userConditions.push({ _id: userObjectId });
  userConditions.push({ id: auth.id });

  if (auth.email) {
    userConditions.push({ email: auth.email });
  }

  const currentUser = await User.findOne({
    $or: userConditions,
  })
    .select("_id id name email role")
    .lean();

  const role = cleanStr((currentUser as any)?.role || auth.role);

  if (!isAdminRole(role)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "אין הרשאת אדמין",
        },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true as const,
    auth,
    currentUser,
    userId: String((currentUser as any)?._id || auth.id),
  };
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getTodayDateKey() {
  const now = new Date();

  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(
    now.getDate()
  )}`;
}

function normalizeDateKey(value: unknown) {
  const raw = cleanStr(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  if (raw) {
    const date = new Date(raw);

    if (!Number.isNaN(date.getTime())) {
      return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
        date.getDate()
      )}`;
    }
  }

  return getTodayDateKey();
}

function dateFromKey(dateKey: string, hour = 0) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day, hour, 0, 0, 0);
}

function endOfDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

function normalizeRound(value: unknown): RoundNumber {
  const round = Number(value);

  if (round === 1 || round === 2 || round === 3) {
    return round;
  }

  return 1;
}

function getSourceAudienceByRound(round: RoundNumber) {
  if (round === 1) return "pending_rsvp";
  if (round === 2) return "round_1_no_answer";
  return "round_2_no_answer";
}

function getRoundTitle(input: {
  clientName: string;
  clientEmail: string;
  round: RoundNumber;
}) {
  const name = input.clientName || input.clientEmail || "לקוח";

  return `${name} | סבב ${input.round} שיחות`;
}

function getEventName(invitation: any) {
  return (
    cleanStr(invitation?.eventName) ||
    cleanStr(invitation?.eventTitle) ||
    cleanStr(invitation?.invitationTitle) ||
    cleanStr(invitation?.title) ||
    cleanStr(invitation?.name) ||
    cleanStr(invitation?.coupleName) ||
    "אירוע ללא שם"
  );
}

function getEventDate(invitation: any) {
  const raw =
    invitation?.eventDate ||
    invitation?.date ||
    invitation?.event?.date ||
    null;

  if (!raw) return null;

  const date = new Date(raw);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getOwnerIdFromInvitation(invitation: any) {
  return (
    invitation?.ownerId ||
    invitation?.userId ||
    invitation?.clientUserId ||
    invitation?.createdBy ||
    invitation?.user ||
    null
  );
}

function getClientName(invitation: any, clientUser: any) {
  return (
    cleanStr(clientUser?.name) ||
    cleanStr(invitation?.clientName) ||
    cleanStr(invitation?.customerName) ||
    cleanStr(invitation?.contactName) ||
    cleanStr(invitation?.name) ||
    cleanStr(invitation?.coupleName) ||
    cleanStr(clientUser?.email) ||
    "לקוח ללא שם"
  );
}

function getClientEmail(invitation: any, clientUser: any) {
  return (
    cleanStr(clientUser?.email) ||
    cleanStr(invitation?.clientEmail) ||
    cleanStr(invitation?.customerEmail) ||
    cleanStr(invitation?.email) ||
    ""
  );
}

function getGuestName(guest: any) {
  return (
    cleanStr(guest?.name) ||
    cleanStr(guest?.fullName) ||
    cleanStr(guest?.guestName) ||
    cleanStr(guest?.firstName) ||
    "אורח ללא שם"
  );
}

function getGuestPhone(guest: any) {
  return (
    cleanStr(guest?.phone) ||
    cleanStr(guest?.phoneNumber) ||
    cleanStr(guest?.mobile) ||
    cleanStr(guest?.tel) ||
    ""
  );
}

function hasPhone(guest: any) {
  return getGuestPhone(guest).replace(/\D/g, "").length >= 7;
}

function normalizeRsvp(value: unknown) {
  return cleanStr(value).toLowerCase();
}

function getGuestRsvp(guest: any) {
  return normalizeRsvp(
    guest?.rsvp ||
      guest?.rsvpStatus ||
      guest?.attendanceStatus ||
      guest?.status ||
      ""
  );
}

function isPendingGuest(guest: any) {
  const rsvp = getGuestRsvp(guest);

  if (!rsvp) return true;

  return [
    "pending",
    "wait",
    "waiting",
    "unknown",
    "none",
    "טרם השיב",
    "ממתין",
    "לא ידוע",
  ].includes(rsvp);
}

function getConfiguredRoundAt(input: {
  round: RoundNumber;
  invitation: any;
  clientUser: any;
}) {
  const allPossibleRounds = [
    ...(Array.isArray(input.clientUser?.callRoundsSchedule?.rounds)
      ? input.clientUser.callRoundsSchedule.rounds
      : []),
    ...(Array.isArray(input.invitation?.callRoundsSchedule?.rounds)
      ? input.invitation.callRoundsSchedule.rounds
      : []),
    ...(Array.isArray(input.invitation?.callRounds)
      ? input.invitation.callRounds
      : []),
  ];

  const matched = allPossibleRounds.find((round: any) => {
    const n = Number(
      round?.roundNumber ||
        round?.round ||
        round?.number ||
        round?.index ||
        0
    );

    return n === input.round;
  });

  const raw =
    matched?.scheduledAt ||
    matched?.date ||
    matched?.scheduledDate ||
    matched?.sendAt ||
    null;

  if (!raw) return null;

  const date = new Date(raw);

  return Number.isNaN(date.getTime()) ? null : date;
}

function shiftEmployeeId(shift: any) {
  return String(
    shift?.employeeIdString ||
      shift?.employeeId ||
      shift?.userId ||
      shift?.staffId ||
      shift?.workerId ||
      ""
  );
}

function normalizeShiftEmployee(shift: any) {
  const employeeId = shiftEmployeeId(shift);
  const employeeObjectId = toObjectId(employeeId);

  if (!employeeObjectId) return null;

  const shiftId = String(shift?._id || shift?.id || "");
  const shiftObjectId = toObjectId(shiftId);

  return {
    employeeId: employeeObjectId,
    employeeIdString: String(employeeObjectId),
    shiftId: shiftObjectId,
    employeeName: cleanStr(shift?.employeeName),
    employeeEmail: cleanStr(shift?.employeeEmail),
    employeePhone: cleanStr(shift?.employeePhone),
  };
}

async function loadScheduledEmployeesForDate(dateKey: string) {
  const database = mongoose.connection.db;

  if (!database) {
    throw new Error("DATABASE_NOT_READY");
  }

  const shifts = await database
    .collection(SHIFT_COLLECTION)
    .find({
      date: dateKey,
    })
    .limit(500)
    .toArray();

  const map = new Map<
    string,
    {
      employeeId: Types.ObjectId;
      employeeIdString: string;
      shiftId: Types.ObjectId | null;
      employeeName: string;
      employeeEmail: string;
      employeePhone: string;
    }
  >();

  for (const shift of shifts) {
    const normalized = normalizeShiftEmployee(shift);
    if (!normalized) continue;

    if (!map.has(normalized.employeeIdString)) {
      map.set(normalized.employeeIdString, normalized);
    }
  }

  return Array.from(map.values());
}

async function findInvitationById(invitationId: string) {
  const objectId = toObjectId(invitationId);

  const conditions: any[] = [{ id: invitationId }];

  if (objectId) {
    conditions.unshift({ _id: objectId });
  }

  return Invitation.findOne({
    $or: conditions,
  }).lean();
}

async function findClientUser(ownerId: unknown) {
  const ownerObjectId = toObjectId(ownerId);

  if (!ownerObjectId) return null;

  return User.findById(ownerObjectId)
    .select("_id id name email role callRoundsSchedule includeCalls")
    .lean();
}

async function loadGuestsForInvitation(invitation: any) {
  const invitationId = String(invitation?._id || "");
  const invitationObjectId = toObjectId(invitationId);

  const conditions: any[] = [{ invitationId }];

  if (invitationObjectId) {
    conditions.unshift({ invitationId: invitationObjectId });
  }

  return InvitationGuest.find({
    $or: conditions,
  }).lean();
}

async function loadGuestsForRound(input: {
  invitation: any;
  round: RoundNumber;
}) {
  const invitationId = String(input.invitation?._id || "");
  const invitationObjectId = toObjectId(invitationId);

  const allGuests = await loadGuestsForInvitation(input.invitation);

  if (input.round === 1) {
    return allGuests.filter((guest: any) => {
      return hasPhone(guest) && isPendingGuest(guest);
    });
  }

  if (!invitationObjectId) return [];

  const previousRound = (input.round - 1) as 1 | 2;

  const previousNoAnswerTasks = await CallTask.find({
    invitationId: invitationObjectId,
    round: previousRound,
    status: "no_answer",
  })
    .select("guestId")
    .lean();

  const guestIds = new Set(
    previousNoAnswerTasks.map((task: any) => String(task.guestId))
  );

  return allGuests.filter((guest: any) => {
    return (
      hasPhone(guest) &&
      isPendingGuest(guest) &&
      guestIds.has(String(guest?._id || ""))
    );
  });
}

function serializeWorkOrder(order: any, counts?: Record<string, number>) {
  const total =
    Number(counts?.total || 0) || Number(order?.totalTasks || 0) || 0;

  const completed =
    Number(counts?.confirmed || 0) +
    Number(counts?.declined || 0) +
    Number(counts?.no_answer || 0) +
    Number(counts?.callback || 0) +
    Number(counts?.wrong_number || 0) +
    Number(counts?.completed || 0) +
    Number(counts?.cancelled || 0);

  return {
    id: String(order?._id || ""),
    _id: String(order?._id || ""),

    type: order?.type || "rsvp_calls",
    status: order?.status || "scheduled",

    invitationId: String(order?.invitationId || ""),
    userId: order?.userId ? String(order.userId) : "",
    clientUserId: order?.clientUserId ? String(order.clientUserId) : "",

    clientName: cleanStr(order?.clientName),
    clientEmail: cleanStr(order?.clientEmail),
    eventName: cleanStr(order?.eventName),
    eventDate: order?.eventDate || null,

    round: Number(order?.round || 1),
    sourceAudience: order?.sourceAudience || "",

    title: cleanStr(order?.title),
    description: cleanStr(order?.description),

    workDate: order?.workDate || null,
    configuredRoundAt: order?.configuredRoundAt || null,
    autoOpenAt: order?.autoOpenAt || null,
    autoOpenHour: Number(order?.autoOpenHour || AUTO_OPEN_HOUR),
    timezone: cleanStr(order?.timezone) || TIMEZONE,

    assignedEmployeeIds: Array.isArray(order?.assignedEmployeeIds)
      ? order.assignedEmployeeIds.map((id: any) => String(id))
      : [],

    assignedShiftIds: Array.isArray(order?.assignedShiftIds)
      ? order.assignedShiftIds.map((id: any) => String(id))
      : [],

    employeeCount: Number(order?.employeeCount || 0),

    totalTasks: total,
    pendingTasks: Number(counts?.pending || order?.pendingTasks || 0),
    inProgressTasks: Number(
      counts?.in_progress || order?.inProgressTasks || 0
    ),
    completedTasks: completed,
    confirmedTasks: Number(counts?.confirmed || order?.confirmedTasks || 0),
    declinedTasks: Number(counts?.declined || order?.declinedTasks || 0),
    noAnswerTasks: Number(counts?.no_answer || order?.noAnswerTasks || 0),
    callbackTasks: Number(counts?.callback || order?.callbackTasks || 0),
    wrongNumberTasks: Number(
      counts?.wrong_number || order?.wrongNumberTasks || 0
    ),
    unassignedTasks: Number(order?.unassignedTasks || 0),

    lastDistributedAt: order?.lastDistributedAt || null,
    lastReassignedAt: order?.lastReassignedAt || null,
    lastStatusSyncAt: order?.lastStatusSyncAt || null,

    createdAt: order?.createdAt || null,
    updatedAt: order?.updatedAt || null,
  };
}

async function getCountsByWorkOrderIds(workOrderIds: Types.ObjectId[]) {
  if (!workOrderIds.length) {
    return new Map<string, Record<string, number>>();
  }

  const rows = await CallTask.aggregate([
    {
      $match: {
        workOrderId: { $in: workOrderIds },
      },
    },
    {
      $group: {
        _id: {
          workOrderId: "$workOrderId",
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const map = new Map<string, Record<string, number>>();

  for (const row of rows) {
    const workOrderId = String(row?._id?.workOrderId || "");
    const status = String(row?._id?.status || "unknown");
    const count = Number(row?.count || 0);

    if (!workOrderId) continue;

    const current = map.get(workOrderId) || {};
    current[status] = count;
    current.total = Number(current.total || 0) + count;

    map.set(workOrderId, current);
  }

  return map;
}

/* ============================================================
   GET - רשימת הוראות עבודה לאדמין
============================================================ */

export async function GET(req: NextRequest) {
  try {
    await db();

    const admin = await requireAdmin();

    if (!admin.ok) {
      return admin.response;
    }

    const { searchParams } = new URL(req.url);

    const status = cleanStr(searchParams.get("status"));
    const invitationId = cleanStr(searchParams.get("invitationId"));
    const employeeId = cleanStr(searchParams.get("employeeId"));
    const roundParam = cleanStr(searchParams.get("round"));
    const dateParam = cleanStr(searchParams.get("date"));
    const fromParam = cleanStr(searchParams.get("from"));
    const toParam = cleanStr(searchParams.get("to"));

    const limit = Math.min(
      200,
      Math.max(1, Number(searchParams.get("limit") || 100))
    );

    const query: any = {
      type: "rsvp_calls",
    };

    if (status) {
      query.status = status;
    }

    if (invitationId) {
      const objectId = toObjectId(invitationId);
      query.invitationId = objectId || invitationId;
    }

    if (employeeId) {
      const objectId = toObjectId(employeeId);

      if (objectId) {
        query.assignedEmployeeIds = objectId;
      }
    }

    if (roundParam) {
      const round = Number(roundParam);

      if (round === 1 || round === 2 || round === 3) {
        query.round = round;
      }
    }

    if (dateParam) {
      const dateKey = normalizeDateKey(dateParam);
      query.workDate = {
        $gte: dateFromKey(dateKey, 0),
        $lte: endOfDateKey(dateKey),
      };
    } else if (fromParam || toParam) {
      const fromKey = normalizeDateKey(fromParam || getTodayDateKey());
      const toKey = normalizeDateKey(toParam || fromKey);

      query.workDate = {
        $gte: dateFromKey(fromKey, 0),
        $lte: endOfDateKey(toKey),
      };
    }

    const workOrders = await CallWorkOrder.find(query)
      .sort({
        workDate: -1,
        round: 1,
        createdAt: -1,
      })
      .limit(limit)
      .lean();

    const workOrderIds = workOrders
      .map((order: any) => toObjectId(order?._id))
      .filter(Boolean) as Types.ObjectId[];

    const countsMap = await getCountsByWorkOrderIds(workOrderIds);

    return NextResponse.json({
      success: true,
      count: workOrders.length,
      workOrders: workOrders.map((order: any) =>
        serializeWorkOrder(order, countsMap.get(String(order?._id || "")))
      ),
    });
  } catch (error: any) {
    console.error("GET /api/admin/call-work-orders failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בטעינת הוראות עבודה",
      },
      { status: 500 }
    );
  }
}

/* ============================================================
   POST - יצירת הוראת עבודה ידנית / מהמנוע האוטומטי
============================================================ */

export async function POST(req: NextRequest) {
  try {
    await db();

    const admin = await requireAdmin();

    if (!admin.ok) {
      return admin.response;
    }

    const body = await req.json().catch(() => ({}));

    const invitationId = cleanStr(body?.invitationId);
    const round = normalizeRound(body?.round);
    const workDateKey = normalizeDateKey(body?.workDate || body?.date);

    if (!invitationId) {
      return NextResponse.json(
        {
          success: false,
          error: "חסר invitationId",
        },
        { status: 400 }
      );
    }

    const invitation = await findInvitationById(invitationId);

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: "האירוע לא נמצא",
        },
        { status: 404 }
      );
    }

    const invitationObjectId = toObjectId((invitation as any)._id);

    if (!invitationObjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "מזהה אירוע לא תקין",
        },
        { status: 400 }
      );
    }

    const existingWorkOrder = await CallWorkOrder.findOne({
      invitationId: invitationObjectId,
      type: "rsvp_calls",
      round,
      workDate: {
        $gte: dateFromKey(workDateKey, 0),
        $lte: endOfDateKey(workDateKey),
      },
    }).lean();

    if (existingWorkOrder) {
      const countsMap = await getCountsByWorkOrderIds([
        existingWorkOrder._id as Types.ObjectId,
      ]);

      return NextResponse.json({
        success: true,
        alreadyExists: true,
        message: "כבר קיימת הוראת עבודה לסבב הזה בתאריך הזה",
        workOrder: serializeWorkOrder(
          existingWorkOrder,
          countsMap.get(String(existingWorkOrder._id))
        ),
      });
    }

    const scheduledEmployees = await loadScheduledEmployeesForDate(workDateKey);

    if (!scheduledEmployees.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "אין עובדים משובצים לתאריך הזה. צריך לשבץ עובדים לפני פתיחת הוראת עבודה.",
          workDate: workDateKey,
        },
        { status: 400 }
      );
    }

    const ownerId = getOwnerIdFromInvitation(invitation);
    const clientUser = await findClientUser(ownerId);

    const clientName = getClientName(invitation, clientUser);
    const clientEmail = getClientEmail(invitation, clientUser);
    const eventName = getEventName(invitation);
    const eventDate = getEventDate(invitation);

    const configuredRoundAt =
      body?.configuredRoundAt
        ? new Date(body.configuredRoundAt)
        : getConfiguredRoundAt({
            round,
            invitation,
            clientUser,
          });

    const validConfiguredRoundAt =
      configuredRoundAt && !Number.isNaN(configuredRoundAt.getTime())
        ? configuredRoundAt
        : null;

    const guestsForRound = await loadGuestsForRound({
      invitation,
      round,
    });

    if (!guestsForRound.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            round === 1
              ? "אין אורחים ממתינים לשיחה בסבב 1"
              : `אין אורחים שלא ענו בסבב ${round - 1}`,
          round,
          workDate: workDateKey,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const workDate = dateFromKey(workDateKey, 0);
    const autoOpenAt = dateFromKey(workDateKey, AUTO_OPEN_HOUR);
    const sourceAudience = getSourceAudienceByRound(round);

    const assignedEmployeeIds = scheduledEmployees.map(
      (employee) => employee.employeeId
    );

    const assignedShiftIds = scheduledEmployees
      .map((employee) => employee.shiftId)
      .filter(Boolean) as Types.ObjectId[];

    const workOrder = await CallWorkOrder.create({
      type: "rsvp_calls",

      invitationId: invitationObjectId,
      userId: ownerId || null,
      clientUserId: ownerId || null,

      clientName,
      clientEmail,
      eventName,
      eventDate,

      round,
      sourceAudience,

      workDate,
      configuredRoundAt: validConfiguredRoundAt,
      autoOpenAt,
      autoOpenHour: AUTO_OPEN_HOUR,
      timezone: TIMEZONE,

      title: getRoundTitle({
        clientName,
        clientEmail,
        round,
      }),

      description:
        round === 1
          ? "סבב 1 - שיחות לכל האורחים שטרם השיבו"
          : round === 2
            ? "סבב 2 - שיחות למי שלא ענה בסבב הראשון"
            : "סבב 3 - שיחות למי שלא ענה בסבב השני",

      status: "open",
      distributionStrategy: "scheduled_shift_round_robin",

      assignedEmployeeIds,
      assignedShiftIds,

      employeeCount: assignedEmployeeIds.length,
      totalTasks: guestsForRound.length,
      pendingTasks: guestsForRound.length,
      inProgressTasks: 0,
      completedTasks: 0,
      confirmedTasks: 0,
      declinedTasks: 0,
      noAnswerTasks: 0,
      callbackTasks: 0,
      wrongNumberTasks: 0,
      unassignedTasks: 0,

      createdBy: "admin",
      createdByUserId: toObjectId(admin.userId) || null,

      lastDistributedAt: now,
      notes: cleanStr(body?.notes),
    });

    const workOrderId = workOrder._id as Types.ObjectId;

    const taskDocs = guestsForRound.map((guest: any, index: number) => {
      const assignedEmployee =
        scheduledEmployees[index % scheduledEmployees.length];

      return {
        type: "rsvp_call",

        workOrderId,
        invitationId: invitationObjectId,
        guestId: guest._id,

        assignedToEmployeeId: assignedEmployee?.employeeId || null,
        previousAssignedEmployeeId: null,

        clientName,
        clientEmail,
        eventName,
        eventDate,

        guestName: getGuestName(guest),
        guestPhone: getGuestPhone(guest),
        guestEmail: cleanStr(guest?.email),
        guestGroup:
          cleanStr(guest?.groupName) ||
          cleanStr(guest?.group) ||
          cleanStr(guest?.relation) ||
          "",
        guestSide: cleanStr(guest?.side),
        guestTable:
          cleanStr(guest?.tableName) ||
          cleanStr(guest?.tableNumber) ||
          "",

        guestNotes: cleanStr(guest?.notes || guest?.note),

        round,
        sourceAudience,

        workDate,

        status: "pending",
        result: null,

        priority: 0,
        sortOrder: index,

        assignedAt: assignedEmployee ? now : null,
        startedAt: null,
        completedAt: null,
        lastAttemptAt: null,

        attemptsCount: 0,

        reassignedAt: null,
        reassignedByUserId: null,
        reassignedReason: "",

        rsvpStatus: getGuestRsvp(guest) || "pending",
        attendingCount:
          typeof guest?.arrivedCount === "number"
            ? guest.arrivedCount
            : typeof guest?.guestsCount === "number"
              ? guest.guestsCount
              : null,

        note: "",
        adminNote: "",
      };
    });

    try {
      await CallTask.insertMany(taskDocs, {
        ordered: false,
      });
    } catch (insertError: any) {
      await CallWorkOrder.deleteOne({
        _id: workOrderId,
      });

      console.error("CREATE CALL TASKS FAILED:", insertError);

      return NextResponse.json(
        {
          success: false,
          error:
            insertError?.message ||
            "שגיאה ביצירת משימות שיחה. הוראת העבודה בוטלה.",
        },
        { status: 500 }
      );
    }

    const freshWorkOrder = await CallWorkOrder.findById(workOrderId).lean();

    return NextResponse.json(
      {
        success: true,
        message: "הוראת העבודה נפתחה וחולקה לעובדים המשובצים",
        workDate: workDateKey,
        round,
        totalTasks: taskDocs.length,
        employeesCount: scheduledEmployees.length,
        workOrder: serializeWorkOrder(freshWorkOrder),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/admin/call-work-orders failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה ביצירת הוראת עבודה",
      },
      { status: 500 }
    );
  }
}