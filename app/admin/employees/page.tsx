"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";

type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  idNumber: string;
  startDate: string;
  endDate: string;
  hourlyRate: number;
  role: string;
  status: string;
  updatedAt: string;
};

const API = {
  employees: "/api/admin/employees",
};

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function getMissingFields(employee: EmployeeRow) {
  const missing: string[] = [];

  if (!employee.name || employee.name === "עובד ללא שם") missing.push("שם");
  if (!employee.email) missing.push("מייל");
  if (!employee.phone) missing.push("טלפון");
  if (!employee.address) missing.push("כתובת");
  if (!employee.idNumber) missing.push("תעודת זהות");
  if (!employee.startDate) missing.push("תחילת העסקה");

  return missing;
}

function employmentStatusLabel(employee: EmployeeRow) {
  if (employee.endDate) return "סיים העסקה";
  return "פעיל";
}

function employmentStatusClass(employee: EmployeeRow) {
  if (employee.endDate) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function detailsStatusLabel(employee: EmployeeRow) {
  const missing = getMissingFields(employee);

  if (missing.length === 0) return "פרטים מלאים";

  return `חסר: ${missing.slice(0, 2).join(", ")}${
    missing.length > 2 ? "..." : ""
  }`;
}

function detailsStatusClass(employee: EmployeeRow) {
  const missing = getMissingFields(employee);

  if (missing.length === 0) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("") || "ע"
  );
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name:
    | "search"
    | "refresh"
    | "users"
    | "warning"
    | "open"
    | "template"
    | "mail"
    | "phone"
    | "id"
    | "sparkles";
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

  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
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

  if (name === "users") {
    return (
      <svg {...common}>
        <path d="M17 21a5 5 0 0 0-10 0" />
        <circle cx="12" cy="7" r="4" />
        <path d="M22 21a4 4 0 0 0-3-3.87" />
        <path d="M2 21a4 4 0 0 1 3-3.87" />
      </svg>
    );
  }

  if (name === "open") {
    return (
      <svg {...common}>
        <path d="M14 3h7v7" />
        <path d="M10 14 21 3" />
        <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
      </svg>
    );
  }

  if (name === "template") {
    return (
      <svg {...common}>
        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
        <path d="M14 2v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
      </svg>
    );
  }

  if (name === "mail") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg {...common}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 11.19 19 19.5 19.5 0 0 1 5 12.81 19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.62 2.61a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.47-1.14a2 2 0 0 1 2.11-.45c.84.29 1.71.5 2.61.62A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  }

  if (name === "id") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="M6.5 16a3 3 0 0 1 5 0" />
        <path d="M14 9h4" />
        <path d="M14 13h4" />
        <path d="M14 17h3" />
      </svg>
    );
  }

  if (name === "sparkles") {
    return (
      <svg {...common}>
        <path d="M12 3 9.8 8.8 4 11l5.8 2.2L12 19l2.2-5.8L20 11l-5.8-2.2L12 3z" />
        <path d="M5 3v4" />
        <path d="M3 5h4" />
        <path d="M19 17v4" />
        <path d="M17 19h4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m12 3 10 18H2L12 3z" />
      <path d="M12 9v5" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [detailsFilter, setDetailsFilter] = useState("");

  const loadEmployees = useCallback(async () => {
    try {
      setError("");
      setRefreshing(true);

      const data = await fetchJson(API.employees);

      const nextEmployees: EmployeeRow[] = Array.isArray(data.employees)
        ? data.employees
        : [];

      setEmployees(
        nextEmployees.map((employee) => ({
          id: cleanStr(employee.id),
          name: cleanStr(employee.name) || "עובד ללא שם",
          email: cleanStr(employee.email),
          phone: cleanStr(employee.phone),
          address: cleanStr(employee.address),
          idNumber: cleanStr(employee.idNumber),
          startDate: cleanStr(employee.startDate),
          endDate: cleanStr(employee.endDate),
          hourlyRate: Number(employee.hourlyRate || 0),
          role: cleanStr(employee.role),
          status: cleanStr(employee.status),
          updatedAt: cleanStr(employee.updatedAt),
        }))
      );
    } catch (loadError) {
      console.error("LOAD ADMIN EMPLOYEES FAILED:", loadError);
      setEmployees([]);
      setError(
        loadError instanceof Error ? loadError.message : "שגיאה בטעינת עובדים"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const missing = getMissingFields(employee);

      const matchesSearch =
        !q ||
        employee.name.toLowerCase().includes(q) ||
        employee.email.toLowerCase().includes(q) ||
        employee.phone.toLowerCase().includes(q) ||
        employee.address.toLowerCase().includes(q) ||
        employee.idNumber.toLowerCase().includes(q) ||
        employee.id.toLowerCase().includes(q);

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "active" && !employee.endDate) ||
        (statusFilter === "ended" && Boolean(employee.endDate));

      const matchesDetails =
        !detailsFilter ||
        (detailsFilter === "complete" && missing.length === 0) ||
        (detailsFilter === "missing" && missing.length > 0);

      return matchesSearch && matchesStatus && matchesDetails;
    });
  }, [employees, search, statusFilter, detailsFilter]);

  const stats = useMemo(() => {
    const active = employees.filter((employee) => !employee.endDate).length;
    const ended = employees.filter((employee) => employee.endDate).length;
    const complete = employees.filter(
      (employee) => getMissingFields(employee).length === 0
    ).length;
    const missing = employees.filter(
      (employee) => getMissingFields(employee).length > 0
    ).length;

    return {
      total: employees.length,
      active,
      ended,
      complete,
      missing,
    };
  }, [employees]);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 text-slate-900"
    >
      <div className="mx-auto w-full max-w-[1550px] space-y-6 p-4 md:p-6">
        <section className="overflow-hidden rounded-[34px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_60px_rgba(79,70,229,0.10)] backdrop-blur md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700">
                <Icon name="sparkles" className="h-4 w-4" />
                ניהול עובדים
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
                עובדים
              </h1>

              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-500 md:text-base">
                כאן מוצגת רשימת עובדים בלבד. הנתונים מסתנכרנים מתיק העובד:
                מייל, טלפון, כתובת, תעודת זהות, תחילת העסקה, סיום העסקה ושכר
                שעתי.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/employees/agreement-template"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-violet-500 to-indigo-500 px-5 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:scale-[1.01]"
              >
                <Icon name="template" className="h-4 w-4" />
                יצירת תבנית הסכם לעובדים
              </Link>

              <button
                type="button"
                onClick={() => void loadEmployees()}
                disabled={refreshing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon
                  name="refresh"
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                רענון
              </button>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-[26px] border border-indigo-100 bg-indigo-50 p-5">
              <p className="text-xs font-black text-indigo-500">סה״כ עובדים</p>
              <p className="mt-2 text-3xl font-black text-indigo-950">
                {stats.total}
              </p>
            </div>

            <div className="rounded-[26px] border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-xs font-black text-emerald-600">פעילים</p>
              <p className="mt-2 text-3xl font-black text-emerald-900">
                {stats.active}
              </p>
            </div>

            <div className="rounded-[26px] border border-rose-100 bg-rose-50 p-5">
              <p className="text-xs font-black text-rose-600">סיימו העסקה</p>
              <p className="mt-2 text-3xl font-black text-rose-900">
                {stats.ended}
              </p>
            </div>

            <div className="rounded-[26px] border border-sky-100 bg-sky-50 p-5">
              <p className="text-xs font-black text-sky-600">פרטים מלאים</p>
              <p className="mt-2 text-3xl font-black text-sky-900">
                {stats.complete}
              </p>
            </div>

            <div className="rounded-[26px] border border-amber-100 bg-amber-50 p-5">
              <p className="text-xs font-black text-amber-600">חסר מידע</p>
              <p className="mt-2 text-3xl font-black text-amber-900">
                {stats.missing}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-white/80 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="grid gap-3 xl:grid-cols-[1fr_220px_220px_auto]">
            <div className="relative">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="חיפוש לפי שם עובד, מייל, טלפון, כתובת, תעודת זהות או מזהה..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon name="search" className="h-5 w-5" />
              </span>
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            >
              <option value="">כל העובדים</option>
              <option value="active">פעילים</option>
              <option value="ended">סיימו העסקה</option>
            </select>

            <select
              value={detailsFilter}
              onChange={(event) => setDetailsFilter(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            >
              <option value="">כל הפרטים</option>
              <option value="complete">פרטים מלאים</option>
              <option value="missing">חסר מידע</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setDetailsFilter("");
              }}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50"
            >
              ניקוי
            </button>
          </div>
        </section>

        {loading ? (
          <section className="rounded-[34px] border border-white/80 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-500" />
            <p className="mt-4 text-sm font-black text-slate-600">
              טוען עובדים...
            </p>
          </section>
        ) : error ? (
          <section className="rounded-[34px] border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
            <Icon name="warning" className="mx-auto h-10 w-10 text-rose-600" />
            <h2 className="mt-4 text-xl font-black text-rose-700">
              לא הצלחנו לטעון את העובדים
            </h2>
            <p className="mt-2 text-sm font-bold text-rose-600">{error}</p>

            <button
              type="button"
              onClick={() => void loadEmployees()}
              className="mt-5 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white transition hover:bg-rose-700"
            >
              נסה שוב
            </button>
          </section>
        ) : filteredEmployees.length === 0 ? (
          <section className="rounded-[34px] border border-dashed border-indigo-200 bg-white/90 p-10 text-center shadow-sm">
            <Icon name="users" className="mx-auto h-12 w-12 text-indigo-300" />
            <h2 className="mt-4 text-xl font-black text-slate-800">
              אין עובדים להצגה
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              לא נמצאו עובדים או שאין התאמה לחיפוש/סינון.
            </p>
          </section>
        ) : (
          <section className="hidden overflow-hidden rounded-[34px] border border-white/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)] xl:block">
            <table className="w-full border-collapse text-right">
              <thead className="bg-slate-50/80">
                <tr className="text-sm text-slate-500">
                  <th className="px-5 py-4 font-black">עובד</th>
                  <th className="px-5 py-4 font-black">מייל</th>
                  <th className="px-5 py-4 font-black">טלפון</th>
                  <th className="px-5 py-4 font-black">כתובת</th>
                  <th className="px-5 py-4 font-black">תעודת זהות</th>
                  <th className="px-5 py-4 font-black">תחילת העסקה</th>
                  <th className="px-5 py-4 font-black">סיום העסקה</th>
                  <th className="px-5 py-4 font-black">שכר שעתי</th>
                  <th className="px-5 py-4 font-black">סטטוס</th>
                  <th className="px-5 py-4 font-black">תיק עובד</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="transition hover:bg-indigo-50/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-fuchsia-100 text-sm font-black text-indigo-700 ring-1 ring-indigo-100">
                          {initials(employee.name)}
                        </div>

                        <div>
                          <p className="font-black text-slate-900">
                            {employee.name}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-400">
                            ID: {employee.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <Icon name="mail" className="h-4 w-4 text-slate-400" />
                        <span className="max-w-[220px] truncate">
                          {employee.email || "—"}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <Icon name="phone" className="h-4 w-4 text-slate-400" />
                        <span dir="ltr">{employee.phone || "—"}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm font-bold text-slate-700">
                      <span className="block max-w-[210px] truncate">
                        {employee.address || "—"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <Icon name="id" className="h-4 w-4 text-slate-400" />
                        <span dir="ltr">{employee.idNumber || "—"}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm font-black text-slate-700">
                      {formatDate(employee.startDate)}
                    </td>

                    <td className="px-5 py-4 text-sm font-black text-slate-700">
                      {formatDate(employee.endDate)}
                    </td>

                    <td className="px-5 py-4 text-sm font-black text-slate-700">
                      {employee.hourlyRate > 0
                        ? formatMoney(employee.hourlyRate)
                        : "—"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2">
                        <span
                          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black ${employmentStatusClass(
                            employee
                          )}`}
                        >
                          {employmentStatusLabel(employee)}
                        </span>

                        <span
                          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black ${detailsStatusClass(
                            employee
                          )}`}
                        >
                          {detailsStatusLabel(employee)}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/employees/${encodeURIComponent(
                          employee.id
                        )}`}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-indigo-500 to-violet-500 px-4 text-xs font-black text-white shadow-md shadow-indigo-100 transition hover:scale-[1.02]"
                      >
                        <Icon name="open" className="h-3.5 w-3.5" />
                        תיק עובד
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}