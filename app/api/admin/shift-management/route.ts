import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =====================================================
   TYPES
===================================================== */

type SoftphoneStatus =
  | "online"
  | "offline"
  | "in_call"
  | "ringing"
  | "busy"
  | "break"
  | "not_available"
  | "unknown";

type AnyDoc = Record<string, any>;

type NormalizedEmployee = {
  id: string;
  _id?: string;

  name: string;
  fullName?: string;
  email?: string;
  phone?: string;

  avatar?: string;
  role?: string;
  staffType?: string;

  isActive: boolean;
  isOnline: boolean;

  softphone: {
    status: SoftphoneStatus;
    extension: string;
    sipUsername: string;
    lastSeenAt: Date | string | null;
  };

  currentCall: {
    active: boolean;
    direction: "inbound" | "outbound" | "unknown";
    status: string;
    startedAt: Date | string | null;
    answeredAt: Date | string | null;
    durationSeconds: number;
    customerName: string;
    customerPhone: string;
    guestName: string;
    guestPhone: string;
    eventName: string;
    invitationTitle: string;
    callControlId: string;
  } | null;

  availability: {
    status: SoftphoneStatus;
    reason: string;
    since: Date | string | null;
    durationSeconds: number;
  };

  shift: {
    active: boolean;
    title: string;
    startAt: Date | string | null;
    endAt: Date | string | null;
    location: string;
    venueName: string;
    eventName: string;
  } | null;

  work: {
    currentTaskTitle: string;
    currentTaskType: string;
    currentClientName: string;
    currentEventName: string;
    tasksToday: number;
    completedToday: number;
    callsToday: number;
    answeredToday: number;
  };

  updatedAt: Date | string | null;
};

/* =====================================================
   HELPERS
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

function toObjectId(value?: any) {
  if (!value) return null;

  const clean = String(value);

  if (!mongoose.Types.ObjectId.isValid(clean)) return null;

  return new mongoose.Types.ObjectId(clean);
}

function safeString(value: any) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function safeDate(value: any): Date | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date;
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

  return { start, end };
}

async function collectionExists(name: string) {
  try {
    const database = mongoose.connection.db;

    if (!database) return false;

    const found = await database
      .listCollections({ name })
      .toArray();

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

function normalizeRole(value: any) {
  return safeString(value).toLowerCase();
}

function isEmployeeDoc(doc: AnyDoc) {
  const role = normalizeRole(doc.role);
  const staffType = normalizeRole(doc.staffType);
  const type = normalizeRole(doc.type);

  if (doc.deletedAt) return false;

  if (role === "admin") return false;
  if (role === "client") return false;
  if (role === "user" && !staffType && !doc.isEmployee) return false;

  return (
    role === "staff" ||
    role === "employee" ||
    role === "worker" ||
    role === "sales" ||
    role === "representative" ||
    role === "producer" ||
    staffType === "staff" ||
    staffType === "employee" ||
    staffType === "calls" ||
    staffType === "sales" ||
    staffType === "representative" ||
    type === "employee" ||
    doc.isEmployee === true ||
    doc.employee === true
  );
}

function getEmployeeId(doc: AnyDoc) {
  return safeString(doc._id || doc.id || doc.userId || doc.employeeId);
}

function getEmployeeName(doc: AnyDoc) {
  return (
    safeString(doc.fullName) ||
    safeString(doc.name) ||
    safeString(doc.displayName) ||
    safeString(doc.employeeName) ||
    safeString(doc.email) ||
    "עובד ללא שם"
  );
}

function getEmployeePhone(doc: AnyDoc) {
  return (
    safeString(doc.phone) ||
    safeString(doc.phoneNumber) ||
    safeString(doc.mobile) ||
    safeString(doc.employeePhone)
  );
}

function getEmployeeEmail(doc: AnyDoc) {
  return safeString(doc.email || doc.employeeEmail);
}

function normalizeDirection(value: any): "inbound" | "outbound" | "unknown" {
  const clean = safeString(value).toLowerCase();

  if (clean === "inbound") return "inbound";
  if (clean === "outbound") return "outbound";

  return "unknown";
}

function normalizeSoftphoneStatus(value: any): SoftphoneStatus {
  const clean = safeString(value).toLowerCase();

  if (clean === "online") return "online";
  if (clean === "offline") return "offline";
  if (clean === "in_call") return "in_call";
  if (clean === "incall") return "in_call";
  if (clean === "answered") return "in_call";
  if (clean === "active_call") return "in_call";
  if (clean === "ringing") return "ringing";
  if (clean === "busy") return "busy";
  if (clean === "break") return "break";
  if (clean === "pause") return "break";
  if (clean === "not_available") return "not_available";
  if (clean === "unavailable") return "not_available";
  if (clean === "away") return "not_available";

  return "unknown";
}

function isActiveCall(doc: AnyDoc) {
  const status = safeString(doc.status || doc.callStatus).toLowerCase();

  return (
    doc.active === true ||
    doc.isActive === true ||
    status === "initiated" ||
    status === "ringing" ||
    status === "answered" ||
    status === "in_call" ||
    status === "bridged"
  );
}

function isAnsweredCall(doc: AnyDoc) {
  const status = safeString(doc.status || doc.callStatus).toLowerCase();

  return (
    status === "answered" ||
    status === "completed" ||
    status === "in_call" ||
    Boolean(doc.answeredAt)
  );
}

function getCallEmployeeQuery(employee: AnyDoc) {
  const employeeId = getEmployeeId(employee);
  const objectId = toObjectId(employeeId);
  const email = getEmployeeEmail(employee);
  const phone = getEmployeePhone(employee);

  const or: AnyDoc[] = [];

  if (employeeId) {
    or.push({ employeeId });
    or.push({ staffId: employeeId });
    or.push({ agentId: employeeId });
    or.push({ userId: employeeId });
    or.push({ createdBy: employeeId });
    or.push({ "employee.id": employeeId });
    or.push({ "staff.id": employeeId });
    or.push({ "agent.id": employeeId });
  }

  if (objectId) {
    or.push({ employeeId: objectId });
    or.push({ staffId: objectId });
    or.push({ agentId: objectId });
    or.push({ userId: objectId });
    or.push({ createdBy: objectId });
    or.push({ "employee._id": objectId });
    or.push({ "staff._id": objectId });
    or.push({ "agent._id": objectId });
  }

  if (email) {
    or.push({ employeeEmail: email });
    or.push({ staffEmail: email });
    or.push({ agentEmail: email });
    or.push({ "employee.email": email });
    or.push({ "staff.email": email });
    or.push({ "agent.email": email });
  }

  if (phone) {
    or.push({ employeePhone: phone });
    or.push({ staffPhone: phone });
    or.push({ agentPhone: phone });
    or.push({ from: phone });
    or.push({ caller: phone });
  }

  return or.length ? { $or: or } : {};
}

function getShiftEmployeeQuery(employee: AnyDoc) {
  const employeeId = getEmployeeId(employee);
  const objectId = toObjectId(employeeId);
  const email = getEmployeeEmail(employee);

  const or: AnyDoc[] = [];

  if (employeeId) {
    or.push({ employeeId });
    or.push({ staffId: employeeId });
    or.push({ userId: employeeId });
    or.push({ "employee.id": employeeId });
    or.push({ "staff.id": employeeId });
  }

  if (objectId) {
    or.push({ employeeId: objectId });
    or.push({ staffId: objectId });
    or.push({ userId: objectId });
    or.push({ "employee._id": objectId });
    or.push({ "staff._id": objectId });
  }

  if (email) {
    or.push({ employeeEmail: email });
    or.push({ staffEmail: email });
    or.push({ "employee.email": email });
    or.push({ "staff.email": email });
  }

  return or.length ? { $or: or } : {};
}

function getSoftphoneEmployeeQuery(employee: AnyDoc) {
  const employeeId = getEmployeeId(employee);
  const objectId = toObjectId(employeeId);
  const email = getEmployeeEmail(employee);
  const phone = getEmployeePhone(employee);

  const or: AnyDoc[] = [];

  if (employeeId) {
    or.push({ employeeId });
    or.push({ staffId: employeeId });
    or.push({ agentId: employeeId });
    or.push({ userId: employeeId });
    or.push({ "employee.id": employeeId });
    or.push({ "staff.id": employeeId });
    or.push({ "agent.id": employeeId });
  }

  if (objectId) {
    or.push({ employeeId: objectId });
    or.push({ staffId: objectId });
    or.push({ agentId: objectId });
    or.push({ userId: objectId });
    or.push({ "employee._id": objectId });
    or.push({ "staff._id": objectId });
    or.push({ "agent._id": objectId });
  }

  if (email) {
    or.push({ email });
    or.push({ employeeEmail: email });
    or.push({ staffEmail: email });
    or.push({ agentEmail: email });
    or.push({ "employee.email": email });
    or.push({ "staff.email": email });
    or.push({ "agent.email": email });
  }

  if (phone) {
    or.push({ phone });
    or.push({ employeePhone: phone });
    or.push({ staffPhone: phone });
    or.push({ agentPhone: phone });
  }

  return or.length ? { $or: or } : {};
}

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
      safeString(call.customerPhone) ||
      safeString(call.guestPhone) ||
      safeString(call.clientPhone) ||
      safeString(call.phone)
    );
  }

  if (direction === "outbound") {
    return (
      safeString(call.to) ||
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

function normalizeAvailability(employee: AnyDoc, softphoneDoc: AnyDoc | null) {
  const source =
    employee.availability ||
    employee.statusAvailability ||
    softphoneDoc?.availability ||
    softphoneDoc ||
    {};

  let status = normalizeSoftphoneStatus(
    source.status ||
      source.availabilityStatus ||
      employee.availabilityStatus ||
      employee.currentAvailabilityStatus
  );

  const reason =
    safeString(source.reason) ||
    safeString(source.note) ||
    safeString(employee.availabilityReason) ||
    safeString(employee.notAvailableReason);

  const since =
    source.since ||
    source.startedAt ||
    employee.availabilitySince ||
    employee.notAvailableSince ||
    softphoneDoc?.updatedAt ||
    null;

  if (reason && status === "unknown") {
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

function normalizeSoftphone(employee: AnyDoc, softphoneDoc: AnyDoc | null, currentCall: AnyDoc | null) {
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
      employeeSoftphone.status ||
      employee.softphoneStatus
  );

  if (currentCall) {
    const callStatus = safeString(currentCall.status || currentCall.callStatus).toLowerCase();

    if (callStatus === "ringing" || callStatus === "initiated") {
      status = "ringing";
    } else {
      status = "in_call";
    }
  }

  if (status === "unknown") {
    if (employee.isOnline === true || employee.online === true) {
      status = "online";
    } else if (employee.isActive === false || employee.active === false) {
      status = "offline";
    }
  }

  if (status === "unknown") {
    const lastSeenDate = safeDate(lastSeenAt);

    if (lastSeenDate) {
      const diffSeconds = Math.floor((Date.now() - lastSeenDate.getTime()) / 1000);
      status = diffSeconds <= 90 ? "online" : "offline";
    }
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

function normalizeShift(shiftDoc: AnyDoc | null) {
  if (!shiftDoc) return null;

  const startAt =
    shiftDoc.startAt ||
    shiftDoc.startTime ||
    shiftDoc.shiftStart ||
    shiftDoc.dateStart ||
    null;

  const endAt =
    shiftDoc.endAt ||
    shiftDoc.endTime ||
    shiftDoc.shiftEnd ||
    shiftDoc.dateEnd ||
    null;

  return {
    active: true,
    title:
      safeString(shiftDoc.title) ||
      safeString(shiftDoc.name) ||
      "משמרת פעילה",
    startAt,
    endAt,
    location:
      safeString(shiftDoc.locationType) ||
      safeString(shiftDoc.location) ||
      safeString(shiftDoc.workLocation),
    venueName:
      safeString(shiftDoc.venueName) ||
      safeString(shiftDoc.hallName) ||
      safeString(shiftDoc.placeName),
    eventName:
      safeString(shiftDoc.eventName) ||
      safeString(shiftDoc.eventTitle) ||
      safeString(shiftDoc.invitationTitle),
  };
}

function normalizeWork(employee: AnyDoc, currentCall: AnyDoc | null, todayStats: AnyDoc) {
  const work = employee.work || {};

  return {
    currentTaskTitle:
      safeString(work.currentTaskTitle) ||
      safeString(employee.currentTaskTitle) ||
      safeString(currentCall?.taskTitle),
    currentTaskType:
      safeString(work.currentTaskType) ||
      safeString(employee.currentTaskType) ||
      safeString(currentCall?.taskType),
    currentClientName:
      safeString(work.currentClientName) ||
      safeString(employee.currentClientName) ||
      getCallTargetName(currentCall),
    currentEventName:
      safeString(work.currentEventName) ||
      safeString(employee.currentEventName) ||
      safeString(currentCall?.eventName) ||
      safeString(currentCall?.invitationTitle),
    tasksToday: Number(todayStats.tasksToday || 0),
    completedToday: Number(todayStats.completedToday || 0),
    callsToday: Number(todayStats.callsToday || 0),
    answeredToday: Number(todayStats.answeredToday || 0),
  };
}

/* =====================================================
   DATA LOADERS
===================================================== */

async function loadEmployees() {
  const usersCollection = await findFirstCollection([
    "users",
    "Users",
  ]);

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
        $or: [
          { role: { $in: ["staff", "employee", "worker", "sales", "representative", "producer"] } },
          { staffType: { $exists: true, $ne: "" } },
          { isEmployee: true },
          { employee: true },
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
      if (!isEmployeeDoc(user)) continue;

      employeesMap.set(getEmployeeId(user), user);
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

  const employeeQuery = getCallEmployeeQuery(employee);

  if (!Object.keys(employeeQuery).length) return null;

  const call = await callsCollection.findOne(
    {
      ...employeeQuery,
      $or: [
        { active: true },
        { isActive: true },
        { status: { $in: ["initiated", "ringing", "answered", "in_call", "bridged"] } },
        { callStatus: { $in: ["initiated", "ringing", "answered", "in_call", "bridged"] } },
      ],
    },
    {
      sort: {
        answeredAt: -1,
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
  ]);

  if (!softphoneCollection) return null;

  const employeeQuery = getSoftphoneEmployeeQuery(employee);

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
  ]);

  if (!shiftsCollection) return null;

  const employeeQuery = getShiftEmployeeQuery(employee);

  if (!Object.keys(employeeQuery).length) return null;

  const now = new Date();

  const activeShift = await shiftsCollection.findOne(
    {
      ...employeeQuery,
      $or: [
        { active: true },
        { isActive: true },
        {
          startAt: { $lte: now },
          endAt: { $gte: now },
        },
        {
          startTime: { $lte: now },
          endTime: { $gte: now },
        },
        {
          shiftStart: { $lte: now },
          shiftEnd: { $gte: now },
        },
      ],
    },
    {
      sort: {
        startAt: -1,
        startTime: -1,
        shiftStart: -1,
        createdAt: -1,
      },
    }
  );

  return activeShift;
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

  const employeeCallQuery = getCallEmployeeQuery(employee);

  if (callsCollection && Object.keys(employeeCallQuery).length) {
    const createdAtQuery = {
      $or: [
        { createdAt: { $gte: start, $lte: end } },
        { startedAt: { $gte: start, $lte: end } },
        { updatedAt: { $gte: start, $lte: end } },
      ],
    };

    const calls = await callsCollection
      .find({
        ...employeeCallQuery,
        ...createdAtQuery,
      })
      .project({
        status: 1,
        callStatus: 1,
        answeredAt: 1,
      })
      .limit(2000)
      .toArray();

    stats.callsToday = calls.length;
    stats.answeredToday = calls.filter(isAnsweredCall).length;
  }

  const employeeTaskQuery = getShiftEmployeeQuery(employee);

  if (tasksCollection && Object.keys(employeeTaskQuery).length) {
    const tasks = await tasksCollection
      .find({
        ...employeeTaskQuery,
        $or: [
          { createdAt: { $gte: start, $lte: end } },
          { updatedAt: { $gte: start, $lte: end } },
          { date: { $gte: start, $lte: end } },
        ],
      })
      .project({
        status: 1,
        completed: 1,
        completedAt: 1,
      })
      .limit(2000)
      .toArray();

    stats.tasksToday = tasks.length;
    stats.completedToday = tasks.filter((task) => {
      const status = safeString(task.status).toLowerCase();

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

async function normalizeEmployee(employee: AnyDoc): Promise<NormalizedEmployee> {
  const [currentCallRaw, softphoneDoc, shiftDoc, todayStats] =
    await Promise.all([
      loadCurrentCall(employee),
      loadSoftphoneDoc(employee),
      loadActiveShift(employee),
      loadTodayStats(employee),
    ]);

  const currentCall = normalizeCurrentCall(currentCallRaw);
  const softphone = normalizeSoftphone(employee, softphoneDoc, currentCallRaw);
  const availability = normalizeAvailability(employee, softphoneDoc);

  if (
    currentCall &&
    softphone.status !== "ringing"
  ) {
    softphone.status = "in_call";
  }

  if (
    !currentCall &&
    availability.status !== "unknown" &&
    availability.status !== "online"
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
      softphone.status === "ringing" ||
      employee.isOnline === true ||
      employee.online === true,

    softphone,
    currentCall,
    availability,
    shift: normalizeShift(shiftDoc),
    work: normalizeWork(employee, currentCallRaw, todayStats),

    updatedAt:
      employee.updatedAt ||
      softphoneDoc?.updatedAt ||
      softphoneDoc?.lastSeenAt ||
      currentCallRaw?.updatedAt ||
      currentCallRaw?.createdAt ||
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

    employees.sort((a, b) => {
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

      const aStatus = a.softphone.status || "unknown";
      const bStatus = b.softphone.status || "unknown";

      const statusDiff = (order[aStatus] || 99) - (order[bStatus] || 99);

      if (statusDiff !== 0) return statusDiff;

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