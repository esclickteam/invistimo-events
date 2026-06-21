"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/* =====================================================
   TYPES
===================================================== */

type SoftphoneStatus =
  | "online"
  | "offline"
  | "dialing"
  | "in_call"
  | "ringing"
  | "busy"
  | "break"
  | "not_available"
  | "unknown";

type ShiftManagementFilter =
  | "default"
  | "all"
  | "connected"
  | "scheduled_today"
  | SoftphoneStatus;

type EmployeeShiftMonitor = {
  id?: string;
  _id?: string;

  name?: string;
  fullName?: string;
  displayName?: string;
  employeeName?: string;

  email?: string;
  phone?: string;
  phoneNumber?: string;
  mobile?: string;

  avatar?: string;
  image?: string;
  photoURL?: string;
  profileImage?: string;

  role?: string;
  staffType?: string;
  type?: string;
  userType?: string;

  isProducer?: boolean;
  producer?: boolean;
  isVenueOwner?: boolean;
  venueOwner?: boolean;

  isEmployee?: boolean;
  employee?: boolean;
  isStaff?: boolean;
  staff?: boolean;

  isActive?: boolean;
  active?: boolean;
  isOnline?: boolean;
  online?: boolean;

  status?: string;
  softphoneStatus?: string;
  availabilityStatus?: string;
  currentAvailabilityStatus?: string;
  availabilityReason?: string;
  notAvailableReason?: string;
  availabilitySince?: string | Date | null;
  notAvailableSince?: string | Date | null;

  shiftSessionId?: string;
  statusStartedAt?: string | Date | null;
  since?: string | Date | null;

  softphone?: {
    status?: SoftphoneStatus | string;
    softphoneStatus?: SoftphoneStatus | string;
    availabilityStatus?: SoftphoneStatus | string;
    extension?: string;
    sipExtension?: string;
    sipUsername?: string;
    sip_user?: string;
    lastSeenAt?: string | Date | null;
    updatedAt?: string | Date | null;
  };

  currentCall?: {
    active?: boolean;
    isActive?: boolean;

    direction?: "inbound" | "outbound" | "unknown" | string;
    status?: string;
    callStatus?: string;

    startedAt?: string | Date | null;
    startTime?: string | Date | null;
    createdAt?: string | Date | null;

    answeredAt?: string | Date | null;
    connectedAt?: string | Date | null;

    durationSeconds?: number;
    duration?: number;

    customerName?: string;
    customerPhone?: string;
    clientName?: string;
    clientPhone?: string;
    guestName?: string;
    guestPhone?: string;
    contactName?: string;
    leadName?: string;

    from?: string;
    to?: string;
    caller?: string;
    callerNumber?: string;
    toNumber?: string;
    phone?: string;

    eventName?: string;
    eventTitle?: string;
    invitationTitle?: string;
    invitationName?: string;

    taskTitle?: string;
    taskType?: string;

    callControlId?: string;
    call_control_id?: string;
    callLegId?: string;
    call_leg_id?: string;
    callSessionId?: string;
    call_session_id?: string;
  } | null;

  availability?: {
    status?: SoftphoneStatus | string;
    availabilityStatus?: SoftphoneStatus | string;
    reason?: string;
    note?: string;
    statusReason?: string;
    since?: string | Date | null;
    startedAt?: string | Date | null;
    statusSince?: string | Date | null;
    durationSeconds?: number;
  };

  shift?: {
    active?: boolean;
    isActive?: boolean;

    title?: string;
    name?: string;

    date?: string | Date | null;
    shiftDate?: string | Date | null;
    workDate?: string | Date | null;
    day?: string | Date | null;

    startAt?: string | Date | null;
    startsAt?: string | Date | null;
    startTime?: string | Date | null;
    startHour?: string;
    from?: string;

    endAt?: string | Date | null;
    endsAt?: string | Date | null;
    endTime?: string | Date | null;
    endHour?: string;
    to?: string;

    location?: string;
    locationType?: string;
    workLocation?: string;

    venueName?: string;
    hallName?: string;
    placeName?: string;

    eventName?: string;
    eventTitle?: string;
    invitationTitle?: string;
  } | null;

  work?: {
    currentTaskTitle?: string;
    currentTaskType?: string;
    currentClientName?: string;
    currentEventName?: string;
    tasksToday?: number;
    completedToday?: number;
    callsToday?: number;
    answeredToday?: number;
  };

  updatedAt?: string | Date | null;
  lastSeenAt?: string | Date | null;
};

type ApiResponse = {
  success?: boolean;
  employees?: EmployeeShiftMonitor[];
  data?: EmployeeShiftMonitor[];
  items?: EmployeeShiftMonitor[];
  count?: number;
  error?: string;
};

type ActionResponse = {
  success?: boolean;
  error?: string;
};

type CallWorkOrderSummary = {
  id?: string;
  _id?: string;
  title?: string;
  clientName?: string;
  clientEmail?: string;
  eventName?: string;
  round?: number;
  status?: string;
  workDate?: string | Date | null;
  totalTasks?: number;
  pendingTasks?: number;
  inProgressTasks?: number;
  completedTasks?: number;
  assignedEmployeeIds?: string[];
  distributionStrategy?: string;
};

type WorkOrdersResponse = {
  success?: boolean;
  workOrders?: CallWorkOrderSummary[];
  data?: CallWorkOrderSummary[];
  items?: CallWorkOrderSummary[];
  error?: string;
};

type TransferModalState = {
  open: boolean;
  fromEmployeeId: string;
  fromEmployeeName: string;
  workOrderId: string;
  toEmployeeId: string;
  reason: string;
};


/* =====================================================
   HELPERS
===================================================== */

function cleanString(value: any) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cleanLower(value: any) {
  return cleanString(value).toLowerCase();
}

function safeDate(value?: string | Date | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseShiftDateTime(
  dateValue?: string | Date | null,
  timeValue?: string | Date | null,
) {
  const directTimeDate = safeDate(timeValue);

  if (directTimeDate && String(timeValue).includes("T")) {
    return directTimeDate;
  }

  const baseDate = safeDate(dateValue);
  if (!baseDate) return directTimeDate;

  const timeString = cleanString(timeValue);
  if (!timeString) return baseDate;

  const match = timeString.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return directTimeDate || baseDate;

  const date = new Date(baseDate);
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);

  return date;
}

function getEmployeeId(employee: EmployeeShiftMonitor) {
  return String(employee.id || employee._id || employee.email || "");
}

function getEmployeeName(employee: EmployeeShiftMonitor) {
  return (
    cleanString(employee.fullName) ||
    cleanString(employee.name) ||
    cleanString(employee.displayName) ||
    cleanString(employee.employeeName) ||
    cleanString(employee.email) ||
    "עובד ללא שם"
  );
}

function getEmployeePhone(employee: EmployeeShiftMonitor) {
  return (
    cleanString(employee.phone) ||
    cleanString(employee.phoneNumber) ||
    cleanString(employee.mobile)
  );
}

function getEmployeeImage(employee: EmployeeShiftMonitor) {
  return (
    cleanString(employee.avatar) ||
    cleanString(employee.image) ||
    cleanString(employee.photoURL) ||
    cleanString(employee.profileImage)
  );
}

function getInitials(name: string) {
  const clean = String(name || "").trim();
  if (!clean) return "??";

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2);

  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.slice(0, 2);
}

function getShiftStart(employee: EmployeeShiftMonitor) {
  const shift = employee.shift;
  if (!shift) return null;

  return (
    safeDate(shift.startAt) ||
    safeDate(shift.startsAt) ||
    parseShiftDateTime(
      shift.date || shift.shiftDate || shift.workDate || shift.day,
      shift.startTime || shift.startHour || shift.from,
    )
  );
}

function getShiftEnd(employee: EmployeeShiftMonitor) {
  const shift = employee.shift;
  if (!shift) return null;

  return (
    safeDate(shift.endAt) ||
    safeDate(shift.endsAt) ||
    parseShiftDateTime(
      shift.date || shift.shiftDate || shift.workDate || shift.day,
      shift.endTime || shift.endHour || shift.to,
    )
  );
}

function isShiftActiveNow(employee: EmployeeShiftMonitor) {
  const shift = employee.shift;

  if (!shift) return false;
  if (shift.active === true || shift.isActive === true) return true;

  const start = getShiftStart(employee);
  const end = getShiftEnd(employee);

  if (!start || !end) return false;

  const now = Date.now();
  return start.getTime() <= now && end.getTime() >= now;
}

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getShiftDate(employee: EmployeeShiftMonitor) {
  const shift = employee.shift;
  if (!shift) return null;

  return (
    safeDate(shift.date) ||
    safeDate(shift.shiftDate) ||
    safeDate(shift.workDate) ||
    safeDate(shift.day) ||
    getShiftStart(employee) ||
    getShiftEnd(employee)
  );
}

function isScheduledToday(employee: EmployeeShiftMonitor) {
  const shiftDate = getShiftDate(employee);
  if (!shiftDate) return false;
  return isSameLocalDay(shiftDate, new Date());
}

function formatTime(value?: string | Date | null) {
  const date = safeDate(value);
  if (!date) return "—";

  return date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value?: string | Date | null) {
  const date = safeDate(value);
  if (!date) return "—";

  return date.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function secondsBetween(from?: string | Date | null) {
  const date = safeDate(from);
  if (!date) return 0;

  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
}

function formatDuration(totalSeconds?: number) {
  const seconds = Math.max(0, Number(totalSeconds || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return `${m}:${String(s).padStart(2, "0")}`;
}

function normalizeRawStatus(value: any): SoftphoneStatus {
  const raw = cleanLower(value);

  if (
    raw === "online" ||
    raw === "available" ||
    raw === "ready" ||
    raw === "free" ||
    raw === "פנוי"
  ) {
    return "online";
  }

  if (raw === "offline" || raw === "disconnected" || raw === "מנותק") {
    return "offline";
  }

  if (
    raw === "dialing" ||
    raw === "initiated" ||
    raw === "calling" ||
    raw === "outbound_call" ||
    raw === "מחייג"
  ) {
    return "dialing";
  }

  if (
    raw === "in_call" ||
    raw === "incall" ||
    raw === "answered" ||
    raw === "bridged" ||
    raw === "active_call"
  ) {
    return "in_call";
  }

  if (raw === "ringing" || raw === "incoming" || raw === "שיחה נכנסת") {
    return "ringing";
  }

  if (raw === "busy" || raw === "after_call" || raw === "עסוק") {
    return "busy";
  }

  if (raw === "break" || raw === "pause" || raw === "הפסקה") {
    return "break";
  }

  if (
    raw === "not_available" ||
    raw === "unavailable" ||
    raw === "away" ||
    raw === "לא פנוי"
  ) {
    return "not_available";
  }

  return "unknown";
}

function normalizeStatus(employee: EmployeeShiftMonitor): SoftphoneStatus {
  const callStatus = normalizeRawStatus(
    employee.currentCall?.status || employee.currentCall?.callStatus,
  );

  const callActive =
    employee.currentCall?.active === true ||
    employee.currentCall?.isActive === true ||
    callStatus === "dialing" ||
    callStatus === "in_call" ||
    callStatus === "ringing";

  if (callActive) {
    if (callStatus === "dialing") return "dialing";
    if (callStatus === "ringing") return "ringing";
    return "in_call";
  }

  const availabilityStatus = normalizeRawStatus(
    employee.availability?.status ||
      employee.availability?.availabilityStatus ||
      employee.availabilityStatus ||
      employee.currentAvailabilityStatus,
  );

  if (
    availabilityStatus !== "unknown" &&
    availabilityStatus !== "online" &&
    availabilityStatus !== "offline"
  ) {
    return availabilityStatus;
  }

  const softphoneStatus = normalizeRawStatus(
    employee.softphone?.status ||
      employee.softphone?.softphoneStatus ||
      employee.softphone?.availabilityStatus ||
      employee.softphoneStatus ||
      employee.status,
  );

  if (softphoneStatus !== "unknown") return softphoneStatus;

  if (employee.isOnline === true || employee.online === true) return "online";
  if (employee.isActive === false || employee.active === false) return "offline";

  const lastSeen =
    employee.softphone?.lastSeenAt ||
    employee.softphone?.updatedAt ||
    employee.lastSeenAt ||
    employee.updatedAt;

  const lastSeenDate = safeDate(lastSeen);

  if (lastSeenDate) {
    const diffSeconds = Math.floor((Date.now() - lastSeenDate.getTime()) / 1000);
    return diffSeconds <= 180 ? "online" : "offline";
  }

  return "unknown";
}

function isSoftphoneConnected(employee: EmployeeShiftMonitor) {
  const status = normalizeStatus(employee);
  return status !== "offline" && status !== "unknown";
}

function isBlockedRole(employee: EmployeeShiftMonitor) {
  const role = cleanLower(employee.role);
  const staffType = cleanLower(employee.staffType);
  const type = cleanLower(employee.type);
  const userType = cleanLower(employee.userType);

  const blocked = [
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

  if (blocked.includes(role)) return true;
  if (blocked.includes(type)) return true;
  if (blocked.includes(userType)) return true;

  if (employee.isProducer === true || employee.producer === true) return true;
  if (employee.isVenueOwner === true || employee.venueOwner === true) return true;

  if (staffType === "producer" || staffType === "venue_owner") return true;

  return false;
}

function isSystemEmployee(employee: EmployeeShiftMonitor) {
  if (!employee) return false;
  if (isBlockedRole(employee)) return false;

  const role = cleanLower(employee.role);
  const staffType = cleanLower(employee.staffType);
  const type = cleanLower(employee.type);

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
  if (allowedRoles.includes(type)) return true;
  if (allowedStaffTypes.includes(staffType)) return true;

  if (employee.isEmployee === true) return true;
  if (employee.employee === true) return true;
  if (employee.isStaff === true) return true;
  if (employee.staff === true) return true;

  return false;
}

function getStatusMeta(status: SoftphoneStatus) {
  if (status === "dialing") {
    return {
      label: "מחייג",
      dot: "bg-sky-500",
      row: "border-sky-100 bg-sky-50/35",
      badge: "bg-sky-50 text-sky-700 ring-sky-100",
    };
  }

  if (status === "in_call") {
    return {
      label: "בשיחה",
      dot: "bg-emerald-500",
      row: "border-emerald-100 bg-emerald-50/40",
      badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    };
  }

  if (status === "ringing") {
    return {
      label: "שיחה נכנסת",
      dot: "bg-violet-500",
      row: "border-violet-100 bg-violet-50/35",
      badge: "bg-violet-50 text-violet-700 ring-violet-100",
    };
  }

  if (status === "online") {
    return {
      label: "מחובר",
      dot: "bg-emerald-500",
      row: "border-emerald-100 bg-white",
      badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    };
  }

  if (status === "busy") {
    return {
      label: "עסוק",
      dot: "bg-amber-500",
      row: "border-amber-100 bg-amber-50/30",
      badge: "bg-amber-50 text-amber-700 ring-amber-100",
    };
  }

  if (status === "break") {
    return {
      label: "הפסקה",
      dot: "bg-orange-500",
      row: "border-orange-100 bg-orange-50/30",
      badge: "bg-orange-50 text-orange-700 ring-orange-100",
    };
  }

  if (status === "not_available") {
    return {
      label: "לא פנוי",
      dot: "bg-rose-500",
      row: "border-rose-100 bg-rose-50/25",
      badge: "bg-rose-50 text-rose-700 ring-rose-100",
    };
  }

  if (status === "offline") {
    return {
      label: "מנותק",
      dot: "bg-slate-400",
      row: "border-slate-100 bg-white",
      badge: "bg-slate-100 text-slate-600 ring-slate-200",
    };
  }

  return {
    label: "לא ידוע",
    dot: "bg-slate-300",
    row: "border-slate-100 bg-white",
    badge: "bg-slate-100 text-slate-500 ring-slate-200",
  };
}

function getCallTarget(employee: EmployeeShiftMonitor) {
  const call = employee.currentCall;
  if (!call) return "";

  return (
    cleanString(call.customerName) ||
    cleanString(call.clientName) ||
    cleanString(call.guestName) ||
    cleanString(call.contactName) ||
    cleanString(call.leadName) ||
    cleanString(call.customerPhone) ||
    cleanString(call.clientPhone) ||
    cleanString(call.guestPhone) ||
    cleanString(call.phone) ||
    cleanString(call.to) ||
    cleanString(call.from)
  );
}

function getCallPhone(employee: EmployeeShiftMonitor) {
  const call = employee.currentCall;
  if (!call) return "";

  const direction = cleanLower(call.direction);

  if (direction === "inbound" || direction === "incoming") {
    return (
      cleanString(call.from) ||
      cleanString(call.caller) ||
      cleanString(call.callerNumber) ||
      cleanString(call.customerPhone) ||
      cleanString(call.clientPhone) ||
      cleanString(call.guestPhone) ||
      cleanString(call.phone)
    );
  }

  if (direction === "outbound" || direction === "outgoing") {
    return (
      cleanString(call.to) ||
      cleanString(call.toNumber) ||
      cleanString(call.customerPhone) ||
      cleanString(call.clientPhone) ||
      cleanString(call.guestPhone) ||
      cleanString(call.phone)
    );
  }

  return (
    cleanString(call.customerPhone) ||
    cleanString(call.clientPhone) ||
    cleanString(call.guestPhone) ||
    cleanString(call.phone) ||
    cleanString(call.to) ||
    cleanString(call.from)
  );
}

function getCallControlId(employee: EmployeeShiftMonitor) {
  const call = employee.currentCall;

  return (
    cleanString(call?.callControlId) ||
    cleanString(call?.call_control_id) ||
    cleanString(call?.callLegId) ||
    cleanString(call?.call_leg_id)
  );
}

function getCurrentCallDuration(employee: EmployeeShiftMonitor, tick: number) {
  const call = employee.currentCall;
  void tick;

  if (
    !call?.active &&
    !call?.isActive &&
    !call?.startedAt &&
    !call?.answeredAt &&
    !call?.connectedAt
  ) {
    return 0;
  }

  if (typeof call?.durationSeconds === "number" && call.durationSeconds > 0) {
    return call.durationSeconds;
  }

  if (typeof call?.duration === "number" && call.duration > 0) {
    return call.duration;
  }

  const start =
    call?.answeredAt ||
    call?.connectedAt ||
    call?.startedAt ||
    call?.startTime ||
    call?.createdAt;

  return secondsBetween(start);
}

function getAvailabilityDuration(employee: EmployeeShiftMonitor, tick: number) {
  void tick;

  if (typeof employee.availability?.durationSeconds === "number") {
    return employee.availability.durationSeconds;
  }

  const since =
    employee.availability?.since ||
    employee.availability?.startedAt ||
    employee.availability?.statusSince ||
    employee.availabilitySince ||
    employee.notAvailableSince ||
    employee.statusStartedAt ||
    employee.since ||
    employee.softphone?.updatedAt ||
    employee.updatedAt ||
    employee.lastSeenAt;

  return secondsBetween(since);
}

function getShiftSeconds(employee: EmployeeShiftMonitor, tick: number) {
  void tick;
  const start = getShiftStart(employee);
  if (!start) return 0;

  return secondsBetween(start);
}

function getShiftLocationLabel(value?: string) {
  const clean = cleanLower(value);

  if (clean === "home") return "בית";
  if (clean === "venue") return "אולם";
  if (clean === "office") return "משרד";

  return cleanString(value) || "—";
}

function getDirectionLabel(value?: string) {
  const clean = cleanLower(value);

  if (clean === "inbound" || clean === "incoming") return "נכנסת";
  if (clean === "outbound" || clean === "outgoing") return "יוצאת";

  return "—";
}

function getShiftTitle(employee: EmployeeShiftMonitor) {
  const shift = employee.shift;

  if (isSoftphoneConnected(employee) && !shift) {
    return "מחובר ללא שיבוץ";
  }

  if (!shift) return "לא משובץ היום";

  return (
    cleanString(shift.title) ||
    cleanString(shift.name) ||
    (isShiftActiveNow(employee) ? "משמרת פעילה" : "שיבוץ היום")
  );
}

function getShiftLocation(employee: EmployeeShiftMonitor) {
  const shift = employee.shift;
  if (!shift) return "—";

  const location =
    cleanString(shift.location) ||
    cleanString(shift.locationType) ||
    cleanString(shift.workLocation);

  const venue =
    cleanString(shift.venueName) ||
    cleanString(shift.hallName) ||
    cleanString(shift.placeName);

  const event =
    cleanString(shift.eventName) ||
    cleanString(shift.eventTitle) ||
    cleanString(shift.invitationTitle);

  const parts = [getShiftLocationLabel(location), venue, event].filter(
    (item) => item && item !== "—",
  );

  return parts.length ? parts.join(" · ") : "—";
}

function getCurrentAction(employee: EmployeeShiftMonitor, status: SoftphoneStatus) {
  const call = employee.currentCall;

  if (status === "dialing") {
    const phone = getCallPhone(employee);
    const target = getCallTarget(employee);

    return {
      title: `מחייג אל ${target || phone || "מספר לא ידוע"}`,
      sub: phone ? `שיחה יוצאת · ${phone}` : "שיחה יוצאת",
    };
  }

  if (status === "ringing") {
    const phone = getCallPhone(employee);
    const target = getCallTarget(employee);

    return {
      title: `שיחה נכנסת ${target || phone ? `מ־${target || phone}` : ""}`,
      sub: phone ? `שיחה נכנסת · ${phone}` : "שיחה נכנסת",
    };
  }

  if (status === "in_call") {
    const phone = getCallPhone(employee);
    const target = getCallTarget(employee);
    const direction = getDirectionLabel(call?.direction);

    return {
      title: `בשיחה עם ${target || phone || "לקוח"}`,
      sub:
        [
          direction !== "—" ? `שיחה ${direction}` : "",
          phone,
          call?.eventName ||
            call?.eventTitle ||
            call?.invitationTitle ||
            call?.invitationName ||
            "",
        ]
          .filter(Boolean)
          .join(" · ") || "שיחה פעילה",
    };
  }

  if (status === "busy" || status === "break" || status === "not_available") {
    return {
      title:
        employee.availability?.reason ||
        employee.availability?.note ||
        employee.availability?.statusReason ||
        employee.availabilityReason ||
        employee.notAvailableReason ||
        (status === "break" ? "בהפסקה" : "לא פנוי"),
      sub: employee.work?.currentTaskTitle || "העובד לא זמין לשיחות כרגע",
    };
  }

  if (status === "online") {
    return {
      title: "מחובר ופנוי",
      sub:
        employee.work?.currentTaskTitle ||
        employee.work?.currentClientName ||
        employee.work?.currentEventName ||
        "אין שיחה פעילה כרגע",
    };
  }

  if (status === "offline") {
    return {
      title: "מנותק מהסופטפון",
      sub: "לא זמין לשיחות",
    };
  }

  return {
    title: "אין נתונים עדכניים",
    sub: "מחכה לסנכרון מהסופטפון",
  };
}

function isInDefaultShiftView(employee: EmployeeShiftMonitor) {
  return (
    isSoftphoneConnected(employee) ||
    isShiftActiveNow(employee) ||
    isScheduledToday(employee)
  );
}

function canEndEmployeeShift(employee: EmployeeShiftMonitor) {
  return isSoftphoneConnected(employee) || isShiftActiveNow(employee);
}

function getShiftBadge(employee: EmployeeShiftMonitor) {
  const connected = isSoftphoneConnected(employee);
  const active = isShiftActiveNow(employee);
  const scheduledToday = isScheduledToday(employee);

  if (connected && active) {
    return {
      label: "מחובר במשמרת",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    };
  }

  if (connected && scheduledToday) {
    return {
      label: "מחובר + משובץ",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    };
  }

  if (connected) {
    return {
      label: "מחובר ללא שיבוץ",
      className: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    };
  }

  if (active) {
    return {
      label: "משמרת פעילה",
      className: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    };
  }

  if (scheduledToday) {
    return {
      label: "משובץ היום",
      className: "bg-amber-50 text-amber-700 ring-amber-100",
    };
  }

  return {
    label: "לא משובץ",
    className: "bg-slate-100 text-slate-500 ring-slate-200",
  };
}

function getLastSeen(employee: EmployeeShiftMonitor) {
  return (
    employee.updatedAt ||
    employee.softphone?.lastSeenAt ||
    employee.softphone?.updatedAt ||
    employee.lastSeenAt ||
    null
  );
}

/* =====================================================
   PAGE
===================================================== */

export default function AdminShiftManagementPage() {
  const [employees, setEmployees] = useState<EmployeeShiftMonitor[]>([]);
  const [workOrders, setWorkOrders] = useState<CallWorkOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionEmployeeId, setActionEmployeeId] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<ShiftManagementFilter>("default");
  const [tick, setTick] = useState(0);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [transferModal, setTransferModal] = useState<TransferModalState>({
    open: false,
    fromEmployeeId: "",
    fromEmployeeName: "",
    workOrderId: "",
    toEmployeeId: "",
    reason: "",
  });

  const fetchEmployees = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);

      const res = await fetch(`/api/admin/shift-management?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-store",
        },
      });

      const json = (await res.json().catch(() => ({}))) as ApiResponse;

      if (!res.ok || json.success === false) {
        throw new Error(json.error || "לא הצלחתי לטעון את ניהול המשמרת");
      }

      const list = json.employees || json.data || json.items || [];

      const onlySystemEmployees = Array.isArray(list)
        ? list.filter(isSystemEmployee)
        : [];

      setEmployees(onlySystemEmployees);
      setLastRefreshAt(new Date());
      setError("");
    } catch (err: any) {
      setError(err?.message || "שגיאה בטעינת ניהול המשמרת");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  const fetchWorkOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/call-work-orders?limit=200&t=${Date.now()}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-store",
        },
      });

      const json = (await res.json().catch(() => ({}))) as WorkOrdersResponse;

      if (!res.ok || json.success === false) {
        throw new Error(json.error || "לא הצלחתי לטעון הוראות עבודה");
      }

      const list = json.workOrders || json.data || json.items || [];
      setWorkOrders(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.message || "שגיאה בטעינת הוראות עבודה");
    }
  }, []);

  useEffect(() => {
    void fetchEmployees(true);
    void fetchWorkOrders();
  }, [fetchEmployees, fetchWorkOrders]);

  // זה מה שנותן מספרים חיים 0:01, 0:02, 0:03 ובמקביל יש סנכרון API כל שנייה.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  // סנכרון נתונים כל שנייה בלי כפתור רענון.
  useEffect(() => {
    const timer = window.setInterval(() => {
      fetchEmployees(false);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [fetchEmployees]);

  async function endEmployeeShift(employee: EmployeeShiftMonitor) {
    const employeeId = getEmployeeId(employee);

    if (!employeeId || actionEmployeeId) return;

    const ok = window.confirm(`לסיים את המשמרת של ${getEmployeeName(employee)}?`);
    if (!ok) return;

    try {
      setActionEmployeeId(employeeId);

      const res = await fetch("/api/admin/shift-management/end-employee-shift", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({
          employeeId,
          employeeEmail: employee.email || "",
          shiftSessionId: employee.shiftSessionId || "",
          source: "admin-shift-management",
        }),
      });

      const json = (await res.json().catch(() => ({}))) as ActionResponse;

      if (!res.ok || json.success === false) {
        throw new Error(json.error || "לא הצלחתי לסיים את המשמרת של העובד");
      }

      await fetchEmployees(false);
    } catch (err: any) {
      alert(err?.message || "שגיאה בסיום משמרת");
    } finally {
      setActionEmployeeId("");
    }
  }

  async function hangupEmployeeCall(employee: EmployeeShiftMonitor) {
    const employeeId = getEmployeeId(employee);
    const callControlId = getCallControlId(employee);

    if (!employeeId || !callControlId || actionEmployeeId) return;

    const ok = window.confirm(`לנתק את השיחה של ${getEmployeeName(employee)}?`);
    if (!ok) return;

    try {
      setActionEmployeeId(employeeId);

      const res = await fetch("/api/admin/shift-management/hangup-call", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({
          employeeId,
          employeeEmail: employee.email || "",
          callControlId,
          source: "admin-shift-management",
        }),
      });

      const json = (await res.json().catch(() => ({}))) as ActionResponse;

      if (!res.ok || json.success === false) {
        throw new Error(json.error || "לא הצלחתי לנתק את השיחה");
      }

      await fetchEmployees(false);
    } catch (err: any) {
      alert(err?.message || "שגיאה בניתוק שיחה");
    } finally {
      setActionEmployeeId("");
    }
  }

  function getWorkOrdersForEmployee(employeeId: string) {
    if (!employeeId) return [];

    return workOrders.filter((order) => {
      const assigned = Array.isArray(order.assignedEmployeeIds)
        ? order.assignedEmployeeIds.map((id) => String(id))
        : [];

      return assigned.includes(employeeId);
    });
  }

  function getWorkOrderId(order: CallWorkOrderSummary) {
    return String(order.id || order._id || "");
  }

  function getWorkOrderLabel(order: CallWorkOrderSummary) {
    const title =
      cleanString(order.title) ||
      cleanString(order.eventName) ||
      cleanString(order.clientName) ||
      cleanString(order.clientEmail) ||
      "הוראת עבודה";

    const round = Number(order.round || 0);
    const roundText = round ? `סבב ${round}` : "סבב לא ידוע";
    const total = Number(order.totalTasks || 0);
    const completed = Number(order.completedTasks || 0);

    return `${title} · ${roundText} · ${completed}/${total}`;
  }

  function openTransferModal(employee: EmployeeShiftMonitor) {
    const fromEmployeeId = getEmployeeId(employee);
    const employeeOrders = getWorkOrdersForEmployee(fromEmployeeId);

    if (!fromEmployeeId) return;

    if (!employeeOrders.length) {
      alert("לא נמצאו הוראות עבודה שמשויכות לעובד הזה");
      return;
    }

    setTransferModal({
      open: true,
      fromEmployeeId,
      fromEmployeeName: getEmployeeName(employee),
      workOrderId: getWorkOrderId(employeeOrders[0]),
      toEmployeeId: "",
      reason: "",
    });
  }

  function closeTransferModal() {
    if (transferLoading) return;

    setTransferModal({
      open: false,
      fromEmployeeId: "",
      fromEmployeeName: "",
      workOrderId: "",
      toEmployeeId: "",
      reason: "",
    });
  }

  async function transferWorkOrder() {
    if (transferLoading) return;

    const workOrderId = cleanString(transferModal.workOrderId);
    const fromEmployeeId = cleanString(transferModal.fromEmployeeId);
    const toEmployeeId = cleanString(transferModal.toEmployeeId);

    if (!workOrderId) {
      alert("חובה לבחור הוראת עבודה");
      return;
    }

    if (!fromEmployeeId) {
      alert("חסר עובד שמעבירים ממנו");
      return;
    }

    if (!toEmployeeId) {
      alert("חובה לבחור עובד שאליו מעבירים");
      return;
    }

    if (fromEmployeeId === toEmployeeId) {
      alert("אי אפשר להעביר לאותו עובד");
      return;
    }

    const toEmployee = employees.find((employee) => getEmployeeId(employee) === toEmployeeId);
    const toEmployeeName = toEmployee ? getEmployeeName(toEmployee) : "העובד החדש";

    const ok = window.confirm(
      `להעביר את הוראת העבודה מ${transferModal.fromEmployeeName} אל ${toEmployeeName}?`,
    );

    if (!ok) return;

    try {
      setTransferLoading(true);

      const res = await fetch(`/api/admin/call-work-orders/${workOrderId}/transfer`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({
          fromEmployeeId,
          toEmployeeId,
          reason: transferModal.reason,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as ActionResponse;

      if (!res.ok || json.success === false) {
        throw new Error(json.error || "לא הצלחתי להעביר את הוראת העבודה");
      }

      await fetchWorkOrders();
      await fetchEmployees(false);
      closeTransferModal();
      alert("הוראת העבודה הועברה בהצלחה");
    } catch (err: any) {
      alert(err?.message || "שגיאה בהעברת הוראת עבודה");
    } finally {
      setTransferLoading(false);
    }
  }

  const stats = useMemo(() => {
    let connected = 0;
    let scheduledToday = 0;
    let activeShift = 0;
    let dialing = 0;
    let inCall = 0;
    let notAvailable = 0;
    let offline = 0;

    for (const employee of employees) {
      const status = normalizeStatus(employee);

      if (isSoftphoneConnected(employee)) connected += 1;
      if (isScheduledToday(employee)) scheduledToday += 1;
      if (isShiftActiveNow(employee)) activeShift += 1;
      if (status === "dialing") dialing += 1;
      if (status === "in_call" || status === "ringing") inCall += 1;

      if (status === "busy" || status === "break" || status === "not_available") {
        notAvailable += 1;
      }

      if (status === "offline" || status === "unknown") offline += 1;
    }

    return {
      total: employees.length,
      connected,
      scheduledToday,
      activeShift,
      dialing,
      inCall,
      notAvailable,
      offline,
    };
  }, [employees, tick]);

  const filteredEmployees = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return employees.filter((employee) => {
      const status = normalizeStatus(employee);
      const name = getEmployeeName(employee).toLowerCase();

      const searchable = [
        name,
        employee.email,
        getEmployeePhone(employee),
        employee.role,
        employee.staffType,
        employee.softphone?.extension,
        employee.softphone?.sipExtension,
        employee.softphone?.sipUsername,
        employee.softphone?.sip_user,
        employee.currentCall?.customerName,
        employee.currentCall?.customerPhone,
        employee.currentCall?.clientName,
        employee.currentCall?.clientPhone,
        employee.currentCall?.guestName,
        employee.currentCall?.guestPhone,
        employee.currentCall?.eventName,
        employee.currentCall?.eventTitle,
        employee.currentCall?.invitationTitle,
        employee.currentCall?.invitationName,
        employee.availability?.reason,
        employee.availability?.note,
        employee.availabilityReason,
        employee.notAvailableReason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchQuery = !cleanQuery || searchable.includes(cleanQuery);

      const matchStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "default"
            ? isInDefaultShiftView(employee)
            : statusFilter === "connected"
              ? isSoftphoneConnected(employee)
              : statusFilter === "scheduled_today"
                ? isScheduledToday(employee)
                : status === statusFilter;

      return matchQuery && matchStatus;
    });
  }, [employees, query, statusFilter, tick]);

  return (
    <div className="space-y-5 text-slate-950" dir="rtl">
      <section className="overflow-hidden rounded-[30px] border border-[#E9ECF5] bg-gradient-to-l from-white via-[#F8FBFF] to-[#F3F0FF] p-5 shadow-xl shadow-slate-100/80">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100 shadow-sm">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
              LIVE · מונה זמן כל שנייה · סנכרון כל שנייה
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              ניהול משמרת
            </h1>

            <p className="mt-2 max-w-4xl text-sm font-bold leading-6 text-slate-500">
              עובד שמחובר לסופטפון נחשב במשמרת בפועל וניתן להוציא אותו. בנוסף מוצגים עובדים שמשובצים היום גם אם עוד לא התחברו.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <HeroMetric label="מחוברים" value={stats.connected} />
            <HeroMetric label="בשיחה" value={stats.inCall} />
            <HeroMetric label="מחייגים" value={stats.dialing} />
            <HeroMetric label="משובצים היום" value={stats.scheduledToday} />
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-[#E9ECF5] bg-white/95 p-4 shadow-lg shadow-slate-100/70">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
              עודכן: {lastRefreshAt ? formatDateTime(lastRefreshAt) : "—"}
            </span>
            <span className="rounded-full bg-slate-50 px-3 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-100">
              סנכרון כל שנייה
            </span>
            <span className="rounded-full bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">
              השעונים רצים כל שנייה
            </span>
          </div>

          <div className="relative w-full xl:max-w-md">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש עובד / מספר / לקוח / אירוע..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-11 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-200 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            />

            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              🔎
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatCard label="מחוברים" value={stats.connected} hint="נחשב במשמרת" />
        <StatCard label="משובצים היום" value={stats.scheduledToday} hint="גם אם לא התחברו" />
        <StatCard label="משמרת פעילה" value={stats.activeShift} hint="shift פעיל" />
        <StatCard label="מחייגים" value={stats.dialing} hint="שיחה יוצאת" />
        <StatCard label="בשיחה" value={stats.inCall} hint="פעילות עכשיו" />
        <StatCard label="לא פנויים" value={stats.notAvailable} hint="עסוק / הפסקה" />
        <StatCard label="מנותקים" value={stats.offline} hint="לא זמינים" />
        <StatCard label="סה״כ" value={stats.total} hint="עובדי מערכת" />
      </section>

      <section className="rounded-[26px] border border-[#E9ECF5] bg-white/95 p-4 shadow-lg shadow-slate-100/70">
        <div className="flex flex-wrap gap-2">
          <FilterButton active={statusFilter === "default"} onClick={() => setStatusFilter("default")}>ברירת מחדל</FilterButton>
          <FilterButton active={statusFilter === "connected"} onClick={() => setStatusFilter("connected")}>מחוברים</FilterButton>
          <FilterButton active={statusFilter === "scheduled_today"} onClick={() => setStatusFilter("scheduled_today")}>משובצים היום</FilterButton>
          <FilterButton active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>הכל</FilterButton>
          <FilterButton active={statusFilter === "online"} onClick={() => setStatusFilter("online")}>פנויים</FilterButton>
          <FilterButton active={statusFilter === "dialing"} onClick={() => setStatusFilter("dialing")}>מחייגים</FilterButton>
          <FilterButton active={statusFilter === "in_call"} onClick={() => setStatusFilter("in_call")}>בשיחה</FilterButton>
          <FilterButton active={statusFilter === "ringing"} onClick={() => setStatusFilter("ringing")}>נכנסת</FilterButton>
          <FilterButton active={statusFilter === "not_available"} onClick={() => setStatusFilter("not_available")}>לא פנויים</FilterButton>
          <FilterButton active={statusFilter === "break"} onClick={() => setStatusFilter("break")}>הפסקה</FilterButton>
          <FilterButton active={statusFilter === "offline"} onClick={() => setStatusFilter("offline")}>מנותקים</FilterButton>
        </div>
      </section>

      {error && (
        <section className="rounded-[22px] border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </section>
      )}

      <section className="overflow-hidden rounded-[30px] border border-[#E9ECF5] bg-white shadow-xl shadow-slate-100/80">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] border-collapse text-right">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/90 text-xs font-black text-slate-500">
                <th className="px-5 py-4">עובד</th>
                <th className="px-5 py-4">חיבור</th>
                <th className="px-5 py-4">מה קורה עכשיו</th>
                <th className="px-5 py-4">מספר פעיל</th>
                <th className="px-5 py-4">זמן מצב</th>
                <th className="px-5 py-4">שיבוץ / משמרת</th>
                <th className="px-5 py-4">זמן משמרת</th>
                <th className="px-5 py-4">שיחות היום</th>
                <th className="px-5 py-4">עדכון אחרון</th>
                <th className="px-5 py-4">פעולות</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <LoadingRows />
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-14 text-center">
                    <div className="mx-auto max-w-md">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-2xl ring-1 ring-slate-100">
                        🎧
                      </div>
                      <p className="mt-4 text-lg font-black text-slate-900">אין עובדים להצגה</p>
                      <p className="mt-2 text-sm font-bold text-slate-500">
                        ברירת המחדל מציגה מחוברים, משמרת פעילה ומשובצים היום.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <LiveSoftphoneRow
                    key={getEmployeeId(employee)}
                    employee={employee}
                    tick={tick}
                    busy={
                      actionEmployeeId === getEmployeeId(employee) ||
                      transferLoading
                    }
                    canTransferWorkOrder={
                      getWorkOrdersForEmployee(getEmployeeId(employee)).length > 0
                    }
                    onEndShift={() => endEmployeeShift(employee)}
                    onHangup={() => hangupEmployeeCall(employee)}
                    onTransferWorkOrder={() => openTransferModal(employee)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <TransferWorkOrderModal
        open={transferModal.open}
        loading={transferLoading}
        fromEmployeeName={transferModal.fromEmployeeName}
        workOrderId={transferModal.workOrderId}
        toEmployeeId={transferModal.toEmployeeId}
        reason={transferModal.reason}
        workOrders={getWorkOrdersForEmployee(transferModal.fromEmployeeId)}
        employees={employees.filter(
          (employee) => getEmployeeId(employee) !== transferModal.fromEmployeeId,
        )}
        getWorkOrderId={getWorkOrderId}
        getWorkOrderLabel={getWorkOrderLabel}
        onClose={closeTransferModal}
        onChange={(next) =>
          setTransferModal((prev) => ({
            ...prev,
            ...next,
          }))
        }
        onSubmit={transferWorkOrder}
      />
    </div>
  );
}

/* =====================================================
   ROW COMPONENT
===================================================== */

function LiveSoftphoneRow({
  employee,
  tick,
  busy,
  canTransferWorkOrder,
  onEndShift,
  onHangup,
  onTransferWorkOrder,
}: {
  employee: EmployeeShiftMonitor;
  tick: number;
  busy: boolean;
  canTransferWorkOrder: boolean;
  onEndShift: () => void;
  onHangup: () => void;
  onTransferWorkOrder: () => void;
}) {
  const status = normalizeStatus(employee);
  const meta = getStatusMeta(status);
  const name = getEmployeeName(employee);
  const image = getEmployeeImage(employee);
  const shiftActive = isShiftActiveNow(employee);
  const connected = isSoftphoneConnected(employee);
  const scheduledToday = isScheduledToday(employee);
  const action = getCurrentAction(employee, status);
  const shiftBadge = getShiftBadge(employee);

  const isCall = status === "dialing" || status === "ringing" || status === "in_call";
  const duration = isCall
    ? getCurrentCallDuration(employee, tick)
    : getAvailabilityDuration(employee, tick);

  const callControlId = getCallControlId(employee);
  const canHangup = Boolean(callControlId) && isCall;
  const canEndShift = canEndEmployeeShift(employee);

  const shiftStart = getShiftStart(employee);
  const shiftEnd = getShiftEnd(employee);

  return (
    <tr className={`group border-b transition last:border-b-0 hover:bg-indigo-50/25 ${meta.row}`}>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {image ? (
              <img
                src={image}
                alt={name}
                className="h-12 w-12 rounded-2xl object-cover ring-1 ring-slate-100"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-black text-white shadow-lg shadow-indigo-100">
                {getInitials(name)}
              </div>
            )}

            <span
              className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                connected ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950">{name}</p>
            <p className="mt-1 truncate text-xs font-bold text-slate-400">
              {employee.email || getEmployeePhone(employee) || "—"}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="flex flex-col gap-2">
          <StatusBadge status={status} />
          <span className={`w-fit rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${shiftBadge.className}`}>
            {shiftBadge.label}
          </span>
        </div>
      </td>

      <td className="px-5 py-4">
        <p className="max-w-[280px] truncate text-sm font-black text-slate-900">
          {action.title}
        </p>
        <p className="mt-1 max-w-[280px] truncate text-xs font-bold text-slate-500">
          {action.sub}
        </p>
      </td>

      <td className="px-5 py-4">
        <p dir="ltr" className="text-left font-mono text-sm font-black text-slate-900">
          {isCall ? getCallPhone(employee) || "—" : "—"}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-400">
          {isCall ? getDirectionLabel(employee.currentCall?.direction) : "אין שיחה"}
        </p>
      </td>

      <td className="px-5 py-4">
        <span dir="ltr" className="inline-flex rounded-2xl bg-slate-950 px-3 py-2 font-mono text-sm font-black text-white shadow-lg shadow-slate-200">
          {formatDuration(duration)}
        </span>
      </td>

      <td className="px-5 py-4">
        <p className={`text-sm font-black ${connected || shiftActive ? "text-emerald-700" : scheduledToday ? "text-amber-700" : "text-slate-700"}`}>
          {getShiftTitle(employee)}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-400">
          {shiftStart || shiftEnd
            ? `${formatTime(shiftStart)} - ${formatTime(shiftEnd)}`
            : getShiftLocation(employee)}
        </p>
      </td>

      <td className="px-5 py-4">
        <span dir="ltr" className="font-mono text-sm font-black text-slate-900">
          {shiftActive ? formatDuration(getShiftSeconds(employee, tick)) : connected ? formatDuration(duration) : "—"}
        </span>
      </td>

      <td className="px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <MiniMetric label="שיחות" value={employee.work?.callsToday || 0} />
          <MiniMetric label="נענו" value={employee.work?.answeredToday || 0} />
          <MiniMetric label="בוצע" value={employee.work?.completedToday || 0} />
        </div>
      </td>

      <td className="px-5 py-4">
        <p className="text-xs font-bold text-slate-500">
          {formatDateTime(getLastSeen(employee))}
        </p>
      </td>

      <td className="px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onHangup}
            disabled={!canHangup || busy}
            className="h-9 rounded-2xl border border-rose-100 bg-rose-50 px-3 text-xs font-black text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            נתק שיחה
          </button>

          <button
            type="button"
            onClick={onEndShift}
            disabled={!canEndShift || busy}
            className={`h-9 rounded-2xl border px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
              canEndShift
                ? "border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                : "border-slate-200 bg-white text-slate-400"
            }`}
          >
            סיים משמרת
          </button>

          <button
            type="button"
            onClick={onTransferWorkOrder}
            disabled={!canTransferWorkOrder || busy}
            className={`h-9 rounded-2xl border px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
              canTransferWorkOrder
                ? "border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100"
                : "border-slate-200 bg-white text-slate-400"
            }`}
          >
            העבר הוראה
          </button>
        </div>
      </td>
    </tr>
  );
}

/* =====================================================
   TRANSFER MODAL
===================================================== */

function TransferWorkOrderModal({
  open,
  loading,
  fromEmployeeName,
  workOrderId,
  toEmployeeId,
  reason,
  workOrders,
  employees,
  getWorkOrderId,
  getWorkOrderLabel,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  fromEmployeeName: string;
  workOrderId: string;
  toEmployeeId: string;
  reason: string;
  workOrders: CallWorkOrderSummary[];
  employees: EmployeeShiftMonitor[];
  getWorkOrderId: (order: CallWorkOrderSummary) => string;
  getWorkOrderLabel: (order: CallWorkOrderSummary) => string;
  onClose: () => void;
  onChange: (next: Partial<TransferModalState>) => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-2xl rounded-[30px] border border-white bg-white p-5 shadow-2xl shadow-slate-950/20">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="inline-flex rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700 ring-1 ring-violet-100">
              אדמין בלבד
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-950">
              העברת הוראת עבודה
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              מעביר משימות פתוחות מהעובד:{" "}
              <span className="font-black text-slate-900">{fromEmployeeName}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-lg font-black text-slate-500 ring-1 ring-slate-100 transition hover:bg-slate-100 disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-black text-slate-500">
              הוראת עבודה להעברה
            </span>

            <select
              value={workOrderId}
              onChange={(event) => onChange({ workOrderId: event.target.value })}
              disabled={loading}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-violet-200 focus:bg-white focus:ring-4 focus:ring-violet-50 disabled:opacity-50"
            >
              {workOrders.map((order) => {
                const id = getWorkOrderId(order);

                return (
                  <option key={id} value={id}>
                    {getWorkOrderLabel(order)}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-black text-slate-500">
              להעביר לעובד
            </span>

            <select
              value={toEmployeeId}
              onChange={(event) => onChange({ toEmployeeId: event.target.value })}
              disabled={loading}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-violet-200 focus:bg-white focus:ring-4 focus:ring-violet-50 disabled:opacity-50"
            >
              <option value="">בחירת עובד</option>
              {employees.map((employee) => {
                const id = getEmployeeId(employee);

                return (
                  <option key={id} value={id}>
                    {getEmployeeName(employee)} — {employee.email || getEmployeePhone(employee) || ""}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-black text-slate-500">
              סיבת העברה
            </span>

            <textarea
              value={reason}
              onChange={(event) => onChange({ reason: event.target.value })}
              disabled={loading}
              rows={3}
              placeholder="לדוגמה: עומס, עובד לא זמין, חלוקה מחדש..."
              className="resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-200 focus:bg-white focus:ring-4 focus:ring-violet-50 disabled:opacity-50"
            />
          </label>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs font-bold leading-6 text-amber-800">
            ההעברה משנה רק את העובד המטפל במשימות הפתוחות. ההוראות, האורחים,
            הסבב, הסטטוסים וההערות נשמרים.
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
          >
            ביטול
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || !workOrderId || !toEmployeeId}
            className="h-11 rounded-2xl bg-gradient-to-l from-indigo-500 to-violet-500 px-6 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "מעביר..." : "אישור העברה"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   SMALL COMPONENTS
===================================================== */

function StatusBadge({ status }: { status: SoftphoneStatus }) {
  const meta = getStatusMeta(status);

  return (
    <span className={`inline-flex w-fit items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black ring-1 ${meta.badge}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function HeroMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[115px] rounded-[24px] border border-white/80 bg-white/80 p-4 shadow-lg shadow-slate-100/70 backdrop-blur">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#E9ECF5] bg-white p-4 shadow-lg shadow-slate-100/70 transition hover:-translate-y-0.5 hover:shadow-xl">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-400">{hint}</p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        h-10 rounded-2xl px-4 text-xs font-black transition
        ${
          active
            ? "bg-gradient-to-l from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-100"
            : "bg-slate-50 text-slate-500 ring-1 ring-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:ring-indigo-100"
        }
      `}
    >
      {children}
    </button>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center justify-center gap-1 rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-100">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-900">{value}</span>
    </span>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="border-b border-slate-100">
          <td colSpan={10} className="px-5 py-4">
            <div className="h-16 animate-pulse rounded-2xl bg-slate-50" />
          </td>
        </tr>
      ))}
    </>
  );
}
