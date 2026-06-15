"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";

type LocationType = "home" | "hall";

type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
};

type EmployeeShift = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeePhone: string;
  date: string;
  dayName: string;
  month: string;
  scheduledStart: string;
  scheduledEnd: string;
  locationType: LocationType;
  locationName: string;
  locationAddress: string;
  shiftLabel: string;
  note: string;
};

type ShiftForm = {
  employeeId: string;
  date: string;
  scheduledStart: string;
  scheduledEnd: string;
  locationType: LocationType;
  locationName: string;
  locationAddress: string;
  note: string;
};

type CalendarDay = {
  key: string;
  date: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  shifts: EmployeeShift[];
};

const API = {
  employees: "/api/admin/employees",
  shifts: (month: string) =>
    `/api/admin/employees/shifts?month=${encodeURIComponent(month)}`,
  saveShift: "/api/admin/employees/shifts",
  deleteShift: (shiftId: string) =>
    `/api/admin/employees/shifts?shiftId=${encodeURIComponent(shiftId)}`,
};

const WEEK_DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

function parseLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

function getTodayInput() {
  return toDateKey(new Date());
}

function getFirstDayOfMonth(month: string) {
  return `${month}-01`;
}

function getMonthFromDate(date: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date.slice(0, 7);
  return getCurrentMonthKey();
}

function addMonths(monthKey: string, amount: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1, 12, 0, 0, 0);

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || data?.message || "שגיאה בטעינת נתונים");
  }

  return data;
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = parseLocalDate(value) || new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDayName(value: string) {
  const date = parseLocalDate(value);
  if (!date || Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("he-IL", {
    weekday: "long",
  });
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;

  return new Date(year, month - 1, 1, 12, 0, 0, 0).toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });
}

function normalizeShift(raw: any): EmployeeShift {
  const locationType: LocationType =
    cleanStr(raw?.locationType) === "hall" ? "hall" : "home";

  return {
    id: cleanStr(raw?.id || raw?._id),
    employeeId: cleanStr(raw?.employeeId || raw?.employeeIdString),
    employeeName: cleanStr(raw?.employeeName) || "עובד ללא שם",
    employeeEmail: cleanStr(raw?.employeeEmail),
    employeePhone: cleanStr(raw?.employeePhone),
    date: cleanStr(raw?.date),
    dayName: cleanStr(raw?.dayName),
    month: cleanStr(raw?.month),
    scheduledStart: cleanStr(raw?.scheduledStart),
    scheduledEnd: cleanStr(raw?.scheduledEnd),
    locationType,
    locationName: cleanStr(raw?.locationName),
    locationAddress: cleanStr(raw?.locationAddress),
    shiftLabel: cleanStr(raw?.shiftLabel),
    note: cleanStr(raw?.note),
  };
}

function locationLabel(shift: {
  locationType: LocationType;
  locationName?: string;
  locationAddress?: string;
}) {
  if (shift.locationType === "home") return "בית";

  const name = cleanStr(shift.locationName);
  const address = cleanStr(shift.locationAddress);

  if (name && address) return `${name} · ${address}`;
  if (name) return name;
  if (address) return address;

  return "אולם";
}

function sortShifts(shifts: EmployeeShift[]) {
  return [...shifts].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;

    const timeCompare = a.scheduledStart.localeCompare(b.scheduledStart);
    if (timeCompare !== 0) return timeCompare;

    return a.employeeName.localeCompare(b.employeeName);
  });
}

function getEmptyForm(date = getTodayInput()): ShiftForm {
  return {
    employeeId: "",
    date,
    scheduledStart: "",
    scheduledEnd: "",
    locationType: "home",
    locationName: "",
    locationAddress: "",
    note: "",
  };
}

function buildCalendarDays({
  month,
  selectedDate,
  shiftsByDate,
}: {
  month: string;
  selectedDate: string;
  shiftsByDate: Map<string, EmployeeShift[]>;
}): CalendarDay[] {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return [];

  const today = getTodayInput();
  const firstDate = new Date(year, monthNumber - 1, 1, 12, 0, 0, 0);
  const daysInMonth = new Date(year, monthNumber, 0, 12, 0, 0, 0).getDate();
  const startOffset = firstDate.getDay();

  const days: CalendarDay[] = [];

  for (let index = 0; index < startOffset; index += 1) {
    days.push({
      key: `empty-start-${index}`,
      date: "",
      dayNumber: 0,
      inMonth: false,
      isToday: false,
      isSelected: false,
      shifts: [],
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${pad2(monthNumber)}-${pad2(day)}`;

    days.push({
      key: date,
      date,
      dayNumber: day,
      inMonth: true,
      isToday: date === today,
      isSelected: date === selectedDate,
      shifts: shiftsByDate.get(date) || [],
    });
  }

  while (days.length % 7 !== 0) {
    days.push({
      key: `empty-end-${days.length}`,
      date: "",
      dayNumber: 0,
      inMonth: false,
      isToday: false,
      isSelected: false,
      shifts: [],
    });
  }

  return days;
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name:
    | "arrow"
    | "refresh"
    | "save"
    | "trash"
    | "clock"
    | "edit"
    | "home"
    | "building"
    | "calendar"
    | "plus"
    | "right"
    | "left";
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </svg>
    );
  }

  if (name === "right") {
    return (
      <svg {...common}>
        <path d="m15 18-6-6 6-6" />
      </svg>
    );
  }

  if (name === "left") {
    return (
      <svg {...common}>
        <path d="m9 18 6-6-6-6" />
      </svg>
    );
  }

  if (name === "refresh") {
    return (
      <svg {...common}>
        <path d="M21 12a9 9 0 0 1-15.3 6.4" />
        <path d="M3 12A9 9 0 0 1 18.3 5.6" />
        <path d="M18 2v4h-4" />
        <path d="M6 22v-4h4" />
      </svg>
    );
  }

  if (name === "save") {
    return (
      <svg {...common}>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <path d="M17 21v-8H7v8" />
        <path d="M7 3v5h8" />
      </svg>
    );
  }

  if (name === "trash") {
    return (
      <svg {...common}>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v5" />
        <path d="M14 11v5" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "edit") {
    return (
      <svg {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    );
  }

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M3 11 12 3l9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }

  if (name === "building") {
    return (
      <svg {...common}>
        <path d="M4 21V3h16v18" />
        <path d="M9 21v-5h6v5" />
        <path d="M8 7h.01" />
        <path d="M12 7h.01" />
        <path d="M16 7h.01" />
        <path d="M8 11h.01" />
        <path d="M12 11h.01" />
        <path d="M16 11h.01" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 14h.01" />
        <path d="M12 14h.01" />
        <path d="M16 14h.01" />
        <path d="M8 18h.01" />
        <path d="M12 18h.01" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export default function AdminEmployeeShiftsPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [shifts, setShifts] = useState<EmployeeShift[]>([]);

  const [month, setMonth] = useState(getCurrentMonthKey());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState("");

  const [form, setForm] = useState<ShiftForm>(() =>
    getEmptyForm(getTodayInput())
  );

  const selectedDate = form.date || getFirstDayOfMonth(month);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === form.employeeId) || null,
    [employees, form.employeeId]
  );

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, EmployeeShift[]>();

    shifts.forEach((shift) => {
      if (!shift.date) return;

      const current = map.get(shift.date) || [];
      current.push(shift);

      map.set(shift.date, sortShifts(current));
    });

    return map;
  }, [shifts]);

  const calendarDays = useMemo(
    () => buildCalendarDays({ month, selectedDate, shiftsByDate }),
    [month, selectedDate, shiftsByDate]
  );

  const selectedDateShifts = useMemo(
    () => shiftsByDate.get(selectedDate) || [],
    [selectedDate, shiftsByDate]
  );

  const stats = useMemo(() => {
    const home = shifts.filter((shift) => shift.locationType === "home").length;
    const hall = shifts.filter((shift) => shift.locationType === "hall").length;

    return {
      total: shifts.length,
      home,
      hall,
      employees: new Set(shifts.map((shift) => shift.employeeId)).size,
    };
  }, [shifts]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [employeesData, shiftsData] = await Promise.all([
        fetchJson(API.employees),
        fetchJson(API.shifts(month)),
      ]);

      const nextEmployees = Array.isArray(employeesData?.employees)
        ? employeesData.employees
        : [];

      const nextShifts = Array.isArray(shiftsData?.shifts)
        ? shiftsData.shifts
        : [];

      setEmployees(
        nextEmployees.map((employee: any) => ({
          id: cleanStr(employee.id),
          name: cleanStr(employee.name) || "עובד ללא שם",
          email: cleanStr(employee.email),
          phone: cleanStr(employee.phone),
          address: cleanStr(employee.address),
        }))
      );

      setShifts(sortShifts(nextShifts.map(normalizeShift)));
    } catch (error) {
      console.error("LOAD SHIFTS PAGE FAILED:", error);
      alert(error instanceof Error ? error.message : "שגיאה בטעינת שיבוצים");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function changeMonth(nextMonth: string) {
    if (!/^\d{4}-\d{2}$/.test(nextMonth)) return;

    setMonth(nextMonth);
    setEditingShiftId("");
    setForm((prev) => ({
      ...prev,
      date: getFirstDayOfMonth(nextMonth),
    }));
  }

  function selectDate(date: string) {
    if (!date) return;

    setEditingShiftId("");
    setForm((prev) => ({
      ...prev,
      date,
    }));
  }

  function setLocationType(value: LocationType) {
    setForm((prev) => ({
      ...prev,
      locationType: value,
      locationName: value === "home" ? "" : prev.locationName,
      locationAddress: value === "home" ? "" : prev.locationAddress,
    }));
  }

  function editShift(shift: EmployeeShift) {
    const shiftMonth = getMonthFromDate(shift.date);

    setEditingShiftId(shift.id);
    setMonth(shiftMonth);

    setForm({
      employeeId: shift.employeeId,
      date: shift.date || getTodayInput(),
      scheduledStart: shift.scheduledStart,
      scheduledEnd: shift.scheduledEnd,
      locationType: shift.locationType,
      locationName: shift.locationName,
      locationAddress: shift.locationAddress,
      note: shift.note,
    });
  }

  async function saveShift() {
    if (saving) return;

    try {
      setSaving(true);

      if (!form.employeeId) throw new Error("חובה לבחור עובד");
      if (!form.date) throw new Error("חובה לבחור תאריך");

      if (!form.scheduledStart || !form.scheduledEnd) {
        throw new Error("חובה להזין שעת התחלה ושעת סיום");
      }

      if (form.locationType === "hall" && !cleanStr(form.locationAddress)) {
        throw new Error("באולם חובה להזין כתובת או מיקום אולם");
      }

      const employee = selectedEmployee;

      const payload = {
        ...form,
        employeeName: employee?.name || "",
        employeeEmail: employee?.email || "",
        employeePhone: employee?.phone || "",
        locationName: form.locationType === "home" ? "" : form.locationName,
        locationAddress:
          form.locationType === "home"
            ? employee?.address || form.locationAddress
            : form.locationAddress,
      };

      const data = await fetchJson(API.saveShift, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const savedShift = normalizeShift(data.shift);
      const savedMonth = savedShift.month || getMonthFromDate(savedShift.date);

      if (editingShiftId && savedShift.id && editingShiftId !== savedShift.id) {
        await fetchJson(API.deleteShift(editingShiftId), {
          method: "DELETE",
        });
      }

      if (savedMonth !== month) {
        setMonth(savedMonth);
      }

      setShifts((prev) => {
        const withoutOld = prev.filter((shift) => {
          const sameSavedId = savedShift.id && shift.id === savedShift.id;
          const sameEditingId = editingShiftId && shift.id === editingShiftId;

          const sameEmployeeSameDate =
            shift.employeeId === savedShift.employeeId &&
            shift.date === savedShift.date;

          return !sameSavedId && !sameEditingId && !sameEmployeeSameDate;
        });

        return sortShifts([...withoutOld, savedShift]);
      });

      setEditingShiftId("");
      setForm((prev) => ({
        ...prev,
        employeeId: "",
        scheduledStart: "",
        scheduledEnd: "",
        locationType: "home",
        locationName: "",
        locationAddress: "",
        note: "",
      }));

      alert("השיבוץ נשמר והסתנכרן לעמוד שעות עובד");
    } catch (error) {
      console.error("SAVE SHIFT FAILED:", error);
      alert(error instanceof Error ? error.message : "שגיאה בשמירת שיבוץ");
    } finally {
      setSaving(false);
    }
  }

  async function deleteShift(shiftId: string) {
    if (!shiftId) return;
    if (!confirm("למחוק את השיבוץ?")) return;

    try {
      await fetchJson(API.deleteShift(shiftId), {
        method: "DELETE",
      });

      setShifts((prev) => prev.filter((shift) => shift.id !== shiftId));

      if (editingShiftId === shiftId) {
        setEditingShiftId("");
        setForm(getEmptyForm(selectedDate));
      }
    } catch (error) {
      console.error("DELETE SHIFT FAILED:", error);
      alert(error instanceof Error ? error.message : "שגיאה במחיקת שיבוץ");
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 text-slate-900"
    >
      <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 md:p-6">
        <section className="rounded-[34px] border border-white bg-white p-6 shadow-[0_18px_55px_rgba(79,70,229,0.10)] md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link
                href="/admin/employees"
                className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700 transition hover:bg-indigo-100"
              >
                <Icon name="arrow" className="h-4 w-4" />
                חזרה לעובדים
              </Link>

              <div className="mt-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                  <Icon name="calendar" className="h-4 w-4" />
                  יומן שיבוץ משמרות
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
                  יומן שיבוץ משמרות עובדים
                </h1>

                <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-500 md:text-base">
                  בחרי תאריך מתוך היומן, בחרי עובד מתוך רשימת העובדים, הגדירי
                  שעות ומיקום. השיבוץ מסתנכרן לעמוד שעות עובד ולדוחות.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => changeMonth(addMonths(month, -1))}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
              >
                <Icon name="right" className="h-4 w-4" />
                חודש קודם
              </button>

              <input
                type="month"
                value={month}
                onChange={(event) => changeMonth(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none focus:border-indigo-300 focus:bg-white"
              />

              <button
                type="button"
                onClick={() => changeMonth(addMonths(month, 1))}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
              >
                חודש הבא
                <Icon name="left" className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
              >
                <Icon
                  name="refresh"
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                רענון
              </button>
            </div>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-4">
            <div className="rounded-[24px] border border-indigo-100 bg-indigo-50 p-5">
              <p className="text-xs font-black text-indigo-600">
                סה״כ שיבוצים
              </p>
              <p className="mt-2 text-3xl font-black text-indigo-950">
                {stats.total}
              </p>
            </div>

            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-xs font-black text-emerald-600">שיבוץ בית</p>
              <p className="mt-2 text-3xl font-black text-emerald-950">
                {stats.home}
              </p>
            </div>

            <div className="rounded-[24px] border border-violet-100 bg-violet-50 p-5">
              <p className="text-xs font-black text-violet-600">שיבוץ אולם</p>
              <p className="mt-2 text-3xl font-black text-violet-950">
                {stats.hall}
              </p>
            </div>

            <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-5">
              <p className="text-xs font-black text-amber-600">
                עובדים משובצים
              </p>
              <p className="mt-2 text-3xl font-black text-amber-950">
                {stats.employees}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-[34px] border border-white bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  יומן חודשי — {monthLabel(month)}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  לחצי על תאריך כדי לבחור יום לשיבוץ.
                </p>
              </div>

              <div className="text-sm font-black text-slate-500">
                {loading ? "טוען..." : `${shifts.length} שיבוצים בחודש`}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-2">
              {WEEK_DAYS.map((day) => (
                <div
                  key={day}
                  className="rounded-2xl bg-slate-50 py-3 text-center text-xs font-black text-slate-500"
                >
                  {day}
                </div>
              ))}

              {calendarDays.map((day) => {
                if (!day.inMonth) {
                  return (
                    <div
                      key={day.key}
                      className="min-h-[124px] rounded-[24px] border border-dashed border-slate-100 bg-slate-50/40"
                    />
                  );
                }

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => selectDate(day.date)}
                    className={`min-h-[124px] rounded-[24px] border p-3 text-right transition hover:border-indigo-200 hover:bg-indigo-50/50 ${
                      day.isSelected
                        ? "border-indigo-300 bg-indigo-50 shadow-[0_10px_30px_rgba(99,102,241,0.12)]"
                        : "border-slate-100 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-2xl text-sm font-black ${
                          day.isToday
                            ? "bg-emerald-500 text-white"
                            : day.isSelected
                            ? "bg-indigo-500 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {day.shifts.length > 0 ? (
                        <span className="rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-black text-indigo-700">
                          {day.shifts.length} שיבוצים
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 space-y-1.5">
                      {day.shifts.slice(0, 3).map((shift) => (
                        <div
                          key={shift.id}
                          className={`rounded-2xl border px-2 py-1.5 ${
                            shift.locationType === "home"
                              ? "border-emerald-100 bg-emerald-50"
                              : "border-violet-100 bg-violet-50"
                          }`}
                        >
                          <p className="truncate text-[11px] font-black text-slate-800">
                            {shift.employeeName}
                          </p>
                          <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                            {shift.scheduledStart || "—"} -{" "}
                            {shift.scheduledEnd || "—"}
                          </p>
                        </div>
                      ))}

                      {day.shifts.length > 3 ? (
                        <p className="text-[11px] font-black text-indigo-500">
                          +{day.shifts.length - 3} נוספים
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[34px] border border-white bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {editingShiftId ? "עריכת שיבוץ" : "שיבוץ לתאריך"}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {formatDate(selectedDate)} · {getDayName(selectedDate)}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Icon name="plus" className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs font-black text-slate-500">עובד</span>

                <select
                  value={form.employeeId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      employeeId: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none focus:border-indigo-300 focus:bg-white"
                >
                  <option value="">בחירת עובד</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} — {employee.email || employee.phone || ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black text-slate-500">
                  תאריך
                </span>

                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    const nextMonth = getMonthFromDate(nextDate);

                    setForm((prev) => ({ ...prev, date: nextDate }));

                    if (nextMonth !== month) {
                      setMonth(nextMonth);
                    }
                  }}
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none focus:border-indigo-300 focus:bg-white"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-black text-slate-500">
                    שעת התחלה
                  </span>

                  <input
                    type="time"
                    value={form.scheduledStart}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        scheduledStart: event.target.value,
                      }))
                    }
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none focus:border-indigo-300 focus:bg-white"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-black text-slate-500">
                    שעת סיום
                  </span>

                  <input
                    type="time"
                    value={form.scheduledEnd}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        scheduledEnd: event.target.value,
                      }))
                    }
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none focus:border-indigo-300 focus:bg-white"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-black text-slate-500">
                  סוג מיקום
                </span>

                <select
                  value={form.locationType}
                  onChange={(event) =>
                    setLocationType(event.target.value as LocationType)
                  }
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none focus:border-indigo-300 focus:bg-white"
                >
                  <option value="home">בית</option>
                  <option value="hall">אולם</option>
                </select>
              </label>

              {form.locationType === "hall" ? (
                <>
                  <label className="grid gap-2">
                    <span className="text-xs font-black text-slate-500">
                      שם אולם
                    </span>

                    <input
                      value={form.locationName}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          locationName: event.target.value,
                        }))
                      }
                      placeholder="לדוגמה: טרויה"
                      className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none focus:border-indigo-300 focus:bg-white"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-black text-slate-500">
                      מיקום / כתובת אולם
                    </span>

                    <input
                      value={form.locationAddress}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          locationAddress: event.target.value,
                        }))
                      }
                      placeholder="כתובת מלאה או מיקום"
                      className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none focus:border-indigo-300 focus:bg-white"
                    />
                  </label>
                </>
              ) : (
                <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600">
                      <Icon name="home" className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-sm font-black text-emerald-900">
                        שיבוץ לבית
                      </p>
                      <p className="mt-1 text-xs font-bold leading-6 text-emerald-700">
                        המיקום יילקח אוטומטית מכתובת העובד בתיק העובד:{" "}
                        {selectedEmployee?.address || "אין כתובת שמורה לעובד"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <label className="grid gap-2">
                <span className="text-xs font-black text-slate-500">הערה</span>

                <textarea
                  value={form.note}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      note: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="הערה פנימית לשיבוץ..."
                  className="resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-300 focus:bg-white"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void saveShift()}
                disabled={saving}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-indigo-500 to-violet-500 px-5 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="save" className="h-4 w-4" />
                {saving
                  ? "שומר..."
                  : editingShiftId
                  ? "שמירת עריכה"
                  : "שמירת שיבוץ"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingShiftId("");
                  setForm(getEmptyForm(selectedDate));
                }}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                ניקוי
              </button>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="text-sm font-black text-slate-900">
                שיבוצים בתאריך הנבחר
              </h3>

              {selectedDateShifts.length === 0 ? (
                <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                  אין שיבוצים לתאריך הזה.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {selectedDateShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="rounded-[22px] border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900">
                            {shift.employeeName}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {shift.scheduledStart || "—"} -{" "}
                            {shift.scheduledEnd || "—"} ·{" "}
                            {locationLabel(shift)}
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${
                            shift.locationType === "home"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-violet-200 bg-violet-50 text-violet-700"
                          }`}
                        >
                          {shift.locationType === "home" ? "בית" : "אולם"}
                        </span>
                      </div>

                      {shift.note ? (
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          {shift.note}
                        </p>
                      ) : null}

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => editShift(shift)}
                          className="inline-flex h-9 items-center justify-center gap-1 rounded-2xl border border-indigo-100 bg-indigo-50 px-3 text-xs font-black text-indigo-700 transition hover:bg-indigo-100"
                        >
                          <Icon name="edit" className="h-3.5 w-3.5" />
                          עריכה
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteShift(shift.id)}
                          className="inline-flex h-9 items-center justify-center gap-1 rounded-2xl border border-rose-100 bg-rose-50 px-3 text-xs font-black text-rose-600 transition hover:bg-rose-100"
                        >
                          <Icon name="trash" className="h-3.5 w-3.5" />
                          מחיקה
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}