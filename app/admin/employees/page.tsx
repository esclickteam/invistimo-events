"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  EMPLOYEE_AGREEMENT_TEMPLATE_TYPES,
  type EmployeeAgreementTemplateType,
  TEMPLATE_TYPE_LABELS,
} from "@/lib/employeeAgreementTemplateTypes";

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
  staffType?: string;
  type?: string;
  userType?: string;
  status: string;
  updatedAt: string;
  isEmployee?: boolean;
  employee?: boolean;
  isStaff?: boolean;
  staff?: boolean;
};

const API = {
  employees: "/api/admin/employees",
  payrollReport: "/api/admin/employees/payroll-report",
};

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanLower(value: unknown) {
  return cleanStr(value).toLowerCase();
}

function getCurrentMonthValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getPayrollFileName(monthValue: string) {
  const [year, month] = monthValue.split("-");

  if (!year || !month) {
    return "דוח_משכורת_חודשי.xlsx";
  }

  return `דוח_משכורת_חודשי_${month}_${year}.xlsx`;
}

function isRealEmployee(employee: EmployeeRow) {
  const role = cleanLower(employee.role);
  const staffType = cleanLower(employee.staffType);
  const type = cleanLower(employee.type);
  const userType = cleanLower(employee.userType);

  const blockedValues = [
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

  if (blockedValues.includes(role)) return false;
  if (blockedValues.includes(staffType)) return false;
  if (blockedValues.includes(type)) return false;
  if (blockedValues.includes(userType)) return false;

  const allowedValues = [
    "staff",
    "employee",
    "worker",
    "representative",
    "sales",
    "caller",
    "call_agent",
    "phone_agent",
    "support",
  ];

  if (allowedValues.includes(role)) return true;
  if (allowedValues.includes(staffType)) return true;
  if (allowedValues.includes(type)) return true;
  if (allowedValues.includes(userType)) return true;

  if (employee.isEmployee === true) return true;
  if (employee.employee === true) return true;
  if (employee.isStaff === true) return true;
  if (employee.staff === true) return true;

  return false;
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
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;

  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
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
    | "sparkles"
    | "download"
    | "calendar"
    | "chevronDown";
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

  if (name === "download") {
    return (
      <svg {...common}>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <path d="M3 10h18" />
      </svg>
    );
  }

  if (name === "chevronDown") {
    return (
      <svg {...common}>
        <path d="m6 9 6 6 6-6" />
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
  const [exportingPayroll, setExportingPayroll] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [detailsFilter, setDetailsFilter] = useState("");
  const [payrollMonth, setPayrollMonth] = useState(getCurrentMonthValue());
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const templateMenuRef = useRef<HTMLDivElement | null>(null);

  const loadEmployees = useCallback(async () => {
    try {
      setError("");
      setRefreshing(true);

      const data = await fetchJson(API.employees);

      const nextEmployees: EmployeeRow[] = Array.isArray(data.employees)
        ? data.employees
        : [];

      setEmployees(
        nextEmployees
          .map((employee) => ({
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
            staffType: cleanStr(employee.staffType),
            type: cleanStr(employee.type),
            userType: cleanStr(employee.userType),
            status: cleanStr(employee.status),
            updatedAt: cleanStr(employee.updatedAt),
            isEmployee: Boolean(employee.isEmployee),
            employee: Boolean(employee.employee),
            isStaff: Boolean(employee.isStaff),
            staff: Boolean(employee.staff),
          }))
          .filter(isRealEmployee)
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

  const handleExportPayrollReport = useCallback(async () => {
    if (!payrollMonth) {
      alert("צריך לבחור חודש לדוח המשכורת");
      return;
    }

    try {
      setExportingPayroll(true);

      const url = `${API.payrollReport}?month=${encodeURIComponent(
        payrollMonth
      )}`;

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          const data = await response.json().catch(() => null);
          throw new Error(
            data?.error || data?.message || "שגיאה בייצוא דוח משכורת"
          );
        }

        const text = await response.text().catch(() => "");
        throw new Error(text || "שגיאה בייצוא דוח משכורת");
      }

      const blob = await response.blob();

      if (!blob || blob.size === 0) {
        throw new Error("הקובץ שהתקבל ריק");
      }

      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = getPayrollFileName(payrollMonth);
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(objectUrl);
    } catch (exportError) {
      console.error("EXPORT PAYROLL REPORT FAILED:", exportError);
      alert(
        exportError instanceof Error
          ? exportError.message
          : "שגיאה בייצוא דוח משכורת"
      );
    } finally {
      setExportingPayroll(false);
    }
  }, [payrollMonth]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    if (!templateMenuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        templateMenuRef.current &&
        !templateMenuRef.current.contains(event.target as Node)
      ) {
        setTemplateMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [templateMenuOpen]);

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
    <div dir="rtl" className="admin-content w-full min-w-0 max-w-none space-y-3 text-[var(--admin-text)]">
      <div className="w-full min-w-0 max-w-none space-y-3">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <p className="text-xs font-medium text-[var(--admin-muted)]">
            {stats.total} עובדים · {stats.active} פעילים · {stats.missing} חסר
            מידע
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/forms/101/mapper"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] bg-white px-3 text-xs font-bold text-[var(--admin-text)]"
            >
              <Icon name="template" className="h-3.5 w-3.5" />
              תבנית טופס 101
            </Link>

            <div ref={templateMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setTemplateMenuOpen((open) => !open)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--admin-radius-sm)] bg-[var(--admin-brand)] px-3 text-xs font-bold text-white"
              >
                <Icon name="template" className="h-3.5 w-3.5" />
                תבנית הסכם
                <Icon
                  name="chevronDown"
                  className={`h-3.5 w-3.5 transition ${templateMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {templateMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-white p-2 shadow-md">
                  {(
                    Object.values(
                      EMPLOYEE_AGREEMENT_TEMPLATE_TYPES
                    ) as EmployeeAgreementTemplateType[]
                  ).map((type) => (
                    <Link
                      key={type}
                      href={`/admin/employees/agreement-template?type=${encodeURIComponent(type)}`}
                      onClick={() => setTemplateMenuOpen(false)}
                      className="block rounded-[var(--admin-radius-sm)] px-3 py-2 text-xs font-bold text-[var(--admin-text)] hover:bg-gray-50"
                    >
                      {TEMPLATE_TYPE_LABELS[type]}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <label className="inline-flex h-9 items-center gap-2 rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] bg-white px-2 text-xs font-bold">
              <input
                type="month"
                value={payrollMonth}
                onChange={(event) => setPayrollMonth(event.target.value)}
                className="bg-transparent outline-none"
              />
            </label>

            <button
              type="button"
              onClick={() => void handleExportPayrollReport()}
              disabled={exportingPayroll || !payrollMonth}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] bg-white px-3 text-xs font-bold disabled:opacity-50"
            >
              <Icon
                name={exportingPayroll ? "refresh" : "download"}
                className={`h-3.5 w-3.5 ${exportingPayroll ? "animate-spin" : ""}`}
              />
              {exportingPayroll ? "מייצא..." : "דוח משכורת"}
            </button>

            <button
              type="button"
              onClick={() => void loadEmployees()}
              disabled={refreshing}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] bg-white px-3 text-xs font-bold disabled:opacity-50"
            >
              <Icon
                name="refresh"
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              רענון
            </button>
          </div>
        </div>

        <div className="admin-filter-bar flex w-full min-w-0 flex-col gap-2 border-b border-[var(--admin-border)] pb-3 xl:flex-row xl:items-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="חיפוש לפי שם, מייל, טלפון, כתובת, ת״ז או מזהה..."
            className="admin-input h-10 min-w-0 flex-1"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="admin-select h-10 w-full xl:w-[180px]"
          >
            <option value="">כל העובדים</option>
            <option value="active">פעילים</option>
            <option value="ended">סיימו העסקה</option>
          </select>

          <select
            value={detailsFilter}
            onChange={(event) => setDetailsFilter(event.target.value)}
            className="admin-select h-10 w-full xl:w-[180px]"
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
            className="h-10 rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] bg-white px-4 text-xs font-bold"
          >
            ניקוי
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center text-sm font-semibold text-[var(--admin-muted)]">
            טוען עובדים…
          </div>
        ) : error ? (
          <div className="rounded-[var(--admin-radius)] border border-rose-200 bg-rose-50 p-6 text-center">
            <p className="text-sm font-bold text-rose-700">{error}</p>
            <button
              type="button"
              onClick={() => void loadEmployees()}
              className="mt-4 inline-flex h-9 items-center rounded-[var(--admin-radius-sm)] bg-rose-600 px-4 text-xs font-bold text-white"
            >
              נסה שוב
            </button>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="rounded-[var(--admin-radius)] border border-dashed border-[var(--admin-border)] bg-white px-4 py-10 text-center text-sm font-semibold text-[var(--admin-muted)]">
            אין עובדים להצגה
          </div>
        ) : (
          <div className="admin-table-region w-full min-w-0">
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>עובד</th>
                    <th>מייל</th>
                    <th>טלפון</th>
                    <th>כתובת</th>
                    <th>תעודת זהות</th>
                    <th>תחילת העסקה</th>
                    <th>סיום העסקה</th>
                    <th>שכר שעתי</th>
                    <th>סטטוס</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <span
                          className="cell-clip font-bold"
                          title={employee.name}
                        >
                          {employee.name}
                        </span>
                      </td>
                      <td>
                        <span
                          className="cell-clip-wide text-[var(--admin-muted)]"
                          title={employee.email || ""}
                        >
                          {employee.email || "—"}
                        </span>
                      </td>
                      <td dir="ltr">{employee.phone || "—"}</td>
                      <td>
                        <span
                          className="cell-clip"
                          title={employee.address || ""}
                        >
                          {employee.address || "—"}
                        </span>
                      </td>
                      <td dir="ltr">{employee.idNumber || "—"}</td>
                      <td>{formatDate(employee.startDate)}</td>
                      <td>{formatDate(employee.endDate)}</td>
                      <td className="font-bold">
                        {employee.hourlyRate > 0
                          ? formatMoney(employee.hourlyRate)
                          : "—"}
                      </td>
                      <td>
                        <span
                          className={`admin-row-badge ${employmentStatusClass(
                            employee
                          )}`}
                          title={detailsStatusLabel(employee)}
                        >
                          {employmentStatusLabel(employee)}
                        </span>
                      </td>
                      <td className="admin-actions-cell">
                        <Link
                          href={`/admin/employees/${encodeURIComponent(
                            employee.id
                          )}`}
                          className="inline-flex h-8 items-center justify-center rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] bg-white px-2.5 text-xs font-bold hover:bg-gray-50"
                        >
                          תיק עובד
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-table-footer">
              <span>
                מוצגים {filteredEmployees.length} מתוך {stats.total}
              </span>
              <span>
                פעילים {stats.active} · סיימו {stats.ended} · מלאים{" "}
                {stats.complete}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}