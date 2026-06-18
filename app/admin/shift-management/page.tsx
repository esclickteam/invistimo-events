"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  | "connected"
  | "scheduled_today"
  | "all"
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

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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
  if (employee.isActive === false || employee.active === false)
    return "offline";

  const lastSeen =
    employee.softphone?.lastSeenAt ||
    employee.softphone?.updatedAt ||
    employee.lastSeenAt ||
    employee.updatedAt;

  const lastSeenDate = safeDate(lastSeen);

  if (lastSeenDate) {
    const diffSeconds = Math.floor(
      (Date.now() - lastSeenDate.getTime()) / 1000,
    );
    return diffSeconds <= 120 ? "online" : "offline";
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
  if (employee.isVenueOwner === true || employee.venueOwner === true)
    return true;

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
      accent: "bg-sky-500",
      glow: "shadow-sky-100",
    };
  }

  if (status === "in_call") {
    return {
      label: "בשיחה",
      dot: "bg-emerald-500",
      row: "border-emerald-100 bg-emerald-50/35",
      badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      accent: "bg-emerald-500",
      glow: "shadow-emerald-100",
    };
  }

  if (status === "ringing") {
    return {
      label: "שיחה נכנסת",
      dot: "bg-violet-500",
      row: "border-violet-100 bg-violet-50/35",
      badge: "bg-violet-50 text-violet-700 ring-violet-100",
      accent: "bg-violet-500",
      glow: "shadow-violet-100",
    };
  }

  if (status === "online") {
    return {
      label: "מחובר",
      dot: "bg-emerald-500",
      row: "border-slate-100 bg-white",
      badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      accent: "bg-emerald-500",
      glow: "shadow-slate-100",
    };
  }

  if (status === "busy") {
    return {
      label: "עסוק",
      dot: "bg-amber-500",
      row: "border-amber-100 bg-amber-50/30",
      badge: "bg-amber-50 text-amber-700 ring-amber-100",
      accent: "bg-amber-500",
      glow: "shadow-amber-100",
    };
  }

  if (status === "break") {
    return {
      label: "הפסקה",
      dot: "bg-orange-500",
      row: "border-orange-100 bg-orange-50/30",
      badge: "bg-orange-50 text-orange-700 ring-orange-100",
      accent: "bg-orange-500",
      glow: "shadow-orange-100",
    };
  }

  if (status === "not_available") {
    return {
      label: "לא פנוי",
      dot: "bg-rose-500",
      row: "border-rose-100 bg-rose-50/30",
      badge: "bg-rose-50 text-rose-700 ring-rose-100",
      accent: "bg-rose-500",
      glow: "shadow-rose-100",
    };
  }

  if (status === "offline") {
    return {
      label: "מנותק",
      dot: "bg-slate-400",
      row: "border-slate-100 bg-slate-50/70",
      badge: "bg-slate-100 text-slate-600 ring-slate-200",
      accent: "bg-slate-300",
      glow: "shadow-slate-100",
    };
  }

  return {
    label: "לא ידוע",
    dot: "bg-slate-300",
    row: "border-slate-100 bg-white",
    badge: "bg-slate-100 text-slate-500 ring-slate-200",
    accent: "bg-slate-300",
    glow: "shadow-slate-100",
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
    return call.durationSeconds + tick * 0;
  }

  if (typeof call?.duration === "number" && call.duration > 0) {
    return call.duration + tick * 0;
  }

  const start =
    call?.answeredAt ||
    call?.connectedAt ||
    call?.startedAt ||
    call?.startTime ||
    call?.createdAt;

  return secondsBetween(start) + tick * 0;
}

function getAvailabilityDuration(employee: EmployeeShiftMonitor, tick: number) {
  if (typeof employee.availability?.durationSeconds === "number") {
    return employee.availability.durationSeconds + tick * 0;
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
    employee.updatedAt;

  return secondsBetween(since) + tick * 0;
}

function getShiftSeconds(employee: EmployeeShiftMonitor, tick: number) {
  const start = getShiftStart(employee);
  if (!start) return 0;

  return secondsBetween(start) + tick * 0;
}

function getDirectionLabel(value?: string) {
  const clean = cleanLower(value);

  if (clean === "inbound" || clean === "incoming") return "נכנסת";
  if (clean === "outbound" || clean === "outgoing") return "יוצאת";

  return "—";
}

function getShiftTitle(employee: EmployeeShiftMonitor) {
  const shift = employee.shift;
  if (!shift) return "לא שובץ היום";

  return (
    cleanString(shift.title) ||
    cleanString(shift.name) ||
    (isShiftActiveNow(employee) ? "משמרת פעילה" : "משובץ היום")
  );
}

function getCurrentAction(
  employee: EmployeeShiftMonitor,
  status: SoftphoneStatus,
) {
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
      sub: isScheduledToday(employee)
        ? "משובץ היום אבל לא מחובר"
        : "לא זמין לשיחות",
    };
  }

  return {
    title: "אין נתונים עדכניים",
    sub: isScheduledToday(employee)
      ? "משובץ היום, מחכה לחיבור"
      : "מחכה לסנכרון מהסופטפון",
  };
}

function isInDefaultShiftView(employee: EmployeeShiftMonitor) {
  return (
    isSoftphoneConnected(employee) ||
    isShiftActiveNow(employee) ||
    isScheduledToday(employee)
  );
}

function getRowPriority(employee: EmployeeShiftMonitor) {
  const status = normalizeStatus(employee);

  if (status === "ringing") return 1;
  if (status === "in_call") return 2;
  if (status === "dialing") return 3;
  if (status === "online") return 4;
  if (status === "busy" || status === "not_available") return 5;
  if (status === "break") return 6;
  if (isScheduledToday(employee)) return 7;
  return 9;
}

/* =====================================================
   PAGE
===================================================== */

export default function AdminShiftManagementPage() {
  const [employees, setEmployees] = useState<EmployeeShiftMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [backgroundSyncing, setBackgroundSyncing] = useState(false);
  const [actionEmployeeId, setActionEmployeeId] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<ShiftManagementFilter>("default");
  const [tick, setTick] = useState(0);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const fetchingRef = useRef(false);

  const fetchEmployees = useCallback(async (initialLoad = false) => {
    if (fetchingRef.current) return;

    try {
      fetchingRef.current = true;

      if (initialLoad) {
        setLoading(true);
      } else {
        setBackgroundSyncing(true);
      }

      setError("");

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
    } catch (err: any) {
      setError(err?.message || "שגיאה בטעינת ניהול המשמרת");
    } finally {
      setLoading(false);
      setBackgroundSyncing(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchEmployees(true);
  }, [fetchEmployees]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      fetchEmployees(false);
    }, 2500);

    return () => window.clearInterval(timer);
  }, [fetchEmployees]);

  async function endEmployeeShift(employee: EmployeeShiftMonitor) {
    const employeeId = getEmployeeId(employee);

    if (!employeeId || actionEmployeeId) return;

    const ok = window.confirm(
      `להוציא את ${getEmployeeName(employee)} מהמשמרת?`,
    );
    if (!ok) return;

    try {
      setActionEmployeeId(employeeId);

      const res = await fetch(
        "/api/admin/shift-management/end-employee-shift",
        {
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
        },
      );

      const json = (await res.json().catch(() => ({}))) as ActionResponse;

      if (!res.ok || json.success === false) {
        throw new Error(json.error || "לא הצלחתי להוציא את העובד מהמשמרת");
      }

      await fetchEmployees(false);
    } catch (err: any) {
      alert(err?.message || "שגיאה בהוצאת העובד מהמשמרת");
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

  const stats = useMemo(() => {
    let visibleDefault = 0;
    let connected = 0;
    let scheduledToday = 0;
    let activeShift = 0;
    let dialing = 0;
    let liveCalls = 0;
    let notAvailable = 0;

    for (const employee of employees) {
      const status = normalizeStatus(employee);

      if (isInDefaultShiftView(employee)) visibleDefault += 1;
      if (isSoftphoneConnected(employee)) connected += 1;
      if (isScheduledToday(employee)) scheduledToday += 1;
      if (isShiftActiveNow(employee)) activeShift += 1;
      if (status === "dialing") dialing += 1;
      if (status === "in_call" || status === "ringing") liveCalls += 1;

      if (
        status === "busy" ||
        status === "break" ||
        status === "not_available"
      ) {
        notAvailable += 1;
      }
    }

    return {
      total: employees.length,
      visibleDefault,
      connected,
      scheduledToday,
      activeShift,
      dialing,
      liveCalls,
      notAvailable,
    };
  }, [employees, tick]);

  const filteredEmployees = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return employees
      .filter((employee) => {
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
      })
      .sort((a, b) => {
        const priorityDiff = getRowPriority(a) - getRowPriority(b);
        if (priorityDiff !== 0) return priorityDiff;

        return getEmployeeName(a).localeCompare(getEmployeeName(b), "he");
      });
  }, [employees, query, statusFilter, tick]);

  return (
    <div className="space-y-5" dir="rtl">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[34px] border border-white/80 bg-slate-950 p-5 text-white shadow-2xl shadow-indigo-200/50 md:p-6">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-8 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white ring-1 ring-white/15">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              LIVE · מתעדכן אוטומטית כל 2.5 שניות
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              ניהול משמרת
            </h1>

            <p className="mt-2 max-w-4xl text-sm font-bold leading-6 text-slate-300">
              ברירת המחדל מציגה עובד שמחובר לסופטפון, עובד במשמרת פעילה, או עובד
              שמשובץ היום. חיבור לסופטפון נחשב כמשמרת בפועל ואפשר להוציא אותו
              ממשמרת.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeroMini label="מוצגים עכשיו" value={stats.visibleDefault} />
            <HeroMini label="מחוברים" value={stats.connected} />
            <HeroMini label="בשיחה" value={stats.liveCalls} />
            <HeroMini label="משובצים היום" value={stats.scheduledToday} />
          </div>
        </div>
      </section>

      {/* STATUS BAR */}
      <section className="flex flex-col gap-3 rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-xl shadow-slate-100/80 backdrop-blur xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs font-black">
          <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-700 ring-1 ring-emerald-100">
            עדכון אחרון: {lastRefreshAt ? formatDateTime(lastRefreshAt) : "—"}
          </span>
          <span className="rounded-full bg-slate-50 px-3 py-2 text-slate-500 ring-1 ring-slate-100">
            {backgroundSyncing ? "מסנכרן ברקע..." : "סנכרון אוטומטי פעיל"}
          </span>
          <span className="rounded-full bg-indigo-50 px-3 py-2 text-indigo-700 ring-1 ring-indigo-100">
            ללא כפתור רענון ידני
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
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatCard
          label="מוצגים"
          value={stats.visibleDefault}
          hint="מחובר / משמרת / שיבוץ"
        />
        <StatCard label="מחוברים" value={stats.connected} hint="נחשב במשמרת" />
        <StatCard
          label="משמרת פעילה"
          value={stats.activeShift}
          hint="shift פעיל"
        />
        <StatCard
          label="משובצים היום"
          value={stats.scheduledToday}
          hint="גם אם לא התחברו"
        />
        <StatCard label="מחייגים" value={stats.dialing} hint="שיחה יוצאת" />
        <StatCard label="בשיחה" value={stats.liveCalls} hint="פעילות עכשיו" />
        <StatCard
          label="לא פנויים"
          value={stats.notAvailable}
          hint="עסוק / הפסקה"
        />
        <StatCard label="סה״כ" value={stats.total} hint="עובדי מערכת" />
      </section>

      {/* FILTERS */}
      <section className="rounded-[26px] border border-white/70 bg-white/90 p-4 shadow-lg shadow-slate-100/70 backdrop-blur">
        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={statusFilter === "default"}
            onClick={() => setStatusFilter("default")}
          >
            ברירת מחדל
          </FilterButton>
          <FilterButton
            active={statusFilter === "connected"}
            onClick={() => setStatusFilter("connected")}
          >
            מחוברים
          </FilterButton>
          <FilterButton
            active={statusFilter === "scheduled_today"}
            onClick={() => setStatusFilter("scheduled_today")}
          >
            משובצים היום
          </FilterButton>
          <FilterButton
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          >
            הכל
          </FilterButton>
          <FilterButton
            active={statusFilter === "online"}
            onClick={() => setStatusFilter("online")}
          >
            פנויים
          </FilterButton>
          <FilterButton
            active={statusFilter === "dialing"}
            onClick={() => setStatusFilter("dialing")}
          >
            מחייגים
          </FilterButton>
          <FilterButton
            active={statusFilter === "in_call"}
            onClick={() => setStatusFilter("in_call")}
          >
            בשיחה
          </FilterButton>
          <FilterButton
            active={statusFilter === "ringing"}
            onClick={() => setStatusFilter("ringing")}
          >
            נכנסת
          </FilterButton>
          <FilterButton
            active={statusFilter === "not_available"}
            onClick={() => setStatusFilter("not_available")}
          >
            לא פנויים
          </FilterButton>
          <FilterButton
            active={statusFilter === "break"}
            onClick={() => setStatusFilter("break")}
          >
            הפסקה
          </FilterButton>
          <FilterButton
            active={statusFilter === "offline"}
            onClick={() => setStatusFilter("offline")}
          >
            מנותקים
          </FilterButton>
        </div>
      </section>

      {error && (
        <section className="rounded-[22px] border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </section>
      )}

      {/* TABLE */}
      <section className="overflow-hidden rounded-[30px] border border-white/80 bg-white/95 shadow-xl shadow-slate-100/80 backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] border-collapse text-right">
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
                      <p className="mt-4 text-lg font-black text-slate-900">
                        אין עובדים להצגה
                      </p>
                      <p className="mt-2 text-sm font-bold text-slate-500">
                        ברירת המחדל מציגה מחוברים, עובדים במשמרת פעילה ומשובצים
                        היום.
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
                    busy={actionEmployeeId === getEmployeeId(employee)}
                    onEndShift={() => endEmployeeShift(employee)}
                    onHangup={() => hangupEmployeeCall(employee)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
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
  onEndShift,
  onHangup,
}: {
  employee: EmployeeShiftMonitor;
  tick: number;
  busy: boolean;
  onEndShift: () => void;
  onHangup: () => void;
}) {
  const status = normalizeStatus(employee);
  const meta = getStatusMeta(status);
  const name = getEmployeeName(employee);
  const image = getEmployeeImage(employee);
  const shiftActive = isShiftActiveNow(employee);
  const connected = isSoftphoneConnected(employee);
  const scheduledToday = isScheduledToday(employee);
  const action = getCurrentAction(employee, status);

  const isCall =
    status === "dialing" || status === "ringing" || status === "in_call";
  const duration = isCall
    ? getCurrentCallDuration(employee, tick)
    : getAvailabilityDuration(employee, tick);

  const callControlId = getCallControlId(employee);
  const canHangup = Boolean(callControlId) && isCall;

  const shiftStart = getShiftStart(employee);
  const shiftEnd = getShiftEnd(employee);

  return (
    <tr
      className={`border-b last:border-b-0 ${meta.row} transition-colors hover:bg-white`}
    >
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-600 text-sm font-black text-white shadow-lg shadow-indigo-100">
                {getInitials(name)}
              </div>
            )}
            <span
              className={`absolute -bottom-1 -left-1 h-4 w-4 rounded-full border-2 border-white ${connected ? "bg-emerald-500" : "bg-slate-300"}`}
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
        <div className="space-y-2">
          <StatusBadge status={status} />
          <div className="flex flex-wrap gap-1.5">
            {connected && <SmallPill tone="green">מחובר = במשמרת</SmallPill>}
            {shiftActive && <SmallPill tone="blue">משמרת פעילה</SmallPill>}
            {scheduledToday && !shiftActive && (
              <SmallPill tone="amber">משובץ היום</SmallPill>
            )}
          </div>
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
        <p
          dir="ltr"
          className="text-left font-mono text-sm font-black text-slate-900"
        >
          {isCall ? getCallPhone(employee) || "—" : "—"}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-400">
          {isCall
            ? getDirectionLabel(employee.currentCall?.direction)
            : "אין שיחה"}
        </p>
      </td>

      <td className="px-5 py-4">
        <span
          dir="ltr"
          className="inline-flex rounded-2xl bg-slate-950 px-3 py-2 font-mono text-sm font-black text-white shadow-lg shadow-slate-200"
        >
          {formatDuration(duration)}
        </span>
      </td>

      <td className="px-5 py-4">
        <p
          className={`text-sm font-black ${shiftActive || connected ? "text-emerald-700" : scheduledToday ? "text-amber-700" : "text-slate-700"}`}
        >
          {connected ? "במשמרת מחובר" : getShiftTitle(employee)}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-400">
          {shiftStart || shiftEnd
            ? `${formatTime(shiftStart)} - ${formatTime(shiftEnd)}`
            : scheduledToday
              ? "שיבוץ היום ללא שעות"
              : "—"}
        </p>
      </td>

      <td className="px-5 py-4">
        <span dir="ltr" className="font-mono text-sm font-black text-slate-900">
          {shiftActive
            ? formatDuration(getShiftSeconds(employee, tick))
            : connected
              ? formatDuration(getAvailabilityDuration(employee, tick))
              : "—"}
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
          {formatDateTime(
            employee.updatedAt ||
              employee.softphone?.lastSeenAt ||
              employee.softphone?.updatedAt ||
              employee.lastSeenAt,
          )}
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
            disabled={(!connected && !shiftActive) || busy}
            className="h-9 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            הוצא ממשמרת
          </button>
        </div>
      </td>
    </tr>
  );
}

/* =====================================================
   SMALL COMPONENTS
===================================================== */

function HeroMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur">
      <p className="text-xs font-black text-slate-300">{label}</p>
      <p className="mt-1 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: SoftphoneStatus }) {
  const meta = getStatusMeta(status);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black ring-1 ${meta.badge}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function SmallPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "blue" | "amber";
}) {
  const className =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tone === "blue"
        ? "bg-indigo-50 text-indigo-700 ring-indigo-100"
        : "bg-amber-50 text-amber-700 ring-amber-100";

  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-black ring-1 ${className}`}
    >
      {children}
    </span>
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
    <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-lg shadow-slate-100/70 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>
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
            ? "bg-gradient-to-l from-slate-950 to-indigo-700 text-white shadow-lg shadow-indigo-100"
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
      {Array.from({ length: 7 }).map((_, index) => (
        <tr key={index} className="border-b border-slate-100">
          <td colSpan={10} className="px-5 py-4">
            <div className="h-16 animate-pulse rounded-2xl bg-slate-50" />
          </td>
        </tr>
      ))}
    </>
  );
}
