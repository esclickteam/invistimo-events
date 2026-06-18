"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

type ShiftLocation = "home" | "venue" | "office" | "unknown" | "";

type EmployeeShiftMonitor = {
  id?: string;
  _id?: string;

  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;

  avatar?: string;
  role?: string;
  staffType?: string;

  isActive?: boolean;
  isOnline?: boolean;

  softphone?: {
    status?: SoftphoneStatus | string;
    extension?: string;
    sipUsername?: string;
    lastSeenAt?: string | Date | null;
  };

  currentCall?: {
    active?: boolean;
    direction?: "inbound" | "outbound" | "unknown" | string;
    status?: string;
    startedAt?: string | Date | null;
    answeredAt?: string | Date | null;
    durationSeconds?: number;
    customerName?: string;
    customerPhone?: string;
    guestName?: string;
    guestPhone?: string;
    eventName?: string;
    invitationTitle?: string;
    callControlId?: string;
  } | null;

  availability?: {
    status?: SoftphoneStatus | string;
    reason?: string;
    since?: string | Date | null;
    durationSeconds?: number;
  };

  shift?: {
    active?: boolean;
    title?: string;
    startAt?: string | Date | null;
    endAt?: string | Date | null;
    location?: ShiftLocation | string;
    venueName?: string;
    eventName?: string;
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
};

type ApiResponse = {
  success?: boolean;
  employees?: EmployeeShiftMonitor[];
  data?: EmployeeShiftMonitor[];
  items?: EmployeeShiftMonitor[];
  error?: string;
};

/* =====================================================
   HELPERS
===================================================== */

function getEmployeeId(employee: EmployeeShiftMonitor) {
  return String(employee.id || employee._id || employee.email || Math.random());
}

function getEmployeeName(employee: EmployeeShiftMonitor) {
  return (
    employee.fullName ||
    employee.name ||
    employee.email ||
    "עובד ללא שם"
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

function normalizeStatus(employee: EmployeeShiftMonitor): SoftphoneStatus {
  const callActive =
    employee.currentCall?.active ||
    employee.currentCall?.status === "answered" ||
    employee.currentCall?.status === "in_call";

  if (callActive) return "in_call";

  const softphoneStatus = String(employee.softphone?.status || "").toLowerCase();
  const availabilityStatus = String(employee.availability?.status || "").toLowerCase();

  const raw = availabilityStatus || softphoneStatus;

  if (
    raw === "online" ||
    raw === "offline" ||
    raw === "in_call" ||
    raw === "ringing" ||
    raw === "busy" ||
    raw === "break" ||
    raw === "not_available"
  ) {
    return raw as SoftphoneStatus;
  }

  if (employee.isOnline) return "online";
  if (employee.isActive === false) return "offline";

  return "unknown";
}

function getStatusMeta(status: SoftphoneStatus) {
  if (status === "in_call") {
    return {
      label: "בשיחה",
      dot: "bg-emerald-500",
      badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      card: "border-emerald-100 bg-emerald-50/40",
    };
  }

  if (status === "ringing") {
    return {
      label: "שיחה נכנסת",
      dot: "bg-sky-500",
      badge: "bg-sky-50 text-sky-700 ring-sky-100",
      card: "border-sky-100 bg-sky-50/40",
    };
  }

  if (status === "online") {
    return {
      label: "פנוי",
      dot: "bg-indigo-500",
      badge: "bg-indigo-50 text-indigo-700 ring-indigo-100",
      card: "border-indigo-100 bg-white",
    };
  }

  if (status === "busy") {
    return {
      label: "עסוק",
      dot: "bg-amber-500",
      badge: "bg-amber-50 text-amber-700 ring-amber-100",
      card: "border-amber-100 bg-amber-50/40",
    };
  }

  if (status === "break") {
    return {
      label: "בהפסקה",
      dot: "bg-orange-500",
      badge: "bg-orange-50 text-orange-700 ring-orange-100",
      card: "border-orange-100 bg-orange-50/40",
    };
  }

  if (status === "not_available") {
    return {
      label: "לא פנוי",
      dot: "bg-rose-500",
      badge: "bg-rose-50 text-rose-700 ring-rose-100",
      card: "border-rose-100 bg-rose-50/40",
    };
  }

  if (status === "offline") {
    return {
      label: "מנותק",
      dot: "bg-slate-400",
      badge: "bg-slate-100 text-slate-600 ring-slate-200",
      card: "border-slate-100 bg-slate-50/70",
    };
  }

  return {
    label: "לא ידוע",
    dot: "bg-slate-300",
    badge: "bg-slate-100 text-slate-500 ring-slate-200",
    card: "border-slate-100 bg-white",
  };
}

function getCallTarget(employee: EmployeeShiftMonitor) {
  const call = employee.currentCall;

  if (!call) return "—";

  return (
    call.customerName ||
    call.guestName ||
    call.customerPhone ||
    call.guestPhone ||
    "לקוח ללא שם"
  );
}

function getCallPhone(employee: EmployeeShiftMonitor) {
  const call = employee.currentCall;

  if (!call) return "";

  return call.customerPhone || call.guestPhone || "";
}

function getCurrentCallDuration(employee: EmployeeShiftMonitor, tick: number) {
  const call = employee.currentCall;

  if (!call?.active && !call?.startedAt && !call?.answeredAt) {
    return 0;
  }

  if (typeof call?.durationSeconds === "number" && call.durationSeconds > 0) {
    return call.durationSeconds;
  }

  const start = call.answeredAt || call.startedAt;
  return secondsBetween(start) + tick * 0;
}

function getAvailabilityDuration(employee: EmployeeShiftMonitor, tick: number) {
  if (typeof employee.availability?.durationSeconds === "number") {
    return employee.availability.durationSeconds;
  }

  return secondsBetween(employee.availability?.since) + tick * 0;
}

function getShiftLocationLabel(value?: string) {
  if (value === "home") return "בית";
  if (value === "venue") return "אולם";
  if (value === "office") return "משרד";
  return "—";
}

function getDirectionLabel(value?: string) {
  if (value === "inbound") return "נכנסת";
  if (value === "outbound") return "יוצאת";
  return "—";
}

/* =====================================================
   PAGE
===================================================== */

export default function AdminShiftManagementPage() {
  const [employees, setEmployees] = useState<EmployeeShiftMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SoftphoneStatus>("all");
  const [tick, setTick] = useState(0);

  const fetchEmployees = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const res = await fetch("/api/admin/shift-management", {
        method: "GET",
        cache: "no-store",
      });

      const json = (await res.json().catch(() => ({}))) as ApiResponse;

      if (!res.ok || json.success === false) {
        throw new Error(json.error || "לא הצלחתי לטעון את ניהול המשמרת");
      }

      const list = json.employees || json.data || json.items || [];

      setEmployees(Array.isArray(list) ? list : []);
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
    }, 5000);

    return () => window.clearInterval(timer);
  }, [fetchEmployees]);

  const stats = useMemo(() => {
    const total = employees.length;

    let online = 0;
    let inCall = 0;
    let notAvailable = 0;
    let offline = 0;

    for (const employee of employees) {
      const status = normalizeStatus(employee);

      if (status === "online") online += 1;
      if (status === "in_call" || status === "ringing") inCall += 1;
      if (status === "busy" || status === "break" || status === "not_available") {
        notAvailable += 1;
      }
      if (status === "offline" || status === "unknown") offline += 1;
    }

    return {
      total,
      online,
      inCall,
      notAvailable,
      offline,
    };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return employees.filter((employee) => {
      const status = normalizeStatus(employee);
      const name = getEmployeeName(employee).toLowerCase();

      const searchable = [
        name,
        employee.email,
        employee.phone,
        employee.softphone?.extension,
        employee.softphone?.sipUsername,
        employee.currentCall?.customerName,
        employee.currentCall?.customerPhone,
        employee.currentCall?.guestName,
        employee.currentCall?.guestPhone,
        employee.currentCall?.eventName,
        employee.currentCall?.invitationTitle,
        employee.shift?.eventName,
        employee.shift?.venueName,
        employee.availability?.reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchQuery = !cleanQuery || searchable.includes(cleanQuery);
      const matchStatus = statusFilter === "all" || status === statusFilter;

      return matchQuery && matchStatus;
    });
  }, [employees, query, statusFilter, tick]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* ================= Header ================= */}
      <section className="overflow-hidden rounded-[34px] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-100/40 backdrop-blur md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              צפייה בלבד בסופטפון העובדים
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-4xl">
              ניהול משמרת
            </h1>

            <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-500">
              כאן רואים בזמן אמת מה כל עובד עושה: האם הוא פנוי, בשיחה, עם מי הוא מדבר,
              כמה זמן השיחה נמשכת, ואם הוא לא פנוי — מה הסיבה וכמה זמן.
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
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="סה״כ עובדים" value={stats.total} hint="במערכת" />
        <StatCard label="פנויים" value={stats.online} hint="יכולים לקבל שיחה" />
        <StatCard label="בשיחה" value={stats.inCall} hint="פעילות עכשיו" />
        <StatCard label="לא פנויים" value={stats.notAvailable} hint="עסוק / הפסקה" />
        <StatCard label="מנותקים" value={stats.offline} hint="לא זמינים" />
      </section>

      {/* ================= Filters ================= */}
      <section className="rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-lg shadow-slate-100/70 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש עובד / מספר / לקוח / אירוע..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-11 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-200 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            />

            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
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
              active={statusFilter === "in_call"}
              onClick={() => setStatusFilter("in_call")}
            >
              בשיחה
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

      {/* ================= Error ================= */}
      {error && (
        <section className="rounded-[24px] border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </section>
      )}

      {/* ================= Content ================= */}
      {loading ? (
        <LoadingState />
      ) : filteredEmployees.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Desktop table */}
          <section className="hidden overflow-hidden rounded-[30px] border border-white/70 bg-white/90 shadow-xl shadow-slate-100/80 backdrop-blur xl:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] border-collapse text-right">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-black text-slate-500">
                    <th className="px-5 py-4">עובד</th>
                    <th className="px-5 py-4">סטטוס</th>
                    <th className="px-5 py-4">מה עושה עכשיו</th>
                    <th className="px-5 py-4">עם מי / מספר</th>
                    <th className="px-5 py-4">משך</th>
                    <th className="px-5 py-4">משמרת</th>
                    <th className="px-5 py-4">היום</th>
                    <th className="px-5 py-4">עדכון אחרון</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEmployees.map((employee) => (
                    <EmployeeTableRow
                      key={getEmployeeId(employee)}
                      employee={employee}
                      tick={tick}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Mobile / cards */}
          <section className="grid gap-4 xl:hidden">
            {filteredEmployees.map((employee) => (
              <EmployeeCard
                key={getEmployeeId(employee)}
                employee={employee}
                tick={tick}
              />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

/* =====================================================
   COMPONENTS
===================================================== */

function EmployeeTableRow({
  employee,
  tick,
}: {
  employee: EmployeeShiftMonitor;
  tick: number;
}) {
  const status = normalizeStatus(employee);
  const meta = getStatusMeta(status);
  const name = getEmployeeName(employee);

  const callActive = status === "in_call" || status === "ringing";
  const callDuration = getCurrentCallDuration(employee, tick);
  const availabilityDuration = getAvailabilityDuration(employee, tick);

  const currentAction = getCurrentAction(employee, status);
  const duration = callActive ? callDuration : availabilityDuration;

  return (
    <tr className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar employee={employee} />

          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950">{name}</p>
            <p className="mt-1 truncate text-xs font-bold text-slate-400">
              {employee.email || employee.phone || "—"}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={status} />
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-black text-slate-800">{currentAction.title}</p>
        <p className="mt-1 text-xs font-bold text-slate-400">{currentAction.sub}</p>
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-black text-slate-800">
          {callActive ? getCallTarget(employee) : "—"}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-400">
          {callActive ? getCallPhone(employee) || "—" : "אין שיחה פעילה"}
        </p>
      </td>

      <td className="px-5 py-4">
        <span className="inline-flex rounded-2xl bg-slate-50 px-3 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-100">
          {duration > 0 ? formatDuration(duration) : "—"}
        </span>
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-black text-slate-800">
          {employee.shift?.active ? "פעילה" : "לא במשמרת"}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-400">
          {employee.shift?.active
            ? `${formatTime(employee.shift?.startAt)} - ${formatTime(employee.shift?.endAt)}`
            : "—"}
        </p>
      </td>

      <td className="px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <MiniMetric label="שיחות" value={employee.work?.callsToday || 0} />
          <MiniMetric label="ענו" value={employee.work?.answeredToday || 0} />
          <MiniMetric label="בוצע" value={employee.work?.completedToday || 0} />
        </div>
      </td>

      <td className="px-5 py-4">
        <p className="text-xs font-bold text-slate-500">
          {formatDateTime(employee.updatedAt || employee.softphone?.lastSeenAt)}
        </p>
      </td>
    </tr>
  );
}

function EmployeeCard({
  employee,
  tick,
}: {
  employee: EmployeeShiftMonitor;
  tick: number;
}) {
  const status = normalizeStatus(employee);
  const meta = getStatusMeta(status);
  const name = getEmployeeName(employee);

  const callActive = status === "in_call" || status === "ringing";
  const callDuration = getCurrentCallDuration(employee, tick);
  const availabilityDuration = getAvailabilityDuration(employee, tick);
  const currentAction = getCurrentAction(employee, status);
  const duration = callActive ? callDuration : availabilityDuration;

  return (
    <article className={`rounded-[30px] border p-4 shadow-lg shadow-slate-100/70 ${meta.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar employee={employee} />

          <div className="min-w-0">
            <p className="truncate text-base font-black text-slate-950">{name}</p>
            <p className="mt-1 truncate text-xs font-bold text-slate-400">
              {employee.email || employee.phone || "—"}
            </p>
          </div>
        </div>

        <StatusBadge status={status} />
      </div>

      <div className="mt-4 rounded-[24px] bg-white/80 p-4 ring-1 ring-slate-100">
        <p className="text-xs font-black text-slate-400">מה עושה עכשיו</p>
        <p className="mt-1 text-lg font-black text-slate-900">{currentAction.title}</p>
        <p className="mt-1 text-sm font-bold text-slate-500">{currentAction.sub}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <InfoBox
            label="משך"
            value={duration > 0 ? formatDuration(duration) : "—"}
          />

          <InfoBox
            label="שלוחה"
            value={
              employee.softphone?.extension ||
              employee.softphone?.sipUsername ||
              "—"
            }
          />

          <InfoBox
            label="עם מי"
            value={callActive ? getCallTarget(employee) : "—"}
          />

          <InfoBox
            label="מספר"
            value={callActive ? getCallPhone(employee) || "—" : "—"}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniMetric label="שיחות" value={employee.work?.callsToday || 0} />
        <MiniMetric label="ענו" value={employee.work?.answeredToday || 0} />
        <MiniMetric label="בוצע" value={employee.work?.completedToday || 0} />
      </div>

      <div className="mt-4 rounded-[22px] bg-white/70 p-3 ring-1 ring-slate-100">
        <div className="flex items-center justify-between gap-3 text-xs font-bold">
          <span className="text-slate-400">משמרת</span>
          <span className="text-slate-800">
            {employee.shift?.active ? "פעילה" : "לא במשמרת"}
          </span>
        </div>

        {employee.shift?.active && (
          <div className="mt-2 text-xs font-bold leading-5 text-slate-500">
            <p>
              שעות: {formatTime(employee.shift?.startAt)} -{" "}
              {formatTime(employee.shift?.endAt)}
            </p>
            <p>
              מיקום: {getShiftLocationLabel(employee.shift?.location)}
              {employee.shift?.venueName ? ` · ${employee.shift.venueName}` : ""}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

function getCurrentAction(employee: EmployeeShiftMonitor, status: SoftphoneStatus) {
  const call = employee.currentCall;

  if (status === "in_call" || status === "ringing") {
    const target = getCallTarget(employee);
    const direction = getDirectionLabel(call?.direction);

    return {
      title: status === "ringing" ? "שיחה נכנסת" : `בשיחה עם ${target}`,
      sub: [
        direction !== "—" ? `שיחה ${direction}` : "",
        call?.eventName || call?.invitationTitle || "",
      ]
        .filter(Boolean)
        .join(" · ") || "שיחה פעילה",
    };
  }

  if (status === "busy" || status === "break" || status === "not_available") {
    return {
      title:
        employee.availability?.reason ||
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
    title: "לא ידוע",
    sub: "אין נתונים עדכניים",
  };
}

function Avatar({ employee }: { employee: EmployeeShiftMonitor }) {
  const name = getEmployeeName(employee);

  if (employee.avatar) {
    return (
      <img
        src={employee.avatar}
        alt={name}
        className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-1 ring-slate-100"
      />
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-black text-white shadow-lg shadow-indigo-100">
      {getInitials(name)}
    </div>
  );
}

function StatusBadge({ status }: { status: SoftphoneStatus }) {
  const meta = getStatusMeta(status);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black ring-1 ${meta.badge}`}
    >
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
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
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-44 animate-pulse rounded-[30px] border border-slate-100 bg-white/80 shadow-lg shadow-slate-100"
        />
      ))}
    </section>
  );
}

function EmptyState() {
  return (
    <section className="rounded-[34px] border border-white/70 bg-white/85 p-10 text-center shadow-xl shadow-slate-100/70 backdrop-blur">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-50 text-slate-400 ring-1 ring-slate-100">
        <HeadsetIcon />
      </div>

      <h2 className="mt-4 text-xl font-black text-slate-950">
        אין עובדים להצגה
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-6 text-slate-500">
        ברגע שה־API יחזיר עובדים פעילים או עובדים עם סופטפון, הם יופיעו כאן
        אוטומטית.
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