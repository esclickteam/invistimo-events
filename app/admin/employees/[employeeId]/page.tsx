"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

export const dynamic = "force-dynamic";

type DocumentStatus = "missing" | "uploaded" | "approved" | "rejected" | "signed" | string;
type DocumentType = "form101" | "idCard" | "agreement" | string;

type ApiUser = {
  _id?: string;
  id?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  startDate?: string;
  employeeStartDate?: string;
  employmentStartDate?: string;
};

type AdminEmployeeDocument = {
  _id: string;
  id?: string;
  source: "form" | "agreement";
  employeeId?: string;
  employeeName?: string;
  employeeEmail?: string;
  employeePhone?: string;
  documentType?: DocumentType;
  originalFileName?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  taxYear?: number;
  status?: DocumentStatus;
  uploadedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  startDate?: string | null;
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

type EmployeeProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  startDate: string;
};

const API = {
  users: "/api/admin/users",
  forms101: "/api/admin/forms/101",
  agreements: "/api/admin/employee-agreements",
  updateFormStatus: (formId: string) => `/api/admin/forms/101/${formId}/status`,
  updateAgreementStatus: (agreementId: string) =>
    `/api/admin/employee-agreements/${agreementId}/status`,
  hours: (employeeId: string, month: string) =>
    `/api/admin/employees/${encodeURIComponent(employeeId)}/hours?month=${encodeURIComponent(
      month
    )}`,
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

function getArrayFromResponse<T>(data: any, keys: string[]): T[] {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }

  return [];
}

async function fetchJson(url: string, optional = false) {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    if (optional) return null;
    throw new Error(data?.error || data?.message || "שגיאה בטעינת נתונים");
  }

  return data;
}

function normalizeId(item: { _id?: string; id?: string }) {
  return String(item.id || item._id || "");
}

function normalizeUserId(user: ApiUser) {
  return String(user.id || user._id || "");
}

function normalizeUserName(user: ApiUser) {
  const fullName = cleanStr(user.name || user.fullName);
  if (fullName) return fullName;

  const combined = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return cleanStr(combined) || "עובד ללא שם";
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

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function minutesBetween(start?: string, end?: string) {
  if (!start || !end) return 0;

  const normalizedStart = start.length === 5 ? `1970-01-01T${start}:00` : start;
  const normalizedEnd = end.length === 5 ? `1970-01-01T${end}:00` : end;

  const startDate = new Date(normalizedStart);
  const endDate = new Date(normalizedEnd);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0;
  }

  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
}

function statusLabel(status?: string) {
  switch (String(status || "").toLowerCase()) {
    case "approved":
      return "מאושר";
    case "rejected":
      return "נדחה";
    case "signed":
      return "נחתם לבדיקה";
    case "uploaded":
      return "ממתין לבדיקה";
    case "submitted":
      return "הוגש לאישור";
    case "draft":
      return "טיוטה";
    default:
      return "לא הועלה";
  }
}

function statusClass(status?: string) {
  switch (String(status || "").toLowerCase()) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "signed":
    case "uploaded":
    case "submitted":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function documentTypeLabel(type?: string) {
  switch (String(type || "")) {
    case "form101":
      return "טופס 101";
    case "idCard":
      return "תעודת זהות";
    case "agreement":
      return "הסכם עבודה";
    default:
      return "מסמך עובד";
  }
}

function getDocumentId(doc: AdminEmployeeDocument) {
  return String(doc.id || doc._id || "");
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name:
    | "arrow"
    | "refresh"
    | "file"
    | "check"
    | "x"
    | "open"
    | "clock"
    | "print"
    | "save"
    | "warning"
    | "user";
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

  if (name === "open") {
    return (
      <svg {...common}>
        <path d="M14 3h7v7" />
        <path d="M10 14 21 3" />
        <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
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

  if (name === "warning") {
    return (
      <svg {...common}>
        <path d="m12 3 10 18H2L12 3z" />
        <path d="M12 9v5" />
        <path d="M12 17h.01" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg {...common}>
        <circle cx="12" cy="7" r="4" />
        <path d="M17 21a5 5 0 0 0-10 0" />
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

export default function AdminEmployeeFilePage() {
  const params = useParams();
  const employeeId = decodeURIComponent(String(params?.employeeId || ""));

  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [documents, setDocuments] = useState<AdminEmployeeDocument[]>([]);
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
  const [updatingDocId, setUpdatingDocId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const form101 = documents.find((doc) => doc.documentType === "form101") || null;
  const idCard = documents.find((doc) => doc.documentType === "idCard") || null;
  const agreement =
    documents.find((doc) => doc.documentType === "agreement") || null;

  const totalMinutes = useMemo(
    () =>
      hoursRows.reduce((sum, row) => sum + Number(row.totalMinutes || 0), 0),
    [hoursRows]
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

    try {
      setError("");
      setLoading(true);

      const [usersData, formsData, agreementsData] = await Promise.all([
        fetchJson(API.users, true),
        fetchJson(API.forms101),
        fetchJson(API.agreements),
      ]);

      const users = getArrayFromResponse<ApiUser>(usersData, [
        "users",
        "items",
        "data",
      ]);

      const forms = getArrayFromResponse<any>(formsData, [
        "documents",
        "forms",
        "items",
      ]);

      const agreements = getArrayFromResponse<any>(agreementsData, [
        "agreements",
        "documents",
        "items",
      ]);

      const user = users.find((item) => normalizeUserId(item) === employeeId);

      const mergedDocs: AdminEmployeeDocument[] = [];

      forms.forEach((form) => {
        if (String(form.employeeId || "") !== employeeId) return;

        mergedDocs.push({
          ...form,
          source: "form",
          documentType: form.documentType || "form101",
          fileUrl: form.fileUrl,
          startDate:
            form.startDate || form.employeeStartDate || form.employmentStartDate,
        });
      });

      agreements.forEach((agreementItem) => {
        if (String(agreementItem.employeeId || "") !== employeeId) return;

        mergedDocs.push({
          _id: agreementItem._id,
          id: agreementItem.id,
          source: "agreement",
          employeeId: agreementItem.employeeId,
          employeeName: agreementItem.employeeName || agreementItem.fullName,
          employeeEmail: agreementItem.employeeEmail || agreementItem.email,
          employeePhone: agreementItem.employeePhone || agreementItem.phone,
          documentType: "agreement",
          originalFileName: "הסכם עבודה חתום",
          fileUrl:
            agreementItem.signedFileUrl ||
            agreementItem.signedPdfUrl ||
            agreementItem.fileUrl ||
            agreementItem.pdfUrl,
          fileType: "application/pdf",
          status: agreementItem.status || "signed",
          uploadedAt: agreementItem.signedAt,
          createdAt: agreementItem.createdAt,
          updatedAt: agreementItem.updatedAt,
          startDate: agreementItem.startDate || null,
        });
      });

      mergedDocs.sort((a, b) => {
        const aDate = new Date(a.uploadedAt || a.createdAt || 0).getTime();
        const bDate = new Date(b.uploadedAt || b.createdAt || 0).getTime();
        return bDate - aDate;
      });

      const firstDoc = mergedDocs[0];

      setEmployee({
        id: employeeId,
        name:
          (user && normalizeUserName(user)) ||
          cleanStr(firstDoc?.employeeName) ||
          "עובד ללא שם",
        email: cleanStr(user?.email || firstDoc?.employeeEmail),
        phone: cleanStr(user?.phone || firstDoc?.employeePhone),
        startDate: cleanStr(
          user?.startDate ||
            user?.employeeStartDate ||
            user?.employmentStartDate ||
            firstDoc?.startDate
        ),
      });

      setDocuments(mergedDocs);
    } catch (loadError) {
      console.error("LOAD ADMIN EMPLOYEE FILE FAILED:", loadError);
      setError(
        loadError instanceof Error ? loadError.message : "שגיאה בטעינת תיק עובד"
      );
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  const loadHours = useCallback(async () => {
    if (!employeeId) return;

    try {
      setHoursLoading(true);

      const data = await fetchJson(API.hours(employeeId, month));

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

  useEffect(() => {
    void loadEmployee();
  }, [loadEmployee]);

  useEffect(() => {
    void loadHours();
  }, [loadHours]);

  async function updateDocumentStatus(
    doc: AdminEmployeeDocument,
    status: "approved" | "rejected"
  ) {
    const documentId = getDocumentId(doc);
    if (!documentId || updatingDocId) return;

    try {
      setUpdatingDocId(documentId);

      const url =
        doc.source === "agreement"
          ? API.updateAgreementStatus(documentId)
          : API.updateFormStatus(documentId);

      const response = await fetch(url, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "שגיאה בעדכון סטטוס מסמך");
      }

      setDocuments((prev) =>
        prev.map((item) =>
          getDocumentId(item) === documentId && item.source === doc.source
            ? { ...item, status, updatedAt: new Date().toISOString() }
            : item
        )
      );
    } catch (updateError) {
      console.error("UPDATE DOCUMENT STATUS FAILED:", updateError);
      alert(
        updateError instanceof Error
          ? updateError.message
          : "שגיאה בעדכון סטטוס מסמך"
      );
    } finally {
      setUpdatingDocId(null);
    }
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

  function printHours() {
    window.print();
  }

  function exportCsv() {
    const header = [
      "תאריך",
      "יום",
      "שיבוץ",
      "משמרת",
      "תחילת משמרת",
      "סיום משמרת",
      "כניסה בפועל",
      "יציאה בפועל",
      "סה״כ דקות",
      "סה״כ שעות",
      "הערות",
    ];

    const rows = hoursRows.map((row) => [
      row.date,
      row.dayName,
      row.isScheduled ? "כן" : "לא",
      row.shiftLabel,
      row.scheduledStart,
      row.scheduledEnd,
      row.actualStart,
      row.actualEnd,
      String(row.totalMinutes || 0),
      (Number(row.totalMinutes || 0) / 60).toFixed(2),
      row.note,
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `employee-hours-${employee?.name || employeeId}-${month}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen p-8 text-slate-950">
        <div className="mx-auto max-w-[1400px] rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
          <p className="mt-4 text-sm font-black text-slate-700">
            טוען תיק עובד...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="min-h-screen p-8 text-slate-950">
        <div className="mx-auto max-w-[1400px] rounded-[32px] border border-rose-200 bg-rose-50 p-10 text-center shadow-sm">
          <Icon name="warning" className="mx-auto h-10 w-10 text-rose-600" />
          <h1 className="mt-4 text-xl font-black text-rose-700">
            לא הצלחנו לפתוח תיק עובד
          </h1>
          <p className="mt-2 text-sm font-bold text-rose-600">{error}</p>
          <Link
            href="/admin/employees"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white"
          >
            חזרה לעובדים
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen text-slate-950">
      <style>{`
  @media print {
    body * {
      visibility: hidden !important;
    }

    #employee-hours-print,
    #employee-hours-print * {
      visibility: visible !important;
    }

    #employee-hours-print {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      background: #fff !important;
      padding: 24px !important;
    }

    .no-print {
      display: none !important;
    }

    #employee-hours-print table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    #employee-hours-print th,
    #employee-hours-print td {
      border: 1px solid #cbd5e1;
      padding: 7px;
      text-align: right;
    }

    #employee-hours-print input,
    #employee-hours-print textarea {
      border: none !important;
      padding: 0 !important;
      width: 100% !important;
    }
  }
`}</style>

      <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-6">
        <section className="no-print overflow-hidden rounded-[32px] bg-slate-950 p-6 text-white shadow-sm md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link
                href="/admin/employees"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white"
              >
                <Icon name="arrow" className="h-4 w-4" />
                חזרה לעובדים
              </Link>

              <div className="mt-5 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-white text-xl font-black text-slate-950">
                  {initials(employee?.name || "")}
                </div>

                <div>
                  <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                    תיק עובד
                  </h1>
                  <p className="mt-2 text-lg font-black text-slate-200">
                    {employee?.name || "עובד ללא שם"}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadEmployee();
                void loadHours();
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/15"
            >
              <Icon name="refresh" className="h-4 w-4" />
              רענון תיק עובד
            </button>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-4">
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-black text-slate-300">מייל</p>
              <p className="mt-2 break-all text-sm font-black">
                {employee?.email || "—"}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-black text-slate-300">טלפון</p>
              <p dir="ltr" className="mt-2 text-right text-sm font-black">
                {employee?.phone || "—"}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-black text-slate-300">
                תאריך תחילת עבודה
              </p>
              <p className="mt-2 text-sm font-black">
                {formatDate(employee?.startDate)}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-black text-slate-300">סה״כ שעות בחודש</p>
              <p className="mt-2 text-sm font-black">
                {formatWorkDuration(totalMinutes)}
              </p>
            </div>
          </div>
        </section>

        <section className="no-print rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                מסמכי עובד
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                כאן האדמין מאשר או דוחה מסמכים, והעובד רואה אחר כך את הסטטוס.
              </p>
            </div>

            <Icon name="file" className="h-7 w-7 text-slate-400" />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {[form101, idCard, agreement].map((doc, index) => {
              const fallbackType =
                index === 0 ? "form101" : index === 1 ? "idCard" : "agreement";

              const documentId = doc ? getDocumentId(doc) : "";
              const isUpdating = updatingDocId === documentId;

              return (
                <article
                  key={doc ? `${doc.source}-${documentId}` : fallbackType}
                  className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                        doc?.status
                      )}`}
                    >
                      {statusLabel(doc?.status)}
                    </span>

                    <div className="text-right">
                      <h3 className="text-lg font-black text-slate-950">
                        {documentTypeLabel(doc?.documentType || fallbackType)}
                      </h3>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {doc?.originalFileName || "לא הועלה קובץ"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 text-sm font-semibold text-slate-600">
                    <p>תאריך: {formatDateTime(doc?.uploadedAt || doc?.createdAt)}</p>
                    {doc?.taxYear ? <p>שנת מס: {doc.taxYear}</p> : null}
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {doc?.fileUrl ? (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center justify-center gap-1 rounded-2xl bg-slate-950 px-3 text-xs font-black text-white"
                      >
                        <Icon name="open" className="h-3.5 w-3.5" />
                        צפייה
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="h-10 rounded-2xl bg-slate-200 text-xs font-black text-slate-400"
                      >
                        אין קובץ
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!doc || isUpdating}
                      onClick={() => doc && void updateDocumentStatus(doc, "approved")}
                      className="h-10 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      אשר
                    </button>

                    <button
                      type="button"
                      disabled={!doc || isUpdating}
                      onClick={() => doc && void updateDocumentStatus(doc, "rejected")}
                      className="h-10 rounded-2xl border border-rose-200 bg-rose-50 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      דחה
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section
          id="employee-hours-print"
          className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm md:p-6"
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Icon name="clock" className="h-6 w-6 text-slate-500" />
                <h2 className="text-xl font-black text-slate-950">
                  שעות עבודה — {monthLabel(month)}
                </h2>
              </div>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                עובד/ת: {employee?.name || "—"} · מייל: {employee?.email || "—"} ·
                טלפון: {employee?.phone || "—"}
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                סטטוס שעות:{" "}
                <span className="font-black text-slate-900">
                  {statusLabel(hoursSummary.status)}
                </span>{" "}
                · סה״כ:{" "}
                <span className="font-black text-slate-900">
                  {formatWorkDuration(totalMinutes)}
                </span>{" "}
                · ימי עבודה:{" "}
                <span className="font-black text-slate-900">{workedDays}</span>
              </p>
            </div>

            <div className="no-print flex flex-wrap gap-2">
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
              />

              <button
                type="button"
                onClick={() => void loadHours()}
                disabled={hoursLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
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
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-black disabled:opacity-50"
              >
                <Icon name="save" className="h-4 w-4" />
                שמירה
              </button>

              <button
                type="button"
                onClick={() => void saveHours("approve")}
                disabled={savingHours}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <Icon name="check" className="h-4 w-4" />
                אישור שעות
              </button>

              <button
                type="button"
                onClick={() => void saveHours("reject")}
                disabled={savingHours}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 text-sm font-black text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                <Icon name="x" className="h-4 w-4" />
                דחייה
              </button>

              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                ייצוא CSV
              </button>

              <button
                type="button"
                onClick={printHours}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                <Icon name="print" className="h-4 w-4" />
                תדפיס לרו״ח
              </button>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-[24px] border border-slate-200">
            <table className="w-full min-w-[1100px] border-collapse text-right">
              <thead className="bg-slate-50">
                <tr className="text-xs text-slate-500">
                  <th className="px-4 py-3 font-black">תאריך</th>
                  <th className="px-4 py-3 font-black">יום</th>
                  <th className="px-4 py-3 font-black">שיבוץ</th>
                  <th className="px-4 py-3 font-black">מתוכנן</th>
                  <th className="px-4 py-3 font-black">כניסה בפועל</th>
                  <th className="px-4 py-3 font-black">יציאה בפועל</th>
                  <th className="px-4 py-3 font-black">סה״כ</th>
                  <th className="px-4 py-3 font-black">הערות</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {hoursLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm font-black text-slate-500"
                    >
                      טוען שעות...
                    </td>
                  </tr>
                ) : (
                  hoursRows.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50">
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
                        {row.scheduledStart || "—"} - {row.scheduledEnd || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="time"
                          value={row.actualStart}
                          onChange={(event) =>
                            updateHourRow(row.date, "actualStart", event.target.value)
                          }
                          className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-slate-400"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="time"
                          value={row.actualEnd}
                          onChange={(event) =>
                            updateHourRow(row.date, "actualEnd", event.target.value)
                          }
                          className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-slate-400"
                        />
                      </td>

                      <td className="px-4 py-3 text-sm font-black text-slate-800">
                        {formatWorkDuration(row.totalMinutes)}
                      </td>

                      <td className="px-4 py-3">
                        <textarea
                          value={row.note}
                          onChange={(event) =>
                            updateHourRow(row.date, "note", event.target.value)
                          }
                          rows={1}
                          placeholder="הערה לאדמין / רו״ח..."
                          className="min-h-10 w-full resize-y rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black text-slate-500">סה״כ שעות</p>
              <p className="mt-1 text-xl font-black text-slate-950">
                {formatWorkDuration(totalMinutes)}
              </p>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black text-slate-500">סה״כ דקות</p>
              <p className="mt-1 text-xl font-black text-slate-950">
                {totalMinutes}
              </p>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black text-slate-500">ימי עבודה</p>
              <p className="mt-1 text-xl font-black text-slate-950">
                {workedDays}
              </p>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black text-slate-500">סטטוס</p>
              <p className="mt-1 text-xl font-black text-slate-950">
                {statusLabel(hoursSummary.status)}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}