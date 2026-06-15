"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

type LocationType = "home" | "hall";

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

const WEEK_DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate(),
  )}`;
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

function getTodayInput() {
  return toDateKey(new Date());
}

function parseLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addMonths(monthKey: string, amount: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1, 12, 0, 0, 0);

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;

  return new Date(year, month - 1, 1, 12, 0, 0, 0).toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });
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

function normalizeShift(raw: any): EmployeeShift {
  const locationType: LocationType =
    cleanStr(raw?.locationType) === "hall" ? "hall" : "home";

  return {
    id: cleanStr(raw?.id || raw?._id),
    employeeId: cleanStr(raw?.employeeId),
    employeeName: cleanStr(raw?.employeeName),
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

function locationLabel(shift: EmployeeShift) {
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
    return a.scheduledStart.localeCompare(b.scheduledStart);
  });
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || data?.message || "שגיאה בטעינת נתונים");
  }

  return data;
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: "arrow" | "refresh" | "calendar" | "clock" | "home" | "building" | "right" | "left";
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

  if (name === "calendar") {
    return (
      <svg {...common}>
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M3 10h18" />
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

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M3 11 12 3l9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M4 21V3h16v18" />
      <path d="M9 21v-5h6v5" />
      <path d="M8 7h.01" />
      <path d="M12 7h.01" />
      <path d="M16 7h.01" />
    </svg>
  );
}

function buildCalendarDays(month: string, shiftsByDate: Map<string, EmployeeShift[]>) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return [];

  const today = getTodayInput();
  const firstDate = new Date(year, monthNumber - 1, 1, 12, 0, 0, 0);
  const daysInMonth = new Date(year, monthNumber, 0, 12, 0, 0, 0).getDate();
  const startOffset = firstDate.getDay();
  const cells: Array<{ key: string; date: string; dayNumber: number; inMonth: boolean; isToday: boolean; shifts: EmployeeShift[] }> = [];

  for (let index = 0; index < startOffset; index += 1) {
    cells.push({ key: `empty-${index}`, date: "", dayNumber: 0, inMonth: false, isToday: false, shifts: [] });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${pad2(monthNumber)}-${pad2(day)}`;
    cells.push({ key: date, date, dayNumber: day, inMonth: true, isToday: date === today, shifts: shiftsByDate.get(date) || [] });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `empty-end-${cells.length}`, date: "", dayNumber: 0, inMonth: false, isToday: false, shifts: [] });
  }

  return cells;
}

export default function EmployeeShiftsPage() {
  const router = useRouter();
  const [month, setMonth] = useState(getCurrentMonthKey());
  const [shifts, setShifts] = useState<EmployeeShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadShifts = useCallback(async () => {
    try {
      setError("");
      setLoading(true);

      const data = await fetchJson(`/api/employee/shifts?month=${encodeURIComponent(month)}`);
      const nextShifts = Array.isArray(data?.shifts) ? data.shifts : [];
      setShifts(sortShifts(nextShifts.map(normalizeShift)));
    } catch (loadError) {
      console.error("LOAD EMPLOYEE SHIFTS FAILED:", loadError);
      setError(loadError instanceof Error ? loadError.message : "שגיאה בטעינת השיבוצים");
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void loadShifts();
  }, [loadShifts]);

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

  const calendarDays = useMemo(() => buildCalendarDays(month, shiftsByDate), [month, shiftsByDate]);

  const upcomingShifts = useMemo(() => {
    const today = getTodayInput();
    return shifts.filter((shift) => shift.date >= today);
  }, [shifts]);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 text-slate-900">
      <main className="mx-auto w-full max-w-[1450px] space-y-6 p-4 md:p-6">
        <section className="rounded-[34px] border border-white bg-white p-6 shadow-[0_18px_55px_rgba(79,70,229,0.10)] md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 text-sm font-black text-indigo-700 transition hover:bg-indigo-100"
              >
                <Icon name="arrow" className="h-4 w-4" />
                חזרה לדשבורד עובד
              </button>

              <div className="mt-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                  <Icon name="calendar" className="h-4 w-4" />
                  השיבוצים שלי
                </span>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
                  המשמרות שלי
                </h1>

                <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-500 md:text-base">
                  כאן מופיעות המשמרות שהאדמין שיבץ לך: תאריך, שעות, בית או אולם ומיקום המשמרת.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMonth(addMonths(month, -1))}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
              >
                <Icon name="right" className="h-4 w-4" />
                חודש קודם
              </button>

              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none focus:border-indigo-300 focus:bg-white"
              />

              <button
                type="button"
                onClick={() => setMonth(addMonths(month, 1))}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
              >
                חודש הבא
                <Icon name="left" className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => void loadShifts()}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-60"
              >
                <Icon name="refresh" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                רענון
              </button>
            </div>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-indigo-100 bg-indigo-50 p-5">
              <p className="text-xs font-black text-indigo-600">סה״כ שיבוצים</p>
              <p className="mt-2 text-3xl font-black text-indigo-950">{shifts.length}</p>
            </div>

            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-xs font-black text-emerald-600">משמרות עתידיות</p>
              <p className="mt-2 text-3xl font-black text-emerald-950">{upcomingShifts.length}</p>
            </div>

            <div className="rounded-[24px] border border-violet-100 bg-violet-50 p-5">
              <p className="text-xs font-black text-violet-600">חודש נבחר</p>
              <p className="mt-2 text-xl font-black text-violet-950">{monthLabel(month)}</p>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-[30px] border border-rose-200 bg-rose-50 p-6 text-sm font-black text-rose-700">
            {error}
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[34px] border border-white bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">יומן חודשי — {monthLabel(month)}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">ימים עם משמרות מסומנים בתוך היומן.</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-2">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="rounded-2xl bg-slate-50 py-3 text-center text-xs font-black text-slate-500">
                  {day}
                </div>
              ))}

              {calendarDays.map((day) => {
                if (!day.inMonth) {
                  return <div key={day.key} className="min-h-[120px] rounded-[24px] border border-dashed border-slate-100 bg-slate-50/40" />;
                }

                return (
                  <div key={day.key} className={`min-h-[120px] rounded-[24px] border p-3 ${day.isToday ? "border-emerald-200 bg-emerald-50/40" : "border-slate-100 bg-white"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-2xl text-sm font-black ${day.isToday ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-700"}`}>
                        {day.dayNumber}
                      </span>

                      {day.shifts.length > 0 ? (
                        <span className="rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-black text-indigo-700">
                          {day.shifts.length} שיבוצים
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 space-y-1.5">
                      {day.shifts.slice(0, 2).map((shift) => (
                        <div key={shift.id} className={`rounded-2xl border px-2 py-1.5 ${shift.locationType === "home" ? "border-emerald-100 bg-emerald-50" : "border-violet-100 bg-violet-50"}`}>
                          <p className="text-[11px] font-black text-slate-800">
                            {shift.scheduledStart || "—"} - {shift.scheduledEnd || "—"}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">
                            {locationLabel(shift)}
                          </p>
                        </div>
                      ))}

                      {day.shifts.length > 2 ? (
                        <p className="text-[11px] font-black text-indigo-500">+{day.shifts.length - 2} נוספים</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[34px] border border-white bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] md:p-6">
            <h2 className="text-xl font-black text-slate-900">רשימת המשמרות</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">כל המשמרות ששובצו לך לחודש הנבחר.</p>

            {loading ? (
              <div className="mt-6 rounded-[26px] border border-slate-100 bg-slate-50 p-8 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-500" />
                <p className="mt-3 text-sm font-black text-slate-500">טוען שיבוצים...</p>
              </div>
            ) : shifts.length === 0 ? (
              <div className="mt-6 rounded-[26px] border border-dashed border-indigo-200 bg-indigo-50/40 p-8 text-center">
                <Icon name="calendar" className="mx-auto h-10 w-10 text-indigo-300" />
                <h3 className="mt-3 text-lg font-black text-slate-800">אין שיבוצים לחודש הזה</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">ברגע שהאדמין ישבץ אותך, המשמרת תופיע כאן.</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {shifts.map((shift) => (
                  <article key={shift.id || `${shift.date}-${shift.scheduledStart}`} className="rounded-[26px] border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-slate-900">{formatDate(shift.date)} · {shift.dayName || ""}</p>
                        <p className="mt-1 flex items-center gap-1 text-sm font-black text-slate-700">
                          <Icon name="clock" className="h-4 w-4 text-indigo-500" />
                          {shift.scheduledStart || "—"} - {shift.scheduledEnd || "—"}
                        </p>
                      </div>

                      <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black ${shift.locationType === "home" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-violet-200 bg-violet-50 text-violet-700"}`}>
                        <Icon name={shift.locationType === "home" ? "home" : "building"} className="h-3.5 w-3.5" />
                        {shift.locationType === "home" ? "בית" : "אולם"}
                      </span>
                    </div>

                    <div className="mt-4 rounded-2xl bg-white p-3 text-sm font-bold leading-6 text-slate-600">
                      <p>
                        מיקום: <span className="font-black text-slate-900">{locationLabel(shift)}</span>
                      </p>
                      {shift.note ? <p className="mt-1">הערה: {shift.note}</p> : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
