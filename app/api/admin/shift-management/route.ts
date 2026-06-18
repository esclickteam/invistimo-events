import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =====================================================
   TYPES
===================================================== */

type AnyDoc = Record<string, any>;

type SoftphoneStatus =
  | "online"
  | "offline"
  | "in_call"
  | "ringing"
  | "busy"
  | "break"
  | "not_available"
  | "unknown";

/* =====================================================
   BASIC HELPERS
===================================================== */

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      details,
    },
    { status }
  );
}

function safeString(value: any) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function safeLower(value: any) {
  return safeString(value).toLowerCase();
}

function safeDate(value: any): Date | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function toObjectId(value: any) {
  const clean = safeString(value);

  if (!clean) return null;
  if (!mongoose.Types.ObjectId.isValid(clean)) return null;

  return new mongoose.Types.ObjectId(clean);
}

function secondsFrom(value: any) {
  const date = safeDate(value);
  if (!date) return 0;

  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
}

function getTodayRange() {
  const now = new Date();

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return { start, end, now };
}

function mergeAnd(...queries: AnyDoc[]) {
  const cleanQueries = queries.filter((query) => {
    return query && typeof query === "object" && Object.keys(query).length > 0;
  });

  if (cleanQueries.length === 0) return {};
  if (cleanQueries.length === 1) return cleanQueries[0];

  return {
    $and: cleanQueries,
  };
}

/* =====================================================
   COLLECTION HELPERS
===================================================== */

async function collectionExists(name: string) {
  try {
    const database = mongoose.connection.db;
    if (!database) return false;

    const found = await database.listCollections({ name }).toArray();

    return found.length > 0;
  } catch {
    return false;
  }
}

async function getCollection(name: string) {
  const database = mongoose.connection.db;
  if (!database) return null;

  const exists = await collectionExists(name);
  if (!exists) return null;

  return database.collection(name);
}

async function findFirstCollection(names: string[]) {
  for (const name of names) {
    const collection = await getCollection(name);

    if (collection) {
      return collection;
    }
  }

  return null;
}

/* =====================================================
   EMPLOYEE HELPERS
===================================================== */

function getEmployeeId(employee: AnyDoc) {
  return safeString(employee._id || employee.id || employee.userId || employee.employeeId);
}

function getEmployeeName(employee: AnyDoc) {
  return (
    safeString(employee.fullName) ||
    safeString(employee.name) ||
    safeString(employee.displayName) ||
    safeString(employee.employeeName) ||
    safeString(employee.email) ||
    "עובד ללא שם"
  );
}

function getEmployeeEmail(employee: AnyDoc) {
  return safeString(employee.email || employee.employeeEmail || employee.staffEmail);
}

function getEmployeePhone(employee: AnyDoc) {
  return (
    safeString(employee.phone) ||
    safeString(employee.phoneNumber) ||
    safeString(employee.mobile) ||
    safeString(employee.employeePhone) ||
    safeString(employee.staffPhone)
  );
}

/**
 * חשוב:
 * כאן מסננים רק עובדים אמיתיים של המערכת.
 * לא לקוחות, לא מפיקים, לא בעלי אולם, לא אדמין.
 */
function isSystemEmployee(employee: AnyDoc) {
  if (!employee) return false;
  if (employee.deletedAt) return false;

  const role = safeLower(employee.role);
  const staffType = safeLower(employee.staffType);
  const type = safeLower(employee.type);
  const userType = safeLower(employee.userType);

  const blockedRoles = [
    "admin",
    "user",
    "client",
    "customer",
    "producer",
    "venue_owner",
    "venueowner",
    "venue",
    "owner",
  ];

  if (blockedRoles.includes(role)) return false;
  if (blockedRoles.includes(type)) return false;
  if (blockedRoles.includes(userType)) return false;

  if (employee.isProducer === true) return false;
  if (employee.producer === true) return false;
  if (employee.isVenueOwner === true) return false;
  if (employee.venueOwner === true) return false;

  const allowedRoles = [
    "staff",
    "employee",
    "worker",
    "representative",
    "sales",
    "caller",
    "call_agent",
    "phone_agent",
  ];

  const allowedStaffTypes = [
    "staff",
    "employee",
    "worker",
    "calls",
    "call",
    "caller",
    "sales",
    "representative",
    "phone",
    "phone_agent",
  ];

  if (allowedRoles.includes(role)) return true;
  if (allowedStaffTypes.includes(staffType)) return true;

  if (employee.isEmployee === true) return true;
  if (employee.employee === true) return true;
  if (employee.isStaff === true) return true;
  if (employee.staff === true) return true;

  return false;
}

function getEmployeeMatchQuery(employee: AnyDoc) {
  const id = getEmployeeId(employee);
  const objectId = toObjectId(id);
  const email = getEmployeeEmail(employee);
  const phone = getEmployeePhone(employee);

  const or: AnyDoc[] = [];

  if (id) {
    or.push({ employeeId: id });
    or.push({ staffId: id });
    or.push({ agentId: id });
    or.push({ userId: id });
    or.push({ workerId: id });
    or.push({ assignedTo: id });
    or.push({ createdBy: id });

    or.push({ "employee.id": id });
    or.push({ "staff.id": id });
    or.push({ "agent.id": id });
    or.push({ "worker.id": id });
    or.push({ "user.id": id });
  }

  if (objectId) {
    or.push({ employeeId: objectId });
    or.push({ staffId: objectId });
    or.push({ agentId: objectId });
    or.push({ userId: objectId });
    or.push({ workerId: objectId });
    or.push({ assignedTo: objectId });
    or.push({ createdBy: objectId });

    or.push({ "employee._id": objectId });
    or.push({ "staff._id": objectId });
    or.push({ "agent._id": objectId });
    or.push({ "worker._id": objectId });
    or.push({ "user._id": objectId });
  }

  if (email) {
    or.push({ email });
    or.push({ employeeEmail: email });
    or.push({ staffEmail: email });
    or.push({ agentEmail: email });
    or.push({ workerEmail: email });

    or.push({ "employee.email": email });
    or.push({ "staff.email": email });
    or.push({ "agent.email": email });
    or.push({ "worker.email": email });
    or.push({ "user.email": email });
  }

  if (phone) {
    or.push({ phone });
    or.push({ employeePhone: phone });
    or.push({ staffPhone: phone });
    or.push({ agentPhone: phone });
    or.push({ workerPhone: phone });
  }

  if (or.length === 0) return {};

  return { $or: or };
}

/* =====================================================
   STATUS HELPERS
===================================================== */

function normalizeSoftphoneStatus(value: any): SoftphoneStatus {
  const clean = safeLower(value);

  if (clean === "online") return "online";
  if (clean === "available") return "online";
  if (clean === "ready") return "online";
  if (clean === "free") return "online";
  if (clean === "פנוי") return "online";

  if (clean === "offline") return "offline";
  if (clean === "disconnected") return "offline";
  if (clean === "מנותק") return "offline";

  if (clean === "in_call") return "in_call";
  if (clean === "incall") return "in_call";
  if (clean === "answered") return "in_call";
  if (clean === "bridged") return "in_call";
  if (clean === "active_call") return "in_call";

  if (clean === "ringing") return "ringing";
  if (clean === "initiated") return "ringing";

  if (clean === "busy") return "busy";
  if (clean === "עסוק") return "busy";

  if (clean === "break") return "break";
  if (clean === "pause") return "break";
  if (clean === "הפסקה") return "break";

  if (clean === "not_available") return "not_available";
  if (clean === "unavailable") return "not_available";
  if (clean === "away") return "not_available";
  if (clean === "לא פנוי") return "not_available";

  return "unknown";
}

function normalizeDirection(value: any): "inbound" | "outbound" | "unknown" {
  const clean = safeLower(value);

  if (clean === "inbound") return "inbound";
  if (clean === "incoming") return "inbound";
  if (clean === "נכנסת") return "inbound";

  if (clean === "outbound") return "outbound";
  if (clean === "outgoing") return "outbound";
  if (clean === "יוצאת") return "outbound";

  return "unknown";
}

function isActiveCall(call: AnyDoc) {
  const status = safeLower(call.status || call.callStatus);

  return (
    call.active === true ||
    call.isActive === true ||
    status === "initiated" ||
    status === "ringing" ||
    status === "answered" ||
    status === "in_call" ||
    status === "bridged"
  );
}

function isAnsweredCall(call: AnyDoc) {
  const status = safeLower(call.status || call.callStatus);

  return (
    call.answeredAt ||
    call.connectedAt ||
    status === "answered" ||
    status === "completed" ||
    status === "in_call" ||
    status === "bridged"
  );
}

/* =====================================================
   CALL NORMALIZER
===================================================== */

function getCallTargetName(call: AnyDoc | null) {
  if (!call) return "";

  return (
    safeString(call.customerName) ||
    safeString(call.clientName) ||
    safeString(call.guestName) ||
    safeString(call.contactName) ||
    safeString(call.leadName) ||
    safeString(call.toName) ||
    safeString(call.fromName)
  );
}

function getCallTargetPhone(call: AnyDoc | null) {
  if (!call) return "";

  const direction = normalizeDirection(call.direction);

  if (direction === "inbound") {
    return (
      safeString(call.from) ||
      safeString(call.caller) ||
      safeString(call.callerNumber) ||
      safeString(call.customerPhone) ||
      safeString(call.guestPhone) ||
      safeString(call.clientPhone) ||
      safeString(call.phone)
    );
  }

  if (direction === "outbound") {
    return (
      safeString(call.to) ||
      safeString(call.toNumber) ||
      safeString(call.customerPhone) ||
      safeString(call.guestPhone) ||
      safeString(call.clientPhone) ||
      safeString(call.phone)
    );
  }

  return (
    safeString(call.customerPhone) ||
    safeString(call.guestPhone) ||
    safeString(call.clientPhone) ||
    safeString(call.phone) ||
    safeString(call.to) ||
    safeString(call.from)
  );
}

function normalizeCurrentCall(call: AnyDoc | null) {
  if (!call || !isActiveCall(call)) return null;

  const status = safeString(call.status || call.callStatus || "in_call");

  const startedAt =
    call.startedAt ||
    call.startTime ||
    call.createdAt ||
    call.created_at ||
    null;

  const answeredAt =
    call.answeredAt ||
    call.answerTime ||
    call.connectedAt ||
    null;

  const startForDuration = answeredAt || startedAt;

  return {
    active: true,
    direction: normalizeDirection(call.direction),
    status,
    startedAt,
    answeredAt,
    durationSeconds:
      Number(call.durationSeconds || call.duration || 0) ||
      secondsFrom(startForDuration),

    customerName: getCallTargetName(call),
    customerPhone: getCallTargetPhone(call),

    guestName: safeString(call.guestName),
    guestPhone: safeString(call.guestPhone),

    eventName:
      safeString(call.eventName) ||
      safeString(call.eventTitle) ||
      safeString(call.invitationTitle),

    invitationTitle:
      safeString(call.invitationTitle) ||
      safeString(call.invitationName) ||
      safeString(call.eventName),

    callControlId:
      safeString(call.callControlId) ||
      safeString(call.call_control_id) ||
      safeString(call.callLegId) ||
      safeString(call.call_leg_id),
  };
}

/* =====================================================
   SHIFT NORMALIZER
===================================================== */

function parseShiftDateTime(dateValue: any, timeValue: any) {
  const baseDate = safeDate(dateValue);

  if (!baseDate) {
    return safeDate(timeValue);
  }

  const timeString = safeString(timeValue);

  if (!timeString) return baseDate;

  const match = timeString.match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    const directDate = safeDate(timeValue);
    return directDate || baseDate;
  }

  const date = new Date(baseDate);
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);

  return date;
}

function normalizeShift(shift: AnyDoc | null) {
  if (!shift) return null;

  const dateValue =
    shift.date ||
    shift.shiftDate ||
    shift.day ||
    shift.workDate ||
    shift.createdAt;

  const startAt =
    shift.startAt ||
    shift.startsAt ||
    shift.shiftStart ||
    shift.dateStart ||
    parseShiftDateTime(dateValue, shift.startTime || shift.startHour || shift.from);

  const endAt =
    shift.endAt ||
    shift.endsAt ||
    shift.shiftEnd ||
    shift.dateEnd ||
    parseShiftDateTime(dateValue, shift.endTime || shift.endHour || shift.to);

  return {
    active: true,
    title:
      safeString(shift.title) ||
      safeString(shift.name) ||
      "משמרת פעילה",

    startAt: startAt || null,
    endAt: endAt || null,

    location:
      safeString(shift.locationType) ||
      safeString(shift.location) ||
      safeString(shift.workLocation),

    venueName:
      safeString(shift.venueName) ||
      safeString(shift.hallName) ||
      safeString(shift.placeName),

    eventName:
      safeString(shift.eventName) ||
      safeString(shift.eventTitle) ||
      safeString(shift.invitationTitle),
  };
}

/* =====================================================
   LOADERS
===================================================== */

async function loadEmployees() {
  const usersCollection = await findFirstCollection(["users", "Users"]);

  const employeesCollection = await findFirstCollection([
    "employees",
    "Employees",
    "staff",
    "Staff",
  ]);

  const employeesMap = new Map<string, AnyDoc>();

  if (usersCollection) {
    const users = await usersCollection
      .find({
        deletedAt: { $exists: false },
        $or: [
          {
            role: {
              $in: [
                "staff",
                "employee",
                "worker",
                "representative",
                "sales",
                "caller",
                "call_agent",
                "phone_agent",
              ],
            },
          },
          {
            staffType: {
              $in: [
                "staff",
                "employee",
                "worker",
                "calls",
                "call",
                "caller",
                "sales",
                "representative",
                "phone",
                "phone_agent",
              ],
            },
          },
          { isEmployee: true },
          { employee: true },
          { isStaff: true },
          { staff: true },
        ],
      })
      .project({
        password: 0,
        hashedPassword: 0,
        resetToken: 0,
        verificationToken: 0,
      })
      .sort({ name: 1, fullName: 1, email: 1 })
      .limit(500)
      .toArray();

    for (const user of users) {
      if (!isSystemEmployee(user)) continue;

      const id = getEmployeeId(user);
      if (!id) continue;

      employeesMap.set(id, user);
    }
  }

  if (employeesCollection) {
    const employees = await employeesCollection
      .find({
        deletedAt: { $exists: false },
      })
      .sort({ name: 1, fullName: 1, email: 1 })
      .limit(500)
      .toArray();

    for (const employee of employees) {
      if (!isSystemEmployee(employee)) continue;

      const id = getEmployeeId(employee);
      if (!id) continue;

      const existing = employeesMap.get(id) || {};

      employeesMap.set(id, {
        ...existing,
        ...employee,
      });
    }
  }

  return Array.from(employeesMap.values());
}

async function loadCurrentCall(employee: AnyDoc) {
  const callsCollection = await findFirstCollection([
    "calllogs",
    "CallLogs",
    "calls",
    "Calls",
    "callrecords",
    "CallRecords",
    "callhistories",
    "CallHistories",
    "softphonecalls",
    "SoftphoneCalls",
  ]);

  if (!callsCollection) return null;

  const employeeQuery = getEmployeeMatchQuery(employee);

  if (!Object.keys(employeeQuery).length) return null;

  const activeCallQuery = {
    $or: [
      { active: true },
      { isActive: true },
      {
        status: {
          $in: ["initiated", "ringing", "answered", "in_call", "bridged"],
        },
      },
      {
        callStatus: {
          $in: ["initiated", "ringing", "answered", "in_call", "bridged"],
        },
      },
    ],
  };

  const call = await callsCollection.findOne(
    mergeAnd(employeeQuery, activeCallQuery),
    {
      sort: {
        answeredAt: -1,
        connectedAt: -1,
        startedAt: -1,
        createdAt: -1,
        updatedAt: -1,
      },
    }
  );

  return call;
}

async function loadSoftphoneDoc(employee: AnyDoc) {
  const softphoneCollection = await findFirstCollection([
    "softphonesessions",
    "SoftphoneSessions",
    "softphonestatuses",
    "SoftphoneStatuses",
    "softphoneagents",
    "SoftphoneAgents",
    "agentstatuses",
    "AgentStatuses",
    "staffstatuses",
    "StaffStatuses",
    "employeestatuses",
    "EmployeeStatuses",
  ]);

  if (!softphoneCollection) return null;

  const employeeQuery = getEmployeeMatchQuery(employee);

  if (!Object.keys(employeeQuery).length) return null;

  const doc = await softphoneCollection.findOne(employeeQuery, {
    sort: {
      lastSeenAt: -1,
      updatedAt: -1,
      createdAt: -1,
    },
  });

  return doc;
}

async function loadActiveShift(employee: AnyDoc) {
  const shiftsCollection = await findFirstCollection([
    "employeeshifts",
    "EmployeeShifts",
    "shifts",
    "Shifts",
    "staffshifts",
    "StaffShifts",
    "workshifts",
    "WorkShifts",
  ]);

  if (!shiftsCollection) return null;

  const employeeQuery = getEmployeeMatchQuery(employee);
  if (!Object.keys(employeeQuery).length) return null;

  const { start, end, now } = getTodayRange();

  /**
   * תומך גם במבנה של:
   * startAt/endAt
   * startTime/endTime
   * shiftStart/shiftEnd
   * date + startTime/endTime
   * active/isActive
   */
  const shiftQuery = {
    $or: [
      { active: true },
      { isActive: true },

      {
        startAt: { $lte: now },
        endAt: { $gte: now },
      },
      {
        startsAt: { $lte: now },
        endsAt: { $gte: now },
      },
      {
        shiftStart: { $lte: now },
        shiftEnd: { $gte: now },
      },

      {
        date: { $gte: start, $lte: end },
      },
      {
        shiftDate: { $gte: start, $lte: end },
      },
      {
        workDate: { $gte: start, $lte: end },
      },
      {
        day: { $gte: start, $lte: end },
      },
    ],
  };

  const shift = await shiftsCollection.findOne(
    mergeAnd(employeeQuery, shiftQuery),
    {
      sort: {
        active: -1,
        isActive: -1,
        startAt: -1,
        startsAt: -1,
        shiftStart: -1,
        date: -1,
        shiftDate: -1,
        createdAt: -1,
      },
    }
  );

  return shift;
}

async function loadTodayStats(employee: AnyDoc) {
  const { start, end } = getTodayRange();

  const callsCollection = await findFirstCollection([
    "calllogs",
    "CallLogs",
    "calls",
    "Calls",
    "callrecords",
    "CallRecords",
    "callhistories",
    "CallHistories",
    "softphonecalls",
    "SoftphoneCalls",
  ]);

  const tasksCollection = await findFirstCollection([
    "callworkorders",
    "CallWorkOrders",
    "calltasks",
    "CallTasks",
    "tasks",
    "Tasks",
  ]);

  const stats = {
    callsToday: 0,
    answeredToday: 0,
    tasksToday: 0,
    completedToday: 0,
  };

  const employeeQuery = getEmployeeMatchQuery(employee);

  if (callsCollection && Object.keys(employeeQuery).length) {
    const todayCallQuery = {
      $or: [
        { createdAt: { $gte: start, $lte: end } },
        { startedAt: { $gte: start, $lte: end } },
        { updatedAt: { $gte: start, $lte: end } },
      ],
    };

    const calls = await callsCollection
      .find(mergeAnd(employeeQuery, todayCallQuery))
      .project({
        status: 1,
        callStatus: 1,
        answeredAt: 1,
        connectedAt: 1,
      })
      .limit(3000)
      .toArray();

    stats.callsToday = calls.length;
    stats.answeredToday = calls.filter(isAnsweredCall).length;
  }

  if (tasksCollection && Object.keys(employeeQuery).length) {
    const todayTaskQuery = {
      $or: [
        { createdAt: { $gte: start, $lte: end } },
        { updatedAt: { $gte: start, $lte: end } },
        { date: { $gte: start, $lte: end } },
      ],
    };

    const tasks = await tasksCollection
      .find(mergeAnd(employeeQuery, todayTaskQuery))
      .project({
        status: 1,
        completed: 1,
        completedAt: 1,
      })
      .limit(3000)
      .toArray();

    stats.tasksToday = tasks.length;

    stats.completedToday = tasks.filter((task) => {
      const status = safeLower(task.status);

      return (
        task.completed === true ||
        Boolean(task.completedAt) ||
        status === "completed" ||
        status === "done" ||
        status === "closed"
      );
    }).length;
  }

  return stats;
}

/* =====================================================
   NORMALIZERS
===================================================== */

function normalizeSoftphone(employee: AnyDoc, softphoneDoc: AnyDoc | null, currentCallRaw: AnyDoc | null) {
  const employeeSoftphone = employee.softphone || {};

  const lastSeenAt =
    softphoneDoc?.lastSeenAt ||
    softphoneDoc?.updatedAt ||
    softphoneDoc?.createdAt ||
    employeeSoftphone.lastSeenAt ||
    employee.lastSeenAt ||
    employee.updatedAt ||
    null;

  let status = normalizeSoftphoneStatus(
    softphoneDoc?.status ||
      softphoneDoc?.softphoneStatus ||
      softphoneDoc?.availabilityStatus ||
      employeeSoftphone.status ||
      employee.softphoneStatus ||
      employee.availabilityStatus ||
      employee.status
  );

  if (currentCallRaw && isActiveCall(currentCallRaw)) {
    const callStatus = safeLower(currentCallRaw.status || currentCallRaw.callStatus);

    if (callStatus === "ringing" || callStatus === "initiated") {
      status = "ringing";
    } else {
      status = "in_call";
    }
  }

  if (status === "unknown") {
    if (
      employee.isOnline === true ||
      employee.online === true ||
      softphoneDoc?.isOnline === true ||
      softphoneDoc?.online === true
    ) {
      status = "online";
    }
  }

  if (status === "unknown") {
    const lastSeenDate = safeDate(lastSeenAt);

    if (lastSeenDate) {
      const diffSeconds = Math.floor((Date.now() - lastSeenDate.getTime()) / 1000);
      status = diffSeconds <= 120 ? "online" : "offline";
    }
  }

  if (status === "unknown") {
    status = "offline";
  }

  return {
    status,
    extension:
      safeString(softphoneDoc?.extension) ||
      safeString(softphoneDoc?.sipExtension) ||
      safeString(employeeSoftphone.extension) ||
      safeString(employee.extension),

    sipUsername:
      safeString(softphoneDoc?.sipUsername) ||
      safeString(softphoneDoc?.sip_user) ||
      safeString(employeeSoftphone.sipUsername) ||
      safeString(employee.sipUsername),

    lastSeenAt,
  };
}

function normalizeAvailability(employee: AnyDoc, softphoneDoc: AnyDoc | null, currentCallRaw: AnyDoc | null) {
  const source =
    softphoneDoc?.availability ||
    employee.availability ||
    softphoneDoc ||
    employee ||
    {};

  let status = normalizeSoftphoneStatus(
    source.availabilityStatus ||
      source.status ||
      employee.availabilityStatus ||
      employee.currentAvailabilityStatus
  );

  const reason =
    safeString(source.reason) ||
    safeString(source.note) ||
    safeString(source.statusReason) ||
    safeString(employee.availabilityReason) ||
    safeString(employee.notAvailableReason);

  const since =
    source.since ||
    source.startedAt ||
    source.statusSince ||
    employee.availabilitySince ||
    employee.notAvailableSince ||
    softphoneDoc?.updatedAt ||
    null;

  if (currentCallRaw && isActiveCall(currentCallRaw)) {
    status = "in_call";
  } else if (reason && status === "unknown") {
    status = "not_available";
  }

  return {
    status,
    reason,
    since,
    durationSeconds:
      Number(source.durationSeconds || employee.availabilityDurationSeconds || 0) ||
      secondsFrom(since),
  };
}

function normalizeWork(employee: AnyDoc, currentCallRaw: AnyDoc | null, todayStats: AnyDoc) {
  const work = employee.work || {};

  return {
    currentTaskTitle:
      safeString(work.currentTaskTitle) ||
      safeString(employee.currentTaskTitle) ||
      safeString(currentCallRaw?.taskTitle),

    currentTaskType:
      safeString(work.currentTaskType) ||
      safeString(employee.currentTaskType) ||
      safeString(currentCallRaw?.taskType),

    currentClientName:
      safeString(work.currentClientName) ||
      safeString(employee.currentClientName) ||
      getCallTargetName(currentCallRaw),

    currentEventName:
      safeString(work.currentEventName) ||
      safeString(employee.currentEventName) ||
      safeString(currentCallRaw?.eventName) ||
      safeString(currentCallRaw?.invitationTitle),

    tasksToday: Number(todayStats.tasksToday || 0),
    completedToday: Number(todayStats.completedToday || 0),
    callsToday: Number(todayStats.callsToday || 0),
    answeredToday: Number(todayStats.answeredToday || 0),
  };
}

async function normalizeEmployee(employee: AnyDoc) {
  const [currentCallRaw, softphoneDoc, shiftDoc, todayStats] = await Promise.all([
    loadCurrentCall(employee),
    loadSoftphoneDoc(employee),
    loadActiveShift(employee),
    loadTodayStats(employee),
  ]);

  const currentCall = normalizeCurrentCall(currentCallRaw);
  const softphone = normalizeSoftphone(employee, softphoneDoc, currentCallRaw);
  const availability = normalizeAvailability(employee, softphoneDoc, currentCallRaw);
  const shift = normalizeShift(shiftDoc);
  const work = normalizeWork(employee, currentCallRaw, todayStats);

  if (currentCall) {
    softphone.status = currentCall.status === "ringing" ? "ringing" : "in_call";
    availability.status = softphone.status;
  } else if (
    availability.status !== "unknown" &&
    availability.status !== "online" &&
    availability.status !== "offline"
  ) {
    softphone.status = availability.status;
  }

  const id = getEmployeeId(employee);

  return {
    id,
    _id: id,

    name: getEmployeeName(employee),
    fullName: safeString(employee.fullName),
    email: getEmployeeEmail(employee),
    phone: getEmployeePhone(employee),

    avatar:
      safeString(employee.avatar) ||
      safeString(employee.image) ||
      safeString(employee.photoURL) ||
      safeString(employee.profileImage),

    role: safeString(employee.role),
    staffType: safeString(employee.staffType),

    isActive: employee.isActive !== false && employee.active !== false,

    isOnline:
      softphone.status === "online" ||
      softphone.status === "in_call" ||
      softphone.status === "ringing",

    softphone,
    currentCall,
    availability,
    shift,
    work,

    updatedAt:
      softphoneDoc?.updatedAt ||
      softphoneDoc?.lastSeenAt ||
      currentCallRaw?.updatedAt ||
      currentCallRaw?.createdAt ||
      employee.updatedAt ||
      null,
  };
}

/* =====================================================
   GET
===================================================== */

export async function GET(_req: NextRequest) {
  try {
    await db();

    const employeesRaw = await loadEmployees();

    const employees = await Promise.all(
      employeesRaw.map((employee) => normalizeEmployee(employee))
    );

    const order: Record<SoftphoneStatus, number> = {
      in_call: 1,
      ringing: 2,
      online: 3,
      busy: 4,
      break: 5,
      not_available: 6,
      offline: 7,
      unknown: 8,
    };

    employees.sort((a: any, b: any) => {
      const aStatus = a.softphone?.status || "unknown";
      const bStatus = b.softphone?.status || "unknown";

      const statusDiff = (order[aStatus as SoftphoneStatus] || 99) - (order[bStatus as SoftphoneStatus] || 99);

      if (statusDiff !== 0) return statusDiff;

      const aShift = a.shift?.active ? 0 : 1;
      const bShift = b.shift?.active ? 0 : 1;

      if (aShift !== bShift) return aShift - bShift;

      return String(a.name || "").localeCompare(String(b.name || ""), "he");
    });

    return NextResponse.json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error: any) {
    console.error("❌ GET /api/admin/shift-management failed:", error);

    return jsonError(
      "שגיאה בטעינת ניהול המשמרת",
      500,
      error?.message || error
    );
  }
}