"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

type EmployeeDocumentStatus = "missing" | "uploaded" | "approved" | "rejected";
type EmployeeDocumentType = "form101" | "idCard";

type ApiEmployeeDocument = {
  _id?: string;
  id?: string;
  documentType?: EmployeeDocumentType;
  originalFileName?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  taxYear?: number;
  status?: EmployeeDocumentStatus;
  rejectionReason?: string;
  uploadedAt?: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type EmployeeAgreementStatus = "missing" | "signed" | "approved" | "rejected";

type ApiEmployeeAgreement = {
  _id?: string;
  id?: string;
  employeeId?: string;
  businessId?: string;
  fullName?: string;
  idNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  startDate?: string | null;

  signedFileUrl?: string;
  signedPdfUrl?: string;
  fileUrl?: string;
  pdfUrl?: string;
  documentUrl?: string;
  url?: string;

  status?: EmployeeAgreementStatus;
  signedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ApiEmployeeHoursUpdate = {
  _id?: string;
  id?: string;
  title?: string;
  month?: number | string;
  year?: number | string;
  period?: string;
  totalHours?: number | string;
  status?: string;
  note?: string;
  fileUrl?: string;
  originalFileName?: string;
  submittedAt?: string;
  approvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ApiEmployeePayslip = {
  _id?: string;
  id?: string;
  title?: string;
  month?: number | string;
  year?: number | string;
  period?: string;
  netSalary?: number | string;
  grossSalary?: number | string;
  status?: string;
  fileUrl?: string;
  originalFileName?: string;
  uploadedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type EmployeeHoursSubmissionStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | string;

type ApiEmployeeHoursRow = {
  _id?: string;
  id?: string;

  date?: string;
  dayName?: string;

  isScheduled?: boolean;
  scheduled?: boolean;

  shiftTitle?: string;
  shiftName?: string;
  shiftLabel?: string;

  scheduledStart?: string;
  scheduledEnd?: string;
  shiftStart?: string;
  shiftEnd?: string;

  actualStart?: string;
  actualEnd?: string;
  softphoneStart?: string;
  softphoneEnd?: string;
  clockIn?: string;
  clockOut?: string;

  totalMinutes?: number;
  workMinutes?: number;
  minutes?: number;
  totalHours?: number | string;

  note?: string;
  employeeNote?: string;

  status?: string;
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
  status: EmployeeHoursSubmissionStatus;
  submittedAt?: string | null;
  approvedAt?: string | null;
};

type DocumentsTab =
  | "form101"
  | "idCard"
  | "agreement"
  | "hours"
  | "payslips";

type EmployeeDocumentsModalProps = {
  open: boolean;
  onClose: () => void;

  form101: ApiEmployeeDocument | null;
  idCard: ApiEmployeeDocument | null;
  agreement: ApiEmployeeAgreement | null;

  form101File: File | null;
  idCardFile: File | null;
  setForm101File: (file: File | null) => void;
  setIdCardFile: (file: File | null) => void;

  loading: boolean;
  agreementLoading: boolean;
  uploadingType: EmployeeDocumentType | null;
  error: string;

  onUpload: (documentType: EmployeeDocumentType) => void;
  onReload: () => void;

  signAgreementUrl: string;
  form101DownloadUrl: string;

  hoursUpdates?: ApiEmployeeHoursUpdate[];
  payslips?: ApiEmployeePayslip[];
  hoursLoading?: boolean;
  payslipsLoading?: boolean;

  // אופציונלי: אם תחליטי בהמשך לשנות ניתובים בלי לגעת בקומפוננטה
  employeeHoursCurrentUrl?: string;
  employeeHoursSubmitUrl?: string;
};

const DEFAULT_EMPLOYEE_HOURS_CURRENT_URL = "/api/employee-hours/current";
const DEFAULT_EMPLOYEE_HOURS_SUBMIT_URL = "/api/employee-hours/submit";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatFileSize(size?: number) {
  if (!size) return "—";

  const mb = size / 1024 / 1024;

  if (mb >= 1) {
    return `${mb.toFixed(1)}MB`;
  }

  return `${Math.round(size / 1024)}KB`;
}

function formatMoney(value?: number | string) {
  if (value === undefined || value === null || value === "") return "—";

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  });
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

function monthInputToLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map((item) => Number(item));

  if (!year || !month) return monthKey;

  return new Date(year, month - 1, 1).toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });
}

function getDaysInMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map((item) => Number(item));

  if (!year || !month) return [];

  const daysCount = new Date(year, month, 0).getDate();

  return Array.from({ length: daysCount }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${pad2(month)}-${pad2(day)}`;
    const dayName = new Date(year, month - 1, day).toLocaleDateString("he-IL", {
      weekday: "long",
    });

    return {
      id: date,
      date,
      dayName,
      isScheduled: false,
      shiftLabel: "לא משובץ",
      scheduledStart: "",
      scheduledEnd: "",
      actualStart: "",
      actualEnd: "",
      totalMinutes: 0,
      note: "",
      status: "draft",
    } satisfies EmployeeHoursRow;
  });
}

function formatTime(value?: string | null) {
  if (!value) return "—";

  const text = String(value).trim();
  if (!text) return "—";

  if (/^\d{2}:\d{2}$/.test(text)) return text;

  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return text;
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

  const diff = Math.max(0, endDate.getTime() - startDate.getTime());
  return Math.round(diff / 60000);
}

function formatMinutes(minutes?: number) {
  const value = Number(minutes || 0);
  if (!value) return "0:00";

  const hours = Math.floor(value / 60);
  const remainingMinutes = value % 60;

  return `${hours}:${pad2(remainingMinutes)}`;
}

function monthName(value?: number | string) {
  if (!value) return "";

  const numberValue = Number(value);

  if (!Number.isNaN(numberValue) && numberValue >= 1 && numberValue <= 12) {
    return new Date(2026, numberValue - 1, 1).toLocaleDateString("he-IL", {
      month: "long",
    });
  }

  return String(value);
}

function parseTotalMinutes(row: ApiEmployeeHoursRow) {
  const directMinutes = Number(row.totalMinutes ?? row.workMinutes ?? row.minutes);

  if (!Number.isNaN(directMinutes) && directMinutes > 0) {
    return Math.round(directMinutes);
  }

  const totalHours = Number(row.totalHours);

  if (!Number.isNaN(totalHours) && totalHours > 0) {
    return Math.round(totalHours * 60);
  }

  const actualStart =
    row.actualStart || row.softphoneStart || row.clockIn || "";
  const actualEnd = row.actualEnd || row.softphoneEnd || row.clockOut || "";

  return minutesBetween(actualStart, actualEnd);
}

function normalizeHoursRows(data: any, monthKey: string): {
  rows: EmployeeHoursRow[];
  summary: EmployeeHoursSummary;
} {
  const rawRows =
    (Array.isArray(data) && data) ||
    data?.rows ||
    data?.items ||
    data?.days ||
    data?.shifts ||
    data?.hours ||
    data?.data?.rows ||
    data?.data?.items ||
    data?.data?.days ||
    data?.data?.shifts ||
    data?.data?.hours ||
    [];

  const fallbackRows = getDaysInMonth(monthKey);

  const rowsFromServer = Array.isArray(rawRows)
    ? rawRows.map((rawItem: ApiEmployeeHoursRow, index: number) => {
        const date = cleanString(rawItem.date) || fallbackRows[index]?.date || "";
        const fallback = fallbackRows.find((item) => item.date === date) || fallbackRows[index];

        const scheduledStart =
          rawItem.scheduledStart || rawItem.shiftStart || "";
        const scheduledEnd = rawItem.scheduledEnd || rawItem.shiftEnd || "";

        const actualStart =
          rawItem.actualStart ||
          rawItem.softphoneStart ||
          rawItem.clockIn ||
          "";

        const actualEnd =
          rawItem.actualEnd ||
          rawItem.softphoneEnd ||
          rawItem.clockOut ||
          "";

        const hasShiftData = Boolean(
          scheduledStart ||
            scheduledEnd ||
            rawItem.shiftTitle ||
            rawItem.shiftName ||
            rawItem.shiftLabel,
        );

        const isScheduled = Boolean(
          rawItem.isScheduled ?? rawItem.scheduled ?? hasShiftData,
        );

        return {
          id: cleanString(rawItem.id || rawItem._id) || date || String(index),
          date,
          dayName: cleanString(rawItem.dayName) || fallback?.dayName || "—",
          isScheduled,
          shiftLabel: isScheduled
            ? cleanString(
                rawItem.shiftLabel || rawItem.shiftTitle || rawItem.shiftName,
              ) || "משמרת"
            : "לא משובץ",
          scheduledStart: cleanString(scheduledStart),
          scheduledEnd: cleanString(scheduledEnd),
          actualStart: cleanString(actualStart),
          actualEnd: cleanString(actualEnd),
          totalMinutes: parseTotalMinutes(rawItem),
          note: cleanString(rawItem.note || rawItem.employeeNote),
          status: cleanString(rawItem.status) || "draft",
        } satisfies EmployeeHoursRow;
      })
    : [];

  const rowsMap = new Map<string, EmployeeHoursRow>();

  for (const row of fallbackRows) {
    rowsMap.set(row.date, row);
  }

  for (const row of rowsFromServer) {
    if (row.date) {
      rowsMap.set(row.date, row);
    }
  }

  const rows = Array.from(rowsMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const summaryFromResponse =
    data?.summary || data?.data?.summary || data?.monthSummary || {};

  const totalMinutes =
    Number(summaryFromResponse.totalMinutes) ||
    rows.reduce((sum, row) => sum + Number(row.totalMinutes || 0), 0);

  const scheduledDays =
    Number(summaryFromResponse.scheduledDays) ||
    rows.filter((row) => row.isScheduled).length;

  const workedDays =
    Number(summaryFromResponse.workedDays) ||
    rows.filter((row) => row.actualStart || row.actualEnd || row.totalMinutes > 0)
      .length;

  const status =
    cleanString(
      summaryFromResponse.status ||
        data?.status ||
        data?.data?.status ||
        data?.submissionStatus ||
        data?.data?.submissionStatus,
    ) || "draft";

  return {
    rows,
    summary: {
      month: monthKey,
      totalMinutes,
      scheduledDays,
      workedDays,
      status,
      submittedAt:
        summaryFromResponse.submittedAt ||
        data?.submittedAt ||
        data?.data?.submittedAt ||
        null,
      approvedAt:
        summaryFromResponse.approvedAt ||
        data?.approvedAt ||
        data?.data?.approvedAt ||
        null,
    },
  };
}

function documentStatusLabel(status?: EmployeeDocumentStatus) {
  switch (status) {
    case "approved":
      return "מאושר";
    case "rejected":
      return "נדחה — ניתן לשלוח מחדש";
    case "uploaded":
      return "נשלח וממתין לבדיקה";
    default:
      return "לא הועלה";
  }
}

function documentStatusClass(status?: EmployeeDocumentStatus) {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "uploaded":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function canUploadDocument(document?: ApiEmployeeDocument | null) {
  const status = document?.status || "missing";
  return status === "missing" || status === "rejected";
}

function getUploadedDate(document?: ApiEmployeeDocument | null) {
  return formatDate(document?.uploadedAt || document?.createdAt);
}

function getAgreementFileUrl(agreement?: ApiEmployeeAgreement | null) {
  if (!agreement) return "";

  return String(
    agreement.signedFileUrl ||
      agreement.signedPdfUrl ||
      agreement.fileUrl ||
      agreement.pdfUrl ||
      agreement.documentUrl ||
      agreement.url ||
      "",
  );
}

function getAgreementEffectiveStatus(
  agreement?: ApiEmployeeAgreement | null,
): EmployeeAgreementStatus {
  if (!agreement) return "missing";

  if (agreement.status === "rejected") return "rejected";

  if (agreement.status === "approved" || agreement.approvedAt) {
    return "approved";
  }

  if (
    getAgreementFileUrl(agreement) ||
    agreement.signedAt ||
    agreement.status === "signed"
  ) {
    return "signed";
  }

  return "missing";
}

function agreementStatusLabel(status?: EmployeeAgreementStatus) {
  switch (status) {
    case "approved":
      return "מאושר";
    case "signed":
      return "נחתם וממתין לאישור";
    case "rejected":
      return "נדחה — ניתן לחתום מחדש";
    default:
      return "לא נחתם";
  }
}

function agreementStatusClass(status?: EmployeeAgreementStatus) {
  switch (status) {
    case "approved":
    case "signed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function getAgreementDate(agreement?: ApiEmployeeAgreement | null) {
  return (
    agreement?.signedAt ||
    agreement?.approvedAt ||
    agreement?.updatedAt ||
    agreement?.createdAt ||
    ""
  );
}

function genericStatusLabel(status?: string) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "approved") return "מאושר";
  if (normalized === "rejected") return "נדחה";
  if (normalized === "pending") return "ממתין לבדיקה";
  if (normalized === "uploaded") return "הועלה";
  if (normalized === "sent") return "נשלח";
  if (normalized === "submitted") return "נשלח לאישור";
  if (normalized === "paid") return "שולם";
  if (normalized === "draft") return "טיוטה";

  return status || "—";
}

function genericStatusClass(status?: string) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "approved" || normalized === "paid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "rejected") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (
    normalized === "pending" ||
    normalized === "uploaded" ||
    normalized === "sent" ||
    normalized === "submitted"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function hoursStatusAllowsEditing(status?: EmployeeHoursSubmissionStatus) {
  const normalized = String(status || "").toLowerCase();
  return normalized === "draft" || normalized === "rejected" || !normalized;
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name:
    | "file"
    | "id"
    | "agreement"
    | "clock"
    | "payroll"
    | "open"
    | "check"
    | "refresh"
    | "upload"
    | "warning"
    | "lock"
    | "close"
    | "send";
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

  if (name === "id") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <circle cx="9" cy="11" r="2" />
        <path d="M7 16a4 4 0 0 1 4 0" />
        <path d="M14 10h4" />
        <path d="M14 14h4" />
      </svg>
    );
  }

  if (name === "agreement") {
    return (
      <svg {...common}>
        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
        <path d="M14 2v5h5" />
        <path d="m9 15 2 2 4-5" />
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

  if (name === "payroll") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M7 9h10" />
        <path d="M7 13h4" />
        <path d="M15 13h2" />
        <path d="M7 17h10" />
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

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m20 6-11 11-5-5" />
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

  if (name === "upload") {
    return (
      <svg {...common}>
        <path d="M12 16V4" />
        <path d="m6 10 6-6 6 6" />
        <path d="M20 16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4" />
      </svg>
    );
  }

  if (name === "warning") {
    return (
      <svg {...common}>
        <path d="m12 3 10 18H2L12 3z" />
        <path d="M12 9v5" />
        <path d="M12 17h.01" />
      </svg>
    );
  }

  if (name === "lock") {
    return (
      <svg {...common}>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
    );
  }

  if (name === "close") {
    return (
      <svg {...common}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    );
  }

  if (name === "send") {
    return (
      <svg {...common}>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  );
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center justify-center rounded-full border px-3 py-1 text-center text-[11px] font-black leading-5 whitespace-normal break-words ${className}`}
    >
      {children}
    </span>
  );
}

function TabButton({
  active,
  title,
  subtitle,
  icon,
  badge,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-selected={active}
      className={`flex min-w-[185px] flex-1 items-center justify-between gap-3 overflow-hidden rounded-2xl border p-3 text-right transition ${
        active
          ? "border-sky-300 bg-sky-50 text-sky-800 shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            active ? "bg-white text-sky-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {icon}
        </span>

        <span className="min-w-0">
          <span className="block truncate text-sm font-black">{title}</span>
          <span
            className={`mt-0.5 block truncate text-[11px] font-bold ${
              active ? "text-sky-600" : "text-slate-400"
            }`}
          >
            {subtitle}
          </span>
        </span>
      </span>

      {badge && <span className="max-w-[118px] shrink">{badge}</span>}
    </button>
  );
}

function ReadonlyNotice({ text }: { text?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-700">
      <div className="flex items-start gap-2">
        <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {text ||
            "המסמך כבר נשלח למערכת ולכן לא ניתן לערוך או להחליף אותו מתוך תיק העובד. אם צריך תיקון, האדמין צריך לדחות או לפתוח מחדש."}
        </span>
      </div>
    </div>
  );
}

function RejectionBox({ reason }: { reason?: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-700">
      <div className="flex items-start gap-2">
        <Icon name="warning" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          המסמך נדחה
          {reason ? (
            <>
              {" "}
              — סיבה: <b>{reason}</b>
            </>
          ) : (
            ". ניתן לשלוח קובץ חדש."
          )}
        </span>
      </div>
    </div>
  );
}

function DocumentDetailsCard({
  title,
  document,
  viewLabel,
}: {
  title: string;
  document: ApiEmployeeDocument;
  viewLabel: string;
}) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-black text-slate-900">{title}</p>

          <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
            <span>
              קובץ:{" "}
              <b className="text-slate-900">
                {document.originalFileName || "—"}
              </b>
            </span>

            {document.taxYear && (
              <span>
                שנת מס: <b className="text-slate-900">{document.taxYear}</b>
              </span>
            )}

            <span>
              גודל:{" "}
              <b className="text-slate-900">
                {formatFileSize(document.fileSize)}
              </b>
            </span>

            <span>
              תאריך העלאה:{" "}
              <b className="text-slate-900">{getUploadedDate(document)}</b>
            </span>

            {document.approvedAt && (
              <span>
                תאריך אישור:{" "}
                <b className="text-slate-900">
                  {formatDate(document.approvedAt)}
                </b>
              </span>
            )}
          </div>
        </div>

        <Badge className={documentStatusClass(document.status || "missing")}>
          {documentStatusLabel(document.status || "missing")}
        </Badge>
      </div>

      {document.fileUrl && (
        <a
          href={document.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
        >
          <Icon name="open" className="h-4 w-4" />
          {viewLabel}
        </a>
      )}
    </div>
  );
}

function UploadDocumentBox({
  documentType,
  title,
  description,
  selectedFile,
  setSelectedFile,
  uploadingType,
  onUpload,
}: {
  documentType: EmployeeDocumentType;
  title: string;
  description: string;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  uploadingType: EmployeeDocumentType | null;
  onUpload: (documentType: EmployeeDocumentType) => void;
}) {
  const isUploading = uploadingType === documentType;

  return (
    <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 p-5">
      <p className="text-lg font-black text-slate-900">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>

      <input
        type="file"
        accept=".pdf,image/png,image/jpeg"
        disabled={isUploading}
        onChange={(event) => {
          setSelectedFile(event.target.files?.[0] || null);
        }}
        className="mt-5 block w-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700 file:ml-4 file:rounded-xl file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:text-sm file:font-black file:text-sky-700 file:ring-1 file:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
      />

      {selectedFile && (
        <p className="mt-3 text-xs font-bold text-slate-500">
          נבחר קובץ: <b className="text-slate-900">{selectedFile.name}</b> ·{" "}
          {formatFileSize(selectedFile.size)}
        </p>
      )}

      <button
        type="button"
        onClick={() => onUpload(documentType)}
        disabled={isUploading || !selectedFile}
        className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUploading ? (
          <>
            <Icon name="refresh" className="h-4 w-4 animate-spin" />
            מעלה...
          </>
        ) : (
          <>
            <Icon name="upload" className="h-4 w-4" />
            שליחת קובץ
          </>
        )}
      </button>
    </div>
  );
}

function EmptyTabState({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
        <Icon name="file" className="h-6 w-6" />
      </div>

      <p className="mt-4 text-lg font-black text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-7 text-slate-500">
        {subtitle}
      </p>
    </div>
  );
}

function HoursSummaryCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-400">{subtitle}</p>
    </div>
  );
}

function HoursTable({
  rows,
  canEditNotes,
  onChangeNote,
}: {
  rows: EmployeeHoursRow[];
  canEditNotes: boolean;
  onChangeNote: (date: string, note: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white">
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[980px] border-collapse text-right">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="px-4 py-3 font-black">תאריך</th>
              <th className="px-4 py-3 font-black">יום</th>
              <th className="px-4 py-3 font-black">שיבוץ</th>
              <th className="px-4 py-3 font-black">שעות משמרת</th>
              <th className="px-4 py-3 font-black">כניסה לפי סופטפון</th>
              <th className="px-4 py-3 font-black">יציאה לפי סופטפון</th>
              <th className="px-4 py-3 font-black">סה״כ</th>
              <th className="px-4 py-3 font-black">הערת העובד/ת</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const scheduledText = row.isScheduled
                ? row.shiftLabel || "משמרת"
                : "לא משובץ";

              const shiftHours =
                row.isScheduled && (row.scheduledStart || row.scheduledEnd)
                  ? `${formatTime(row.scheduledStart)} - ${formatTime(row.scheduledEnd)}`
                  : "—";

              return (
                <tr key={row.date} className="align-top hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-sm font-black text-slate-900">
                    {formatDate(row.date)}
                  </td>

                  <td className="px-4 py-3 text-sm font-semibold text-slate-600">
                    {row.dayName}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${
                        row.isScheduled
                          ? "border-slate-200 bg-slate-100 text-slate-700"
                          : "border-slate-200 bg-white text-slate-500"
                      }`}
                    >
                      {scheduledText}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm font-bold text-slate-700">
                    {shiftHours}
                  </td>

                  <td className="px-4 py-3 text-sm font-bold text-slate-700">
                    {formatTime(row.actualStart)}
                  </td>

                  <td className="px-4 py-3 text-sm font-bold text-slate-700">
                    {formatTime(row.actualEnd)}
                  </td>

                  <td className="px-4 py-3 text-sm font-black text-slate-900">
                    {formatMinutes(row.totalMinutes)}
                  </td>

                  <td className="px-4 py-3">
                    <textarea
                      value={row.note}
                      onChange={(event) => onChangeNote(row.date, event.target.value)}
                      disabled={!canEditNotes}
                      placeholder="הערה לאדמין..."
                      className="min-h-[42px] w-[260px] resize-y rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot className="border-t border-slate-200 bg-slate-50">
            <tr>
              <td
                colSpan={6}
                className="px-4 py-4 text-left text-sm font-black text-slate-600"
              >
                סיכום שעות לחודש
              </td>
              <td className="px-4 py-4 text-sm font-black text-slate-900">
                {formatMinutes(
                  rows.reduce((sum, row) => sum + Number(row.totalMinutes || 0), 0),
                )}
              </td>
              <td className="px-4 py-4 text-xs font-bold text-slate-400">
                הערות נשלחות לאישור אדמין
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function EmployeeDocumentsModal({
  open,
  onClose,

  form101,
  idCard,
  agreement,

  form101File,
  idCardFile,
  setForm101File,
  setIdCardFile,

  loading,
  agreementLoading,
  uploadingType,
  error,

  onUpload,
  onReload,

  signAgreementUrl,
  form101DownloadUrl,

  hoursUpdates = [],
  payslips = [],
  hoursLoading = false,
  payslipsLoading = false,

  employeeHoursCurrentUrl = DEFAULT_EMPLOYEE_HOURS_CURRENT_URL,
  employeeHoursSubmitUrl = DEFAULT_EMPLOYEE_HOURS_SUBMIT_URL,
}: EmployeeDocumentsModalProps) {
  const [activeTab, setActiveTab] = useState<DocumentsTab>("form101");

  const [hoursMonth, setHoursMonth] = useState(getCurrentMonthKey());
  const [hoursRows, setHoursRows] = useState<EmployeeHoursRow[]>(() =>
    getDaysInMonth(getCurrentMonthKey()),
  );
  const [hoursSummary, setHoursSummary] = useState<EmployeeHoursSummary>(() => ({
    month: getCurrentMonthKey(),
    totalMinutes: 0,
    scheduledDays: 0,
    workedDays: 0,
    status: "draft",
  }));
  const [internalHoursLoading, setInternalHoursLoading] = useState(false);
  const [hoursError, setHoursError] = useState("");
  const [submittingHours, setSubmittingHours] = useState(false);
  const [hoursSuccess, setHoursSuccess] = useState("");

  const form101Status = form101?.status || "missing";
  const idCardStatus = idCard?.status || "missing";

  const agreementStatus = getAgreementEffectiveStatus(agreement);
  const agreementFileUrl = getAgreementFileUrl(agreement);
  const agreementDate = getAgreementDate(agreement);
  const canSignAgreement =
    agreementStatus === "missing" || agreementStatus === "rejected";

  const canUploadForm101 = canUploadDocument(form101);
  const canUploadIdCard = canUploadDocument(idCard);
  const canEditHoursNotes = hoursStatusAllowsEditing(hoursSummary.status);

  const loadEmployeeHours = useCallback(
    async (monthKey: string) => {
      try {
        setHoursError("");
        setHoursSuccess("");
        setInternalHoursLoading(true);

        const params = new URLSearchParams({
          month: monthKey,
        });

        const response = await fetch(
          `${employeeHoursCurrentUrl}?${params.toString()}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || data?.message || "שגיאה בטעינת שעות");
        }

        const normalized = normalizeHoursRows(data, monthKey);
        setHoursRows(normalized.rows);
        setHoursSummary(normalized.summary);
      } catch (loadError) {
        console.error("LOAD EMPLOYEE HOURS FAILED:", loadError);

        const fallbackRows = getDaysInMonth(monthKey);

        setHoursRows(fallbackRows);
        setHoursSummary({
          month: monthKey,
          totalMinutes: 0,
          scheduledDays: 0,
          workedDays: 0,
          status: "draft",
        });
        setHoursError(
          loadError instanceof Error
            ? loadError.message
            : "שגיאה בטעינת שעות העובד/ת",
        );
      } finally {
        setInternalHoursLoading(false);
      }
    },
    [employeeHoursCurrentUrl],
  );

  const submitEmployeeHours = useCallback(async () => {
    if (submittingHours || !canEditHoursNotes) return;

    try {
      setHoursError("");
      setHoursSuccess("");
      setSubmittingHours(true);

      const response = await fetch(employeeHoursSubmitUrl, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: hoursMonth,
          rows: hoursRows.map((row) => ({
            date: row.date,
            note: row.note,
          })),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.error || data?.message || "שגיאה בשליחת שעות לאישור",
        );
      }

      setHoursSuccess("השעות נשלחו לאישור אדמין בהצלחה.");
      setHoursSummary((current) => ({
        ...current,
        status: data?.status || data?.summary?.status || "submitted",
        submittedAt:
          data?.submittedAt ||
          data?.summary?.submittedAt ||
          new Date().toISOString(),
      }));
    } catch (submitError) {
      console.error("SUBMIT EMPLOYEE HOURS FAILED:", submitError);
      setHoursError(
        submitError instanceof Error
          ? submitError.message
          : "שגיאה בשליחת שעות לאישור",
      );
    } finally {
      setSubmittingHours(false);
    }
  }, [
    canEditHoursNotes,
    employeeHoursSubmitUrl,
    hoursMonth,
    hoursRows,
    submittingHours,
  ]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setActiveTab("form101");
    }
  }, [open]);

  useEffect(() => {
    if (!open || activeTab !== "hours") return;

    void loadEmployeeHours(hoursMonth);
  }, [activeTab, hoursMonth, loadEmployeeHours, open]);

  const tabs = useMemo(
    () => [
      {
        id: "form101" as const,
        title: "טופס 101",
        subtitle: "מס הכנסה",
        icon: <Icon name="file" className="h-5 w-5" />,
        badge: (
          <Badge className={documentStatusClass(form101Status)}>
            {documentStatusLabel(form101Status)}
          </Badge>
        ),
      },
      {
        id: "idCard" as const,
        title: "תעודת זהות",
        subtitle: "צילום / PDF",
        icon: <Icon name="id" className="h-5 w-5" />,
        badge: (
          <Badge className={documentStatusClass(idCardStatus)}>
            {documentStatusLabel(idCardStatus)}
          </Badge>
        ),
      },
      {
        id: "agreement" as const,
        title: "הסכם עבודה",
        subtitle: "חתימה דיגיטלית",
        icon: <Icon name="agreement" className="h-5 w-5" />,
        badge: (
          <Badge className={agreementStatusClass(agreementStatus)}>
            {agreementStatusLabel(agreementStatus)}
          </Badge>
        ),
      },
      {
        id: "hours" as const,
        title: "שעות",
        subtitle: "לפי חודש",
        icon: <Icon name="clock" className="h-5 w-5" />,
        badge: (
          <Badge className={genericStatusClass(hoursSummary.status)}>
            {genericStatusLabel(hoursSummary.status)}
          </Badge>
        ),
      },
      {
        id: "payslips" as const,
        title: "תלושי שכר",
        subtitle: "צפייה בלבד",
        icon: <Icon name="payroll" className="h-5 w-5" />,
        badge: (
          <Badge className="border-slate-200 bg-slate-50 text-slate-600">
            {payslips.length}
          </Badge>
        ),
      },
    ],
    [
      agreementStatus,
      form101Status,
      hoursSummary.status,
      idCardStatus,
      payslips.length,
    ],
  );

  if (!open) return null;

  const isAnythingLoading =
    loading ||
    agreementLoading ||
    hoursLoading ||
    payslipsLoading ||
    internalHoursLoading;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-700/25 px-3 py-5 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-7xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                תיק העובד/ת
              </span>

              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                מסמכים, הסכמים, שעות ותלושי שכר
              </h2>

              <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-500">
                כל אזור נמצא בטאב נפרד. לאחר שליחת מסמך הוא נשמר לצפייה בלבד
                עד לאישור או דחייה על ידי אדמין.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
              aria-label="סגירה"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                active={activeTab === tab.id}
                title={tab.title}
                subtitle={tab.subtitle}
                icon={tab.icon}
                badge={tab.badge}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>
        </div>

        <div className="max-h-[calc(92vh-230px)] overflow-y-auto bg-slate-50 p-5 sm:p-6">
          {isAnythingLoading && (
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black text-slate-500">
              טוען נתונים...
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
              {error}
            </div>
          )}

          {activeTab === "form101" && (
            <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">
                      טופס 101
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                      יש להוריד טופס 101 ריק, למלא, לחתום ולשלוח למערכת.
                    </p>
                  </div>

                  <Badge className={documentStatusClass(form101Status)}>
                    {documentStatusLabel(form101Status)}
                  </Badge>
                </div>

                {form101Status === "rejected" && (
                  <div className="mt-5">
                    <RejectionBox reason={form101?.rejectionReason} />
                  </div>
                )}

                {!canUploadForm101 && (
                  <div className="mt-5">
                    <ReadonlyNotice />
                  </div>
                )}

                {canUploadForm101 && (
                  <>
                    <a
                      href={form101DownloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-black text-white transition hover:bg-sky-700"
                    >
                      <Icon name="open" className="h-4 w-4" />
                      הורדת טופס 101 ריק
                    </a>

                    <div className="mt-5">
                      <UploadDocumentBox
                        documentType="form101"
                        title="שליחת טופס 101 חתום"
                        description="ניתן לשלוח PDF, JPG או PNG. אחרי השליחה לא ניתן להחליף את הקובץ אלא אם הוא נדחה."
                        selectedFile={form101File}
                        setSelectedFile={setForm101File}
                        uploadingType={uploadingType}
                        onUpload={onUpload}
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                {form101 ? (
                  <DocumentDetailsCard
                    title="הטופס האחרון שנשלח"
                    document={form101}
                    viewLabel="צפייה בטופס"
                  />
                ) : (
                  !loading && (
                    <EmptyTabState
                      title="עדיין לא נשלח טופס 101"
                      subtitle="לאחר שליחת טופס חתום, הוא יופיע כאן לצפייה בלבד עם סטטוס בדיקה."
                    />
                  )
                )}
              </div>
            </div>
          )}

          {activeTab === "idCard" && (
            <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">
                      תעודת זהות
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                      יש לשלוח צילום תעודת זהות או קובץ PDF. ניתן לצרף גם ספח
                      לפי הצורך.
                    </p>
                  </div>

                  <Badge className={documentStatusClass(idCardStatus)}>
                    {documentStatusLabel(idCardStatus)}
                  </Badge>
                </div>

                {idCardStatus === "rejected" && (
                  <div className="mt-5">
                    <RejectionBox reason={idCard?.rejectionReason} />
                  </div>
                )}

                {!canUploadIdCard && (
                  <div className="mt-5">
                    <ReadonlyNotice />
                  </div>
                )}

                {canUploadIdCard && (
                  <div className="mt-5">
                    <UploadDocumentBox
                      documentType="idCard"
                      title="שליחת תעודת זהות"
                      description="ניתן לשלוח PDF, JPG או PNG. אחרי השליחה לא ניתן להחליף את הקובץ אלא אם הוא נדחה."
                      selectedFile={idCardFile}
                      setSelectedFile={setIdCardFile}
                      uploadingType={uploadingType}
                      onUpload={onUpload}
                    />
                  </div>
                )}
              </div>

              <div>
                {idCard ? (
                  <DocumentDetailsCard
                    title="תעודת הזהות האחרונה שנשלחה"
                    document={idCard}
                    viewLabel="צפייה בתעודת זהות"
                  />
                ) : (
                  !loading && (
                    <EmptyTabState
                      title="עדיין לא נשלחה תעודת זהות"
                      subtitle="לאחר שליחת תעודת זהות, היא תופיע כאן לצפייה בלבד עם סטטוס בדיקה."
                    />
                  )
                )}
              </div>
            </div>
          )}

          {activeTab === "agreement" && (
            <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">
                      הסכם עבודה
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                      העובד או העובדת ממלאים את השדות, חותמים, ובסיום נוצר PDF
                      חתום שנשמר במערכת.
                    </p>
                  </div>

                  <Badge className={agreementStatusClass(agreementStatus)}>
                    {agreementStatusLabel(agreementStatus)}
                  </Badge>
                </div>

                {agreementStatus === "rejected" && (
                  <div className="mt-5">
                    <RejectionBox reason={agreement?.rejectionReason} />
                  </div>
                )}

                {!canSignAgreement && (
                  <div className="mt-5">
                    <ReadonlyNotice text="ההסכם כבר נחתם ונשמר במערכת. ניתן לצפות בהסכם החתום בלבד, ללא עריכה." />
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  {canSignAgreement ? (
                    <a
                      href={signAgreementUrl}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-black text-white transition hover:bg-sky-700"
                    >
                      <Icon name="check" className="h-4 w-4" />
                      חתימה על ההסכם
                    </a>
                  ) : agreementFileUrl ? (
                    <a
                      href={agreementFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-black text-white transition hover:bg-sky-700"
                    >
                      <Icon name="open" className="h-4 w-4" />
                      צפייה בהסכם חתום
                    </a>
                  ) : null}
                </div>
              </div>

              <div>
                {agreement &&
                (agreementStatus === "signed" ||
                  agreementStatus === "approved") ? (
                  <div className="rounded-[26px] border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-black text-slate-900">
                          ההסכם החתום האחרון
                        </p>

                        <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                          {agreement.fullName && (
                            <span>
                              שם:{" "}
                              <b className="text-slate-900">
                                {agreement.fullName}
                              </b>
                            </span>
                          )}

                          {agreement.idNumber && (
                            <span>
                              ת.ז:{" "}
                              <b className="text-slate-900">
                                {agreement.idNumber}
                              </b>
                            </span>
                          )}

                          {agreement.email && (
                            <span>
                              מייל:{" "}
                              <b className="text-slate-900">
                                {agreement.email}
                              </b>
                            </span>
                          )}

                          {agreementDate && (
                            <span>
                              תאריך חתימה:{" "}
                              <b className="text-slate-900">
                                {formatDate(agreementDate)}
                              </b>
                            </span>
                          )}
                        </div>
                      </div>

                      <Badge className={agreementStatusClass(agreementStatus)}>
                        {agreementStatusLabel(agreementStatus)}
                      </Badge>
                    </div>

                    {agreementFileUrl && (
                      <a
                        href={agreementFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                      >
                        <Icon name="open" className="h-4 w-4" />
                        צפייה בהסכם חתום
                      </a>
                    )}
                  </div>
                ) : (
                  !agreementLoading && (
                    <EmptyTabState
                      title="עדיין אין הסכם חתום"
                      subtitle="לאחר חתימה על ההסכם, ה-PDF החתום יופיע כאן לצפייה בלבד."
                    />
                  )
                )}
              </div>
            </div>
          )}

          {activeTab === "hours" && (
            <div className="space-y-5">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">
                      שעות חודשיות
                    </h3>

                    <p className="mt-2 max-w-4xl text-sm font-semibold leading-7 text-slate-500">
                      הטבלה מציגה כל תאריך בחודש, שיבוץ משמרת, זמני כניסה
                      ויציאה לפי הסופטפון, סיכום שעות למשמרת וסיכום חודשי.
                      השדה היחיד שניתן לעריכה מצד העובד או העובדת הוא הערה
                      לאדמין.
                    </p>
                  </div>

                  <Badge className={genericStatusClass(hoursSummary.status)}>
                    {genericStatusLabel(hoursSummary.status)}
                  </Badge>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <HoursSummaryCard
                    title="חודש"
                    value={monthInputToLabel(hoursMonth)}
                    subtitle="בחירה לפי חודש"
                  />

                  <HoursSummaryCard
                    title="ימים משובצים"
                    value={hoursSummary.scheduledDays}
                    subtitle="לפי סידור עבודה"
                  />

                  <HoursSummaryCard
                    title="ימי עבודה בפועל"
                    value={hoursSummary.workedDays}
                    subtitle="לפי סופטפון"
                  />

                  <HoursSummaryCard
                    title="סה״כ שעות"
                    value={formatMinutes(hoursSummary.totalMinutes)}
                    subtitle="סיכום חודשי"
                  />
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm font-black text-slate-700">
                      בחירת חודש
                    </label>

                    <input
                      type="month"
                      value={hoursMonth}
                      onChange={(event) => setHoursMonth(event.target.value)}
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 outline-none transition focus:border-slate-400"
                    />

                    <button
                      type="button"
                      onClick={() => void loadEmployeeHours(hoursMonth)}
                      disabled={internalHoursLoading}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Icon
                        name="refresh"
                        className={`h-4 w-4 ${
                          internalHoursLoading ? "animate-spin" : ""
                        }`}
                      />
                      רענון שעות
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => void submitEmployeeHours()}
                    disabled={
                      submittingHours ||
                      internalHoursLoading ||
                      !canEditHoursNotes
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingHours ? (
                      <>
                        <Icon name="refresh" className="h-4 w-4 animate-spin" />
                        שולח לאישור...
                      </>
                    ) : (
                      <>
                        <Icon name="send" className="h-4 w-4" />
                        שליחת חודש לאישור אדמין
                      </>
                    )}
                  </button>
                </div>

                {!canEditHoursNotes && (
                  <div className="mt-5">
                    <ReadonlyNotice text="החודש כבר נשלח לאישור ולכן לא ניתן לערוך הערות. אם צריך שינוי, האדמין צריך לפתוח מחדש או לדחות." />
                  </div>
                )}

                {hoursError && (
                  <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
                    {hoursError}
                  </div>
                )}

                {hoursSuccess && (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
                    {hoursSuccess}
                  </div>
                )}

                {hoursSummary.submittedAt && (
                  <p className="mt-4 text-xs font-bold text-slate-400">
                    נשלח לאישור: {formatDate(hoursSummary.submittedAt)}
                  </p>
                )}
              </div>

              <HoursTable
                rows={hoursRows}
                canEditNotes={canEditHoursNotes}
                onChangeNote={(date, note) => {
                  setHoursRows((currentRows) =>
                    currentRows.map((row) =>
                      row.date === date ? { ...row, note } : row,
                    ),
                  );
                }}
              />
            </div>
          )}

          {activeTab === "payslips" && (
            <div className="space-y-5">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                <h3 className="text-xl font-black text-slate-900">
                  תלושי שכר
                </h3>

                <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                  כאן יוצגו תלושי השכר שהועלו לעובד או לעובדת. התלושים הם
                  לצפייה בלבד ואינם ניתנים לעריכה.
                </p>

                <div className="mt-5">
                  <ReadonlyNotice text="תלושי שכר מוצגים לצפייה בלבד. העלאה, החלפה או מחיקה מתבצעות דרך המעסיק או האדמין." />
                </div>
              </div>

              {payslips.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {payslips.map((item) => {
                    const id = String(item.id || item._id || Math.random());
                    const period =
                      item.period ||
                      [monthName(item.month), item.year]
                        .filter(Boolean)
                        .join(" ");

                    return (
                      <div
                        key={id}
                        className="rounded-[26px] border border-slate-200 bg-white p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-black text-slate-900">
                              {item.title || "תלוש שכר"}
                            </p>

                            <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                              <span>
                                תקופה:{" "}
                                <b className="text-slate-900">
                                  {period || "—"}
                                </b>
                              </span>

                              <span>
                                ברוטו:{" "}
                                <b className="text-slate-900">
                                  {formatMoney(item.grossSalary)}
                                </b>
                              </span>

                              <span>
                                נטו:{" "}
                                <b className="text-slate-900">
                                  {formatMoney(item.netSalary)}
                                </b>
                              </span>

                              <span>
                                תאריך העלאה:{" "}
                                <b className="text-slate-900">
                                  {formatDate(item.uploadedAt || item.createdAt)}
                                </b>
                              </span>
                            </div>
                          </div>

                          <Badge className={genericStatusClass(item.status)}>
                            {genericStatusLabel(item.status)}
                          </Badge>
                        </div>

                        {item.fileUrl && (
                          <a
                            href={item.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                          >
                            <Icon name="open" className="h-4 w-4" />
                            צפייה בתלוש
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                !payslipsLoading && (
                  <EmptyTabState
                    title="אין עדיין תלושי שכר"
                    subtitle="כאשר יועלו תלושי שכר, הם יופיעו כאן לצפייה בלבד."
                  />
                )
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold leading-6 text-slate-400">
            כל מסמך שנשלח נשמר במערכת ולא ניתן לעריכה מצד העובד או העובדת לאחר
            השליחה.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                onReload();

                if (activeTab === "hours") {
                  void loadEmployeeHours(hoursMonth);
                }
              }}
              disabled={isAnythingLoading || Boolean(uploadingType)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon
                name="refresh"
                className={`h-4 w-4 ${isAnythingLoading ? "animate-spin" : ""}`}
              />
              רענון סטטוס
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              סגירה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
