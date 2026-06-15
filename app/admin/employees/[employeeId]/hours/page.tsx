"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

export const dynamic = "force-dynamic";

type EmployeeProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  hourlyRate?: number;
};

type EmployeeHoursRow = {
  id: string;
  date: string;
  dayName: string;
  isScheduled: boolean;
  shiftLabel: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string;
  actualEnd: string;
  totalMinutes: number;
  note: string;
  status: string;
};

type EmployeeHoursSummary = {
  month: string;
  totalMinutes: number;
  scheduledDays: number;
  workedDays: number;
  status: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string;
};

const API = {
  profile: (employeeId: string) =>
    `/api/admin/employees/${encodeURIComponent(employeeId)}/profile`,

  hours: (employeeId: string, month: string) =>
    `/api/admin/employees/${encodeURIComponent(
      employeeId
    )}/hours?month=${encodeURIComponent(month)}`,
};

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
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

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;

  return new Date(year, month - 1, 1).toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });
}

function minutesBetween(start?: string, end?: string) {
  if (!start || !end) return 0;

  const normalizedStart = start.length === 5 ? `1970-01-01T${start}:00` : start;
  const normalizedEnd = end.length === 5 ? `1970-01-01T${end}:00` : end;

  const startDate = new Date(normalizedStart);
  const endDate = new Date(normalizedEnd);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0;
  }

  return Math.max(
    0,
    Math.round((endDate.getTime() - startDate.getTime()) / 60000)
  );
}

function formatWorkDuration(minutes?: number) {
  const value = Math.max(0, Math.round(Number(minutes || 0)));
  const hours = Math.floor(value / 60);
  const remainingMinutes = value % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours} שעות ו-${remainingMinutes} דק׳`;
  }

  if (hours > 0) return `${hours} שעות`;
  if (remainingMinutes > 0) return `${remainingMinutes} דק׳`;

  return "0 שעות";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function statusLabel(status?: string) {
  switch (String(status || "").toLowerCase()) {
    case "approved":
      return "מאושר";
    case "rejected":
      return "נדחה";
    case "submitted":
      return "הוגש לאישור";
    case "draft":
      return "טיוטה";
    default:
      return "טיוטה";
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeFileName(value: string) {
  return cleanStr(value)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name:
    | "arrow"
    | "refresh"
    | "check"
    | "x"
    | "clock"
    | "print"
    | "save"
    | "warning"
    | "excel"
    | "money"
    | "file";
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

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m20 6-11 11-5-5" />
      </svg>
    );
  }

  if (name === "x") {
    return (
      <svg {...common}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
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

  if (name === "print") {
    return (
      <svg {...common}>
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v8H6z" />
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

  if (name === "excel") {
    return (
      <svg {...common}>
        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
        <path d="M14 2v5h5" />
        <path d="m9 11 6 6" />
        <path d="m15 11-6 6" />
      </svg>
    );
  }

  if (name === "money") {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M7 12h.01" />
        <path d="M17 12h.01" />
      </svg>
    );
  }

  if (name === "file") {
    return (
      <svg {...common}>
        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
        <path d="M14 2v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
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

export default function AdminEmployeeHoursPage() {
  const params = useParams();
  const employeeId = decodeURIComponent(getParamValue(params?.employeeId as any));

  const [employee, setEmployee] = useState<EmployeeProfile>({
    id: employeeId,
    name: "",
    email: "",
    phone: "",
    hourlyRate: 0,
  });

  const [month, setMonth] = useState(getCurrentMonthKey());
  const [hoursRows, setHoursRows] = useState<EmployeeHoursRow[]>([]);
  const [hoursSummary, setHoursSummary] = useState<EmployeeHoursSummary>({
    month: getCurrentMonthKey(),
    totalMinutes: 0,
    scheduledDays: 0,
    workedDays: 0,
    status: "draft",
  });

  const [loading, setLoading] = useState(true);
  const [hoursLoading, setHoursLoading] = useState(true);
  const [savingHours, setSavingHours] = useState(false);
  const [error, setError] = useState("");

  const hourlyRate = Number(employee.hourlyRate || 0);

  const totalMinutes = useMemo(
    () =>
      hoursRows.reduce((sum, row) => sum + Number(row.totalMinutes || 0), 0),
    [hoursRows]
  );

  const totalHoursDecimal = useMemo(() => totalMinutes / 60, [totalMinutes]);

  const totalSalary = useMemo(
    () => totalHoursDecimal * hourlyRate,
    [totalHoursDecimal, hourlyRate]
  );

  const workedDays = useMemo(
    () =>
      hoursRows.filter(
        (row) => row.actualStart || row.actualEnd || row.totalMinutes > 0
      ).length,
    [hoursRows]
  );

  const loadEmployee = useCallback(async () => {
    if (!employeeId) return;

    const data = await fetchJson(API.profile(employeeId));
    const profile = data.employee || {};

    setEmployee({
      id: employeeId,
      name: cleanStr(profile.name) || "עובד ללא שם",
      email: cleanStr(profile.email),
      phone: cleanStr(profile.phone),
      hourlyRate: Number(profile.hourlyRate || 0),
    });
  }, [employeeId]);

  const loadHours = useCallback(async () => {
    if (!employeeId) return;

    try {
      setHoursLoading(true);

      const data = await fetchJson(API.hours(employeeId, month));

      if (process.env.NODE_ENV !== "production") {
        console.log("HOURS DEBUG:", data?.debug || null);
      }

      const rows = Array.isArray(data?.rows) ? data.rows : [];
      const summary = data?.summary || {};

      setHoursRows(
        rows.map((row: any) => ({
          id: cleanStr(row.id || row._id) || cleanStr(row.date),
          date: cleanStr(row.date),
          dayName: cleanStr(row.dayName),
          isScheduled: Boolean(row.isScheduled),
          shiftLabel: cleanStr(row.shiftLabel) || "לא משובץ",
          scheduledStart: cleanStr(row.scheduledStart),
          scheduledEnd: cleanStr(row.scheduledEnd),
          actualStart: cleanStr(row.actualStart),
          actualEnd: cleanStr(row.actualEnd),
          totalMinutes: Number(row.totalMinutes || 0),
          note: cleanStr(row.note),
          status: cleanStr(row.status) || "draft",
        }))
      );

      setHoursSummary({
        month: cleanStr(summary.month) || month,
        totalMinutes: Number(summary.totalMinutes || 0),
        scheduledDays: Number(summary.scheduledDays || 0),
        workedDays: Number(summary.workedDays || 0),
        status: cleanStr(summary.status) || "draft",
        submittedAt: summary.submittedAt || null,
        approvedAt: summary.approvedAt || null,
        rejectedAt: summary.rejectedAt || null,
        rejectionReason: cleanStr(summary.rejectionReason),
      });
    } catch (loadError) {
      console.error("LOAD ADMIN EMPLOYEE HOURS FAILED:", loadError);
      alert(
        loadError instanceof Error
          ? loadError.message
          : "שגיאה בטעינת שעות העובד"
      );
    } finally {
      setHoursLoading(false);
    }
  }, [employeeId, month]);

  const loadPage = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      await loadEmployee();
      await loadHours();
    } catch (loadError) {
      console.error("LOAD EMPLOYEE HOURS PAGE FAILED:", loadError);
      setError(
        loadError instanceof Error ? loadError.message : "שגיאה בטעינת עמוד שעות"
      );
    } finally {
      setLoading(false);
    }
  }, [loadEmployee, loadHours]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (!loading) void loadHours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function saveHourlyRate() {
    const response = await fetch(API.profile(employeeId), {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hourlyRate,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      throw new Error(data?.error || "שגיאה בשמירת שכר שעתי");
    }

    setEmployee((prev) => ({
      ...prev,
      hourlyRate: Number(data.employee?.hourlyRate || hourlyRate),
    }));
  }

  function updateHourRow(
    date: string,
    field: "actualStart" | "actualEnd" | "note",
    value: string
  ) {
    setHoursRows((prev) =>
      prev.map((row) => {
        if (row.date !== date) return row;

        const next = {
          ...row,
          [field]: value,
        };

        if (field === "actualStart" || field === "actualEnd") {
          next.totalMinutes = minutesBetween(next.actualStart, next.actualEnd);
        }

        return next;
      })
    );
  }

  async function saveHours(action: "save" | "approve" | "reject" = "save") {
    if (!employeeId || savingHours) return;

    try {
      setSavingHours(true);

      await saveHourlyRate();

      const response = await fetch(`/api/admin/employees/${employeeId}/hours`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month,
          action,
          rows: hoursRows,
          hourlyRate,
          totalSalary,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "שגיאה בשמירת שעות");
      }

      setHoursSummary(data.summary);
      setHoursRows(data.rows);

      alert(
        action === "approve"
          ? "השעות אושרו בהצלחה"
          : action === "reject"
          ? "השעות נדחו"
          : "השעות נשמרו בהצלחה"
      );
    } catch (saveError) {
      console.error("SAVE ADMIN HOURS FAILED:", saveError);
      alert(saveError instanceof Error ? saveError.message : "שגיאה בשמירת שעות");
    } finally {
      setSavingHours(false);
    }
  }

  function exportPdfForAccountant() {
    window.print();
  }

  function exportExcelForAccountant() {
    const rowsHtml = hoursRows
      .map((row) => {
        const rowHours = Number(row.totalMinutes || 0) / 60;
        const dailySalary = rowHours * hourlyRate;

        return `
          <tr>
            <td>${escapeHtml(formatDate(row.date))}</td>
            <td>${escapeHtml(row.dayName || "—")}</td>
            <td>${escapeHtml(
              row.isScheduled ? row.shiftLabel || "משובץ" : "לא משובץ"
            )}</td>
            <td>${escapeHtml(row.scheduledStart || "—")}</td>
            <td>${escapeHtml(row.scheduledEnd || "—")}</td>
            <td>${escapeHtml(row.actualStart || "—")}</td>
            <td>${escapeHtml(row.actualEnd || "—")}</td>
            <td>${escapeHtml(row.totalMinutes || 0)}</td>
            <td>${escapeHtml(rowHours.toFixed(2))}</td>
            <td>${escapeHtml(hourlyRate.toFixed(2))}</td>
            <td>${escapeHtml(dailySalary.toFixed(2))}</td>
            <td>${escapeHtml(row.note || "")}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <style>
            body {
              direction: rtl;
              font-family: Arial, sans-serif;
            }

            table {
              border-collapse: collapse;
              width: 100%;
            }

            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px;
              text-align: right;
              mso-number-format:"\\@";
            }

            th {
              background: #eef2ff;
              font-weight: 700;
            }

            .summary td {
              background: #f8fafc;
              font-weight: 700;
            }
          </style>
        </head>

        <body>
          <h2>דוח שעות עובד לרואה חשבון</h2>

          <table>
            <tr class="summary">
              <td>עובד</td>
              <td>${escapeHtml(employee.name || "—")}</td>
              <td>מייל</td>
              <td>${escapeHtml(employee.email || "—")}</td>
            </tr>

            <tr class="summary">
              <td>טלפון</td>
              <td>${escapeHtml(employee.phone || "—")}</td>
              <td>חודש</td>
              <td>${escapeHtml(monthLabel(month))}</td>
            </tr>

            <tr class="summary">
              <td>סה״כ שעות</td>
              <td>${escapeHtml(totalHoursDecimal.toFixed(2))}</td>
              <td>שכר שעתי</td>
              <td>${escapeHtml(hourlyRate.toFixed(2))}</td>
            </tr>

            <tr class="summary">
              <td>סה״כ לתשלום משוער</td>
              <td>${escapeHtml(totalSalary.toFixed(2))}</td>
              <td>סטטוס</td>
              <td>${escapeHtml(statusLabel(hoursSummary.status))}</td>
            </tr>
          </table>

          <br />

          <table>
            <thead>
              <tr>
                <th>תאריך</th>
                <th>יום</th>
                <th>שיבוץ</th>
                <th>תחילת משמרת מתוכננת</th>
                <th>סיום משמרת מתוכנן</th>
                <th>כניסה בפועל</th>
                <th>יציאה בפועל</th>
                <th>סה״כ דקות</th>
                <th>סה״כ שעות</th>
                <th>שכר שעתי</th>
                <th>סכום יומי משוער</th>
                <th>הערות</th>
              </tr>
            </thead>

            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `דוח-שעות-${safeFileName(employee.name || employeeId)}-${month}.xls`;
    a.click();

    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-8 text-slate-900"
      >
        <div className="mx-auto max-w-[1500px] rounded-[32px] border border-white bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-500" />
          <p className="mt-4 text-sm font-black text-slate-700">
            טוען שעות עובד...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-8 text-slate-900"
      >
        <div className="mx-auto max-w-[1500px] rounded-[32px] border border-rose-200 bg-rose-50 p-10 text-center shadow-sm">
          <Icon name="warning" className="mx-auto h-10 w-10 text-rose-600" />
          <h1 className="mt-4 text-xl font-black text-rose-700">
            לא הצלחנו לפתוח שעות עובד
          </h1>
          <p className="mt-2 text-sm font-bold text-rose-600">{error}</p>

          <Link
            href={`/admin/employees/${encodeURIComponent(employeeId)}`}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-indigo-600 px-5 text-sm font-black text-white"
          >
            חזרה לתיק עובד
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 text-slate-900"
    >
      <style>{`
        .print-only-report {
          display: none;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 4mm;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background: #fff !important;
            overflow: visible !important;
            direction: rtl !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          #employee-hours-print,
          #employee-hours-print * {
            visibility: visible !important;
          }

          #employee-hours-print {
            position: absolute !important;
            top: 0 !important;
            right: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          .no-print,
          .screen-only-report {
            display: none !important;
          }

          .print-only-report {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          .print-title {
            margin: 0 0 4px 0 !important;
            font-size: 15px !important;
            font-weight: 900 !important;
            text-align: center !important;
            color: #0f172a !important;
          }

          .print-subtitle {
            margin: 0 0 6px 0 !important;
            font-size: 9px !important;
            font-weight: 700 !important;
            text-align: center !important;
            color: #334155 !important;
          }

          .print-summary-table,
          .print-hours-table {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            direction: rtl !important;
          }

          .print-summary-table {
            margin-bottom: 6px !important;
            font-size: 8px !important;
          }

          .print-hours-table {
            font-size: 7px !important;
          }

          .print-summary-table th,
          .print-summary-table td,
          .print-hours-table th,
          .print-hours-table td {
            border: 1px solid #cbd5e1 !important;
            padding: 3px !important;
            text-align: right !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            line-height: 1.18 !important;
            vertical-align: middle !important;
          }

          .print-summary-table th,
          .print-hours-table th {
            background: #eef2ff !important;
            font-weight: 900 !important;
            color: #1e293b !important;
          }

          .print-hours-table tr {
            page-break-inside: avoid !important;
          }

          .print-hours-table th:nth-child(1),
          .print-hours-table td:nth-child(1) {
            width: 8.5% !important;
          }

          .print-hours-table th:nth-child(2),
          .print-hours-table td:nth-child(2) {
            width: 8% !important;
          }

          .print-hours-table th:nth-child(3),
          .print-hours-table td:nth-child(3) {
            width: 8.5% !important;
          }

          .print-hours-table th:nth-child(4),
          .print-hours-table td:nth-child(4) {
            width: 9% !important;
          }

          .print-hours-table th:nth-child(5),
          .print-hours-table td:nth-child(5) {
            width: 9% !important;
          }

          .print-hours-table th:nth-child(6),
          .print-hours-table td:nth-child(6) {
            width: 9% !important;
          }

          .print-hours-table th:nth-child(7),
          .print-hours-table td:nth-child(7) {
            width: 8.5% !important;
          }

          .print-hours-table th:nth-child(8),
          .print-hours-table td:nth-child(8) {
            width: 8.5% !important;
          }

          .print-hours-table th:nth-child(9),
          .print-hours-table td:nth-child(9) {
            width: 31% !important;
          }
        }
      `}</style>

      <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-6">
        <section className="no-print rounded-[34px] border border-white bg-white p-6 shadow-[0_18px_55px_rgba(16,185,129,0.10)] md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link
                href={`/admin/employees/${encodeURIComponent(employeeId)}`}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700 transition hover:bg-indigo-100"
              >
                <Icon name="arrow" className="h-4 w-4" />
                חזרה לתיק עובד
              </Link>

              <div className="mt-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                  <Icon name="clock" className="h-4 w-4" />
                  שעות עובד
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
                  שעות עובד
                </h1>

                <p className="mt-2 text-lg font-black text-slate-500">
                  {employee.name || "עובד ללא שם"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportPdfForAccountant}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-black text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700"
              >
                <Icon name="print" className="h-4 w-4" />
                PDF לרו״ח
              </button>

              <button
                type="button"
                onClick={exportExcelForAccountant}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-black text-white shadow-md shadow-emerald-100 transition hover:bg-emerald-600"
              >
                <Icon name="excel" className="h-4 w-4" />
                Excel לרו״ח
              </button>
            </div>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-5">
            <div className="rounded-[24px] border border-indigo-100 bg-indigo-50 p-4">
              <p className="text-xs font-black text-indigo-600">מייל</p>
              <p className="mt-2 break-all text-sm font-black text-slate-800">
                {employee.email || "—"}
              </p>
            </div>

            <div className="rounded-[24px] border border-sky-100 bg-sky-50 p-4">
              <p className="text-xs font-black text-sky-600">טלפון</p>
              <p
                dir="ltr"
                className="mt-2 text-right text-sm font-black text-slate-800"
              >
                {employee.phone || "—"}
              </p>
            </div>

            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-black text-emerald-600">סה״כ שעות</p>
              <p className="mt-2 text-sm font-black text-slate-800">
                {formatWorkDuration(totalMinutes)}
              </p>
            </div>

            <div className="rounded-[24px] border border-violet-100 bg-violet-50 p-4">
              <p className="text-xs font-black text-violet-600">שכר שעתי</p>
              <p className="mt-2 text-sm font-black text-slate-800">
                {formatMoney(hourlyRate)}
              </p>
            </div>

            <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-black text-amber-600">תשלום משוער</p>
              <p className="mt-2 text-sm font-black text-slate-800">
                {formatMoney(totalSalary)}
              </p>
            </div>
          </div>
        </section>

        <section
          id="employee-hours-print"
          className="rounded-[34px] border border-white bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] md:p-6"
        >
          <div className="print-only-report">
            <h1 className="print-title">דוח שעות עובד לרואה חשבון</h1>

            <p className="print-subtitle">
              {monthLabel(month)} · עובד/ת: {employee.name || "—"} · מייל:{" "}
              {employee.email || "—"} · טלפון: {employee.phone || "—"} · סטטוס:{" "}
              {statusLabel(hoursSummary.status)}
            </p>

            <table className="print-summary-table">
              <tbody>
                <tr>
                  <th>סה״כ שעות</th>
                  <td>{totalHoursDecimal.toFixed(2)}</td>
                  <th>שכר שעתי</th>
                  <td>{formatMoney(hourlyRate)}</td>
                  <th>תשלום משוער</th>
                  <td>{formatMoney(totalSalary)}</td>
                  <th>ימי עבודה</th>
                  <td>{workedDays}</td>
                </tr>
              </tbody>
            </table>

            <table className="print-hours-table">
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>יום</th>
                  <th>שיבוץ</th>
                  <th>מתוכנן</th>
                  <th>כניסה בפועל</th>
                  <th>יציאה בפועל</th>
                  <th>סה״כ שעות</th>
                  <th>סכום יומי</th>
                  <th>הערות</th>
                </tr>
              </thead>

              <tbody>
                {hoursRows.map((row) => {
                  const dailySalary =
                    (Number(row.totalMinutes || 0) / 60) * hourlyRate;

                  return (
                    <tr key={`print-${row.date}`}>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.dayName || "—"}</td>
                      <td>{row.isScheduled ? row.shiftLabel || "משובץ" : "לא משובץ"}</td>
                      <td>
                        {row.scheduledStart || "—"} - {row.scheduledEnd || "—"}
                      </td>
                      <td>{row.actualStart || "—"}</td>
                      <td>{row.actualEnd || "—"}</td>
                      <td>{formatWorkDuration(row.totalMinutes)}</td>
                      <td>{formatMoney(dailySalary)}</td>
                      <td>{row.note || ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="screen-only-report">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Icon name="clock" className="h-6 w-6 text-emerald-500" />
                  <h2 className="text-xl font-black text-slate-900">
                    שעות עבודה — {monthLabel(month)}
                  </h2>
                </div>

                <p className="mt-2 text-sm font-semibold text-slate-500">
                  עובד/ת: {employee.name || "—"} · מייל: {employee.email || "—"} ·
                  טלפון: {employee.phone || "—"}
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  סטטוס:{" "}
                  <span className="font-black text-slate-900">
                    {statusLabel(hoursSummary.status)}
                  </span>{" "}
                  · שעות:{" "}
                  <span className="font-black text-slate-900">
                    {formatWorkDuration(totalMinutes)}
                  </span>{" "}
                  · שכר שעתי:{" "}
                  <span className="font-black text-slate-900">
                    {formatMoney(hourlyRate)}
                  </span>{" "}
                  · תשלום משוער:{" "}
                  <span className="font-black text-slate-900">
                    {formatMoney(totalSalary)}
                  </span>
                </p>
              </div>

              <div className="no-print flex flex-wrap gap-2">
                <input
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={employee.hourlyRate || ""}
                  onChange={(event) =>
                    setEmployee((prev) => ({
                      ...prev,
                      hourlyRate: Number(event.target.value || 0),
                    }))
                  }
                  placeholder="שכר שעתי"
                  className="h-11 w-36 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-900 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                />

                <button
                  type="button"
                  onClick={() => void loadHours()}
                  disabled={hoursLoading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 disabled:opacity-50"
                >
                  <Icon
                    name="refresh"
                    className={`h-4 w-4 ${hoursLoading ? "animate-spin" : ""}`}
                  />
                  רענון
                </button>

                <button
                  type="button"
                  onClick={() => void saveHours("save")}
                  disabled={savingHours}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Icon name="save" className="h-4 w-4" />
                  שמירה
                </button>

                <button
                  type="button"
                  onClick={() => void saveHours("approve")}
                  disabled={savingHours}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-black text-white transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  <Icon name="check" className="h-4 w-4" />
                  אישור שעות
                </button>

                <button
                  type="button"
                  onClick={() => void saveHours("reject")}
                  disabled={savingHours}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 text-sm font-black text-white transition hover:bg-rose-600 disabled:opacity-50"
                >
                  <Icon name="x" className="h-4 w-4" />
                  דחייה
                </button>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-[24px] border border-slate-200">
              <table className="w-full min-w-[1250px] border-collapse text-right">
                <thead className="bg-slate-50">
                  <tr className="text-xs text-slate-500">
                    <th className="px-4 py-3 font-black">תאריך</th>
                    <th className="px-4 py-3 font-black">יום</th>
                    <th className="px-4 py-3 font-black">שיבוץ</th>
                    <th className="px-4 py-3 font-black">מתוכנן</th>
                    <th className="px-4 py-3 font-black">כניסה בפועל</th>
                    <th className="px-4 py-3 font-black">יציאה בפועל</th>
                    <th className="px-4 py-3 font-black">סה״כ שעות</th>
                    <th className="px-4 py-3 font-black">סכום יומי</th>
                    <th className="px-4 py-3 font-black">הערות</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {hoursLoading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-10 text-center text-sm font-black text-slate-500"
                      >
                        טוען שעות...
                      </td>
                    </tr>
                  ) : (
                    hoursRows.map((row) => {
                      const dailySalary =
                        (Number(row.totalMinutes || 0) / 60) * hourlyRate;

                      return (
                        <tr key={row.date} className="hover:bg-emerald-50/30">
                          <td className="px-4 py-3 text-sm font-black text-slate-800">
                            {formatDate(row.date)}
                          </td>

                          <td className="px-4 py-3 text-sm font-bold text-slate-600">
                            {row.dayName || "—"}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-black ${
                                row.isScheduled
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : "border-slate-200 bg-slate-50 text-slate-500"
                              }`}
                            >
                              {row.shiftLabel || "לא משובץ"}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-sm font-bold text-slate-600">
                            {row.scheduledStart || "—"} -{" "}
                            {row.scheduledEnd || "—"}
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="time"
                              value={row.actualStart}
                              onChange={(event) =>
                                updateHourRow(
                                  row.date,
                                  "actualStart",
                                  event.target.value
                                )
                              }
                              className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-300"
                            />
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="time"
                              value={row.actualEnd}
                              onChange={(event) =>
                                updateHourRow(
                                  row.date,
                                  "actualEnd",
                                  event.target.value
                                )
                              }
                              className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-300"
                            />
                          </td>

                          <td className="px-4 py-3 text-sm font-black text-slate-800">
                            {formatWorkDuration(row.totalMinutes)}
                          </td>

                          <td className="px-4 py-3 text-sm font-black text-slate-800">
                            {formatMoney(dailySalary)}
                          </td>

                          <td className="px-4 py-3">
                            <textarea
                              value={row.note}
                              onChange={(event) =>
                                updateHourRow(row.date, "note", event.target.value)
                              }
                              rows={1}
                              placeholder="הערה לאדמין / רו״ח..."
                              className="min-h-10 w-full resize-y rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-300"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-5">
              <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-black text-emerald-600">סה״כ שעות</p>
                <p className="mt-1 text-xl font-black text-emerald-950">
                  {formatWorkDuration(totalMinutes)}
                </p>
              </div>

              <div className="rounded-[22px] border border-sky-100 bg-sky-50 p-4">
                <p className="text-xs font-black text-sky-600">שעות מספרי</p>
                <p className="mt-1 text-xl font-black text-sky-950">
                  {totalHoursDecimal.toFixed(2)}
                </p>
              </div>

              <div className="rounded-[22px] border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-xs font-black text-indigo-600">ימי עבודה</p>
                <p className="mt-1 text-xl font-black text-indigo-950">
                  {workedDays}
                </p>
              </div>

              <div className="rounded-[22px] border border-violet-100 bg-violet-50 p-4">
                <p className="text-xs font-black text-violet-600">שכר שעתי</p>
                <p className="mt-1 text-xl font-black text-violet-950">
                  {formatMoney(hourlyRate)}
                </p>
              </div>

              <div className="rounded-[22px] border border-amber-100 bg-amber-50 p-4">
                <p className="text-xs font-black text-amber-600">
                  תשלום משוער
                </p>
                <p className="mt-1 text-xl font-black text-amber-950">
                  {formatMoney(totalSalary)}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}