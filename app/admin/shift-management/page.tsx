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

type ShiftManagementFilter = "in_shift" | "all" | SoftphoneStatus;

type ShiftLocation = "home" | "venue" | "office" | "unknown" | "";

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

    location?: ShiftLocation | string;
    locationType?: ShiftLocation | string;
    workLocation?: ShiftLocation | string;

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

type EndEmployeeShiftResponse = {
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

  if (parts.length === 1) {
    return parts[0].slice(0, 2);
  }

  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.slice(0, 2);
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

  if (!baseDate) {
    return directTimeDate;
  }

  const timeString = cleanString(timeValue);

  if (!timeString) {
    return baseDate;
  }

  const match = timeString.match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return directTimeDate || baseDate;
  }

  const date = new Date(baseDate);

  date.setHours(Number(match[1]), Number(match[2]), 0, 0);

  return date;
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

  if (softphoneStatus !== "unknown") {
    return softphoneStatus;
  }

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

    return diffSeconds <= 120 ? "online" : "offline";
  }

  return "unknown";
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
      badge: "bg-sky-50 text-sky-700 ring-sky-100",
      card: "border-sky-100 bg-sky-50/40",
      line: "from-sky-400 to-cyan-400",
    };
  }

  if (status === "in_call") {
    return {
      label: "בשיחה",
      dot: "bg-emerald-500",
      badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      card: "border-emerald-100 bg-emerald-50/40",
      line: "from-emerald-400 to-teal-400",
    };
  }

  if (status === "ringing") {
    return {
      label: "שיחה נכנסת",
      dot: "bg-violet-500",
      badge: "bg-violet-50 text-violet-700 ring-violet-100",
      card: "border-violet-100 bg-violet-50/40",
      line: "from-violet-400 to-purple-400",
    };
  }

  if (status === "online") {
    return {
      label: "פנוי",
      dot: "bg-indigo-500",
      badge: "bg-indigo-50 text-indigo-700 ring-indigo-100",
      card: "border-indigo-100 bg-white",
      line: "from-indigo-400 to-blue-400",
    };
  }

  if (status === "busy") {
    return {
      label: "עסוק",
      dot: "bg-amber-500",
      badge: "bg-amber-50 text-amber-700 ring-amber-100",
      card: "border-amber-100 bg-amber-50/40",
      line: "from-amber-400 to-orange-400",
    };
  }

  if (status === "break") {
    return {
      label: "בהפסקה",
      dot: "bg-orange-500",
      badge: "bg-orange-50 text-orange-700 ring-orange-100",
      card: "border-orange-100 bg-orange-50/40",
      line: "from-orange-400 to-amber-400",
    };
  }

  if (status === "not_available") {
    return {
      label: "לא פנוי",
      dot: "bg-rose-500",
      badge: "bg-rose-50 text-rose-700 ring-rose-100",
      card: "border-rose-100 bg-rose-50/40",
      line: "from-rose-400 to-red-400",
    };
  }

  if (status === "offline") {
    return {
      label: "מנותק",
      dot: "bg-slate-400",
      badge: "bg-slate-100 text-slate-600 ring-slate-200",
      card: "border-slate-100 bg-slate-50/70",
      line: "from-slate-300 to-slate-400",
    };
  }

  return {
    label: "לא ידוע",
    dot: "bg-slate-300",
    badge: "bg-slate-100 text-slate-500 ring-slate-200",
    card: "border-slate-100 bg-white",
    line: "from-slate-200 to-slate-300",
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
  const start = getShiftStart(employee) || safeDate(employee.shift?.startAt);

  if (!start) return 0;

  return secondsBetween(start) + tick * 0;
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

  if (!shift) return "לא במשמרת";

  return (
    cleanString(shift.title) ||
    cleanString(shift.name) ||
    (isShiftActiveNow(employee) ? "משמרת פעילה" : "משמרת היום")
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

function isLiveConnected(employee: EmployeeShiftMonitor) {
  const status = normalizeStatus(employee);
  const shiftActive = isShiftActiveNow(employee);

  return shiftActive && status !== "offline" && status !== "unknown";
}

function getCurrentAction(employee: EmployeeShiftMonitor, status: SoftphoneStatus) {
  const call = employee.currentCall;

  if (status === "dialing") {
    const target = getCallTarget(employee);
    const phone = getCallPhone(employee);

    return {
      title: `מחייג אל ${target || phone || "מספר לא ידוע"}`,
      sub: phone ? `שיחה יוצאת · ${phone}` : "שיחה יוצאת",
    };
  }

  if (status === "in_call" || status === "ringing") {
    const target = getCallTarget(employee);
    const direction = getDirectionLabel(call?.direction);

    return {
      title: status === "ringing" ? "שיחה נכנסת" : `בשיחה עם ${target || "לקוח"}`,
      sub:
        [
          direction !== "—" ? `שיחה ${direction}` : "",
          getCallPhone(employee),
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
      title: employee.work?.currentTaskTitle || "פנוי לקבלת שיחות",
      sub:
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

/* =====================================================
   PAGE
===================================================== */

export default function AdminShiftManagementPage() {
  const [employees, setEmployees] = useState<EmployeeShiftMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [endingEmployeeId, setEndingEmployeeId] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<ShiftManagementFilter>("in_shift");
  const [tick, setTick] = useState(0);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  const fetchEmployees = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
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
      setEmployees([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees(false);
  }, [fetchEmployees]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      fetchEmployees(true);
    }, 2000);

    return () => window.clearInterval(timer);
  }, [fetchEmployees]);

  async function endEmployeeShift(employee: EmployeeShiftMonitor) {
    const employeeId = getEmployeeId(employee);

    if (!employeeId || endingEmployeeId) return;

    const ok = window.confirm(
      `להוציא את ${getEmployeeName(employee)} מהמשמרת?`,
    );

    if (!ok) return;

    try {
      setEndingEmployeeId(employeeId);

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

      const json = (await res.json().catch(() => ({}))) as EndEmployeeShiftResponse;

      if (!res.ok || json.success === false) {
        throw new Error(json.error || "לא הצלחתי להוציא את העובד מהמשמרת");
      }

      await fetchEmployees(true);
    } catch (err: any) {
      alert(err?.message || "שגיאה בהוצאת העובד מהמשמרת");
    } finally {
      setEndingEmployeeId("");
    }
  }

  const stats = useMemo(() => {
    let inShift = 0;
    let live = 0;
    let online = 0;
    let dialing = 0;
    let inCall = 0;
    let notAvailable = 0;
    let offline = 0;

    for (const employee of employees) {
      const status = normalizeStatus(employee);
      const shiftActive = isShiftActiveNow(employee);

      if (shiftActive) inShift += 1;
      if (isLiveConnected(employee)) live += 1;

      if (status === "online") online += 1;
      if (status === "dialing") dialing += 1;
      if (status === "in_call" || status === "ringing") inCall += 1;

      if (status === "busy" || status === "break" || status === "not_available") {
        notAvailable += 1;
      }

      if (status === "offline" || status === "unknown") offline += 1;
    }

    return {
      total: employees.length,
      inShift,
      live,
      online,
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
      const shiftActive = isShiftActiveNow(employee);
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
        employee.shift?.eventName,
        employee.shift?.eventTitle,
        employee.shift?.invitationTitle,
        employee.shift?.venueName,
        employee.shift?.hallName,
        employee.shift?.placeName,
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
          : statusFilter === "in_shift"
            ? shiftActive
            : status === statusFilter;

      return matchQuery && matchStatus;
    });
  }, [employees, query, statusFilter, tick]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* ================= Header ================= */}
      <section className="relative overflow-hidden rounded-[34px] border border-white/80 bg-white/90 p-5 shadow-xl shadow-indigo-100/50 backdrop-blur md:p-7">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-violet-200/25 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">
              <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
              סופטפונים חיים של עובדים במשמרת
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-4xl">
              ניהול משמרת
            </h1>

            <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-500">
              ברירת המחדל מציגה רק עובדים שנמצאים במשמרת. כאן רואים בלייב מי פנוי,
              מי מחייג, מי בשיחה, מי לא פנוי ומה קורה בסופטפון של כל עובד.
            </p>

            <p className="mt-2 text-xs font-bold text-slate-400">
              עדכון אחרון: {lastRefreshAt ? formatDateTime(lastRefreshAt) : "—"}
              {refreshing ? " · מתעדכן..." : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchEmployees(false)}
            disabled={loading || refreshing}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-indigo-500 to-violet-500 px-5 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshIcon spinning={loading || refreshing} />
            רענון ידני
          </button>
        </div>
      </section>

      {/* ================= Stats ================= */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatCard label="במשמרת" value={stats.inShift} hint="ברירת מחדל" />
        <StatCard label="מחוברים לייב" value={stats.live} hint="סופטפון פעיל" />
        <StatCard label="פנויים" value={stats.online} hint="יכולים לקבל שיחה" />
        <StatCard label="מחייגים" value={stats.dialing} hint="שיחה יוצאת" />
        <StatCard label="בשיחה" value={stats.inCall} hint="פעילות עכשיו" />
        <StatCard label="לא פנויים" value={stats.notAvailable} hint="עסוק / הפסקה" />
        <StatCard label="סה״כ עובדים" value={stats.total} hint="עובדי מערכת" />
      </section>

      {/* ================= Filters ================= */}
      <section className="rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-lg shadow-slate-100/70 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש עובד / מספר / לקוח / אירוע / אולם..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-11 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-200 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            />

            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={statusFilter === "in_shift"}
              onClick={() => setStatusFilter("in_shift")}
            >
              במשמרת
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
              שיחה נכנסת
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
        </div>
      </section>

      {error && (
        <section className="rounded-[24px] border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </section>
      )}

      {loading ? (
        <LoadingState />
      ) : filteredEmployees.length === 0 ? (
        <EmptyState filter={statusFilter} />
      ) : (
        <section className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {filteredEmployees.map((employee) => (
            <LiveSoftphoneCard
              key={getEmployeeId(employee)}
              employee={employee}
              tick={tick}
              ending={endingEmployeeId === getEmployeeId(employee)}
              onEndShift={() => endEmployeeShift(employee)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

/* =====================================================
   COMPONENTS
===================================================== */

function LiveSoftphoneCard({
  employee,
  tick,
  ending,
  onEndShift,
}: {
  employee: EmployeeShiftMonitor;
  tick: number;
  ending: boolean;
  onEndShift: () => void;
}) {
  const status = normalizeStatus(employee);
  const meta = getStatusMeta(status);
  const name = getEmployeeName(employee);
  const image = getEmployeeImage(employee);

  const shiftActive = isShiftActiveNow(employee);
  const shiftStart = getShiftStart(employee);
  const shiftEnd = getShiftEnd(employee);

  const currentAction = getCurrentAction(employee, status);

  const isCall =
    status === "dialing" || status === "ringing" || status === "in_call";

  const duration = isCall
    ? getCurrentCallDuration(employee, tick)
    : getAvailabilityDuration(employee, tick);

  const shiftSeconds = getShiftSeconds(employee, tick);

  const extension =
    employee.softphone?.extension ||
    employee.softphone?.sipExtension ||
    employee.softphone?.sipUsername ||
    employee.softphone?.sip_user ||
    "—";

  return (
    <article
      className={`relative overflow-hidden rounded-[34px] border bg-white/90 p-5 shadow-xl shadow-slate-100/80 backdrop-blur ${meta.card}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l ${meta.line}`} />

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {image ? (
            <img
              src={image}
              alt={name}
              className="h-14 w-14 shrink-0 rounded-[22px] object-cover ring-1 ring-slate-100"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-indigo-500 to-violet-500 text-base font-black text-white shadow-lg shadow-indigo-100">
              {getInitials(name)}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate text-lg font-black text-slate-950">{name}</p>
            <p className="mt-1 truncate text-xs font-bold text-slate-400">
              {employee.email || getEmployeePhone(employee) || "—"}
            </p>
          </div>
        </div>

        <StatusBadge status={status} />
      </div>

      <div className="mt-5 rounded-[28px] border border-slate-100 bg-white/85 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-400">
              מה העובד עושה עכשיו
            </p>
            <p className="mt-1 truncate text-xl font-black text-slate-950">
              {currentAction.title}
            </p>
            <p className="mt-1 truncate text-sm font-bold text-slate-500">
              {currentAction.sub}
            </p>
          </div>

          <div className="shrink-0 rounded-2xl bg-slate-950 px-3 py-2 text-left font-mono text-sm font-black text-white">
            {formatDuration(duration)}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <InfoBox
            label="מספר פעיל"
            value={isCall ? getCallPhone(employee) || "—" : "—"}
          />

          <InfoBox
            label="שלוחה"
            value={extension}
          />

          <InfoBox
            label="כיוון שיחה"
            value={isCall ? getDirectionLabel(employee.currentCall?.direction) : "—"}
          />

          <InfoBox
            label="עדכון אחרון"
            value={formatDateTime(
              employee.updatedAt ||
                employee.softphone?.lastSeenAt ||
                employee.softphone?.updatedAt ||
                employee.lastSeenAt,
            )}
          />
        </div>
      </div>

      <div className="mt-4 rounded-[28px] border border-slate-100 bg-slate-50/80 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-slate-400">משמרת</p>
            <p
              className={`mt-1 text-base font-black ${
                shiftActive ? "text-emerald-700" : "text-slate-700"
              }`}
            >
              {shiftActive ? getShiftTitle(employee) : "לא במשמרת"}
            </p>
          </div>

          <span
            className={`rounded-2xl px-3 py-2 text-xs font-black ring-1 ${
              shiftActive
                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                : "bg-slate-100 text-slate-500 ring-slate-200"
            }`}
          >
            {shiftActive ? "פעילה" : "לא פעילה"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <InfoBox
            label="זמן משמרת"
            value={shiftActive ? formatDuration(shiftSeconds) : "—"}
          />

          <InfoBox
            label="שעות"
            value={
              shiftStart || shiftEnd
                ? `${formatTime(shiftStart)} - ${formatTime(shiftEnd)}`
                : "—"
            }
          />

          <div className="col-span-2">
            <InfoBox label="מיקום / אירוע" value={getShiftLocation(employee)} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniMetric label="שיחות" value={employee.work?.callsToday || 0} />
        <MiniMetric label="נענו" value={employee.work?.answeredToday || 0} />
        <MiniMetric label="בוצע" value={employee.work?.completedToday || 0} />
      </div>

      {shiftActive && (
        <button
          type="button"
          onClick={onEndShift}
          disabled={ending}
          className="mt-4 h-11 w-full rounded-2xl border border-rose-100 bg-rose-50 text-sm font-black text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {ending ? "מוציא ממשמרת..." : "הוצא עובד ממשמרת"}
        </button>
      )}
    </article>
  );
}

function StatusBadge({ status }: { status: SoftphoneStatus }) {
  const meta = getStatusMeta(status);

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black ring-1 ${meta.badge}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
      {meta.label}
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
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-4 shadow-lg shadow-slate-100/70 backdrop-blur">
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-100">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <section className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-[420px] animate-pulse rounded-[34px] border border-slate-100 bg-white/80 shadow-lg shadow-slate-100"
        />
      ))}
    </section>
  );
}

function EmptyState({ filter }: { filter: ShiftManagementFilter }) {
  const isShiftFilter = filter === "in_shift";

  return (
    <section className="rounded-[34px] border border-white/70 bg-white/85 p-10 text-center shadow-xl shadow-slate-100/70 backdrop-blur">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-50 text-slate-400 ring-1 ring-slate-100">
        <HeadsetIcon />
      </div>

      <h2 className="mt-4 text-xl font-black text-slate-950">
        {isShiftFilter ? "אין עובדים במשמרת כרגע" : "אין עובדים להצגה"}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-6 text-slate-500">
        {isShiftFilter
          ? "ברירת המחדל מציגה רק עובדים שהתחילו משמרת. כדי לראות את כולם לחצי על ״הכל״."
          : "כרגע אין עובדים שתואמים לסינון שבחרת."}
      </p>
    </section>
  );
}

/* =====================================================
   ICONS
===================================================== */

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${spinning ? "animate-spin" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <path d="M3 16h6" />
      <path d="M3 16v6" />
      <path d="M3 12A9 9 0 0 1 18.5 5.7L21 8" />
      <path d="M21 8h-6" />
      <path d="M21 8V2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function HeadsetIcon() {
  return (
    <svg
      className="h-8 w-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12a8 8 0 0 1 16 0" />
      <path d="M4 12v3a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2" />
      <path d="M20 12v3a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2" />
      <path d="M13 19h2a3 3 0 0 0 3-3" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  );
}