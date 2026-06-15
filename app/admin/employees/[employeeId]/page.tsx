"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

export const dynamic = "force-dynamic";

type DocumentStatus =
  | "missing"
  | "uploaded"
  | "approved"
  | "rejected"
  | "signed"
  | string;

type DocumentType = "form101" | "idCard" | "agreement" | string;

type EmployeeProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  idNumber: string;
  startDate: string;
  endDate: string;
  hourlyRate: number;
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

const API = {
  profile: (employeeId: string) =>
    `/api/admin/employees/${encodeURIComponent(employeeId)}/profile`,
  forms101: "/api/admin/forms/101",
  agreements: "/api/admin/employee-agreements",
  updateFormStatus: (formId: string) => `/api/admin/forms/101/${formId}/status`,
  updateAgreementStatus: (agreementId: string) =>
    `/api/admin/employee-agreements/${agreementId}/status`,
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

function toDateInput(value?: string | null) {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
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
    | "arrow"
    | "refresh"
    | "file"
    | "check"
    | "x"
    | "open"
    | "clock"
    | "save"
    | "warning"
    | "user"
    | "money"
    | "calendar"
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

  if (name === "save") {
    return (
      <svg {...common}>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <path d="M17 21v-8H7v8" />
        <path d="M7 3v5h8" />
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

export default function AdminEmployeeFilePage() {
  const params = useParams();
  const employeeId = decodeURIComponent(getParamValue(params?.employeeId as any));

  const [employee, setEmployee] = useState<EmployeeProfile>({
    id: employeeId,
    name: "",
    email: "",
    phone: "",
    address: "",
    idNumber: "",
    startDate: "",
    endDate: "",
    hourlyRate: 0,
  });

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
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingDocId, setUpdatingDocId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const form101 = documents.find((doc) => doc.documentType === "form101") || null;
  const idCard = documents.find((doc) => doc.documentType === "idCard") || null;
  const agreement =
    documents.find((doc) => doc.documentType === "agreement") || null;

  const documentCards = useMemo(
    () => [
      { type: "form101", doc: form101 },
      { type: "idCard", doc: idCard },
      { type: "agreement", doc: agreement },
    ],
    [form101, idCard, agreement]
  );

  const totalMinutes = useMemo(
    () => hoursRows.reduce((sum, row) => sum + Number(row.totalMinutes || 0), 0),
    [hoursRows]
  );

  const totalHoursDecimal = useMemo(() => totalMinutes / 60, [totalMinutes]);

  const estimatedMonthlyPayment = useMemo(
    () => totalHoursDecimal * Number(employee.hourlyRate || 0),
    [employee.hourlyRate, totalHoursDecimal]
  );

  const loadHoursSummary = useCallback(async () => {
    if (!employeeId) return;

    try {
      setHoursLoading(true);

      const data = await fetchJson(API.hours(employeeId, month), true);

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
      console.error("LOAD EMPLOYEE HOURS SUMMARY FAILED:", loadError);
      setHoursRows([]);
      setHoursSummary({
        month,
        totalMinutes: 0,
        scheduledDays: 0,
        workedDays: 0,
        status: "draft",
      });
    } finally {
      setHoursLoading(false);
    }
  }, [employeeId, month]);

  const loadEmployee = useCallback(async () => {
    if (!employeeId) return;

    try {
      setError("");
      setLoading(true);

      const [profileData, formsData, agreementsData] = await Promise.all([
        fetchJson(API.profile(employeeId), true),
        fetchJson(API.forms101),
        fetchJson(API.agreements),
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
      const profile = profileData?.employee || {};

      setEmployee({
        id: employeeId,
        name:
          cleanStr(profile.name) ||
          cleanStr(firstDoc?.employeeName) ||
          "עובד ללא שם",
        email: cleanStr(profile.email) || cleanStr(firstDoc?.employeeEmail),
        phone: cleanStr(profile.phone) || cleanStr(firstDoc?.employeePhone),
        address: cleanStr(profile.address),
        idNumber: cleanStr(profile.idNumber),
        startDate: toDateInput(profile.startDate || firstDoc?.startDate),
        endDate: toDateInput(profile.endDate),
        hourlyRate: Number(profile.hourlyRate || 0),
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

  useEffect(() => {
    void loadEmployee();
  }, [loadEmployee]);

  useEffect(() => {
    void loadHoursSummary();
  }, [loadHoursSummary]);

  async function saveProfile() {
    if (!employeeId || savingProfile) return;

    try {
      setSavingProfile(true);

      const response = await fetch(API.profile(employeeId), {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(employee),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "שגיאה בשמירת פרטי עובד");
      }

      const nextEmployee = data.employee || {};

      setEmployee((prev) => ({
        ...prev,
        name: cleanStr(nextEmployee.name) || prev.name,
        email: cleanStr(nextEmployee.email),
        phone: cleanStr(nextEmployee.phone),
        address: cleanStr(nextEmployee.address),
        idNumber: cleanStr(nextEmployee.idNumber),
        startDate: toDateInput(nextEmployee.startDate),
        endDate: toDateInput(nextEmployee.endDate),
        hourlyRate: Number(nextEmployee.hourlyRate || prev.hourlyRate || 0),
      }));

      alert("פרטי העובד נשמרו בהצלחה");
    } catch (saveError) {
      console.error("SAVE EMPLOYEE PROFILE FAILED:", saveError);
      alert(
        saveError instanceof Error
          ? saveError.message
          : "שגיאה בשמירת פרטי עובד"
      );
    } finally {
      setSavingProfile(false);
    }
  }

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

  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 p-8 text-slate-950"
      >
        <div className="mx-auto max-w-[1400px] rounded-[32px] border border-white/80 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-500" />
          <p className="mt-4 text-sm font-black text-slate-700">
            טוען תיק עובד...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 p-8 text-slate-950"
      >
        <div className="mx-auto max-w-[1400px] rounded-[32px] border border-rose-200 bg-rose-50 p-10 text-center shadow-sm">
          <Icon name="warning" className="mx-auto h-10 w-10 text-rose-600" />
          <h1 className="mt-4 text-xl font-black text-rose-700">
            לא הצלחנו לפתוח תיק עובד
          </h1>
          <p className="mt-2 text-sm font-bold text-rose-600">{error}</p>
          <Link
            href="/admin/employees"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-indigo-600 px-5 text-sm font-black text-white"
          >
            חזרה לעובדים
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 text-slate-950"
    >
      <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-6">
        <section className="overflow-hidden rounded-[34px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_60px_rgba(79,70,229,0.10)] backdrop-blur md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link
                href="/admin/employees"
                className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700 transition hover:bg-indigo-100"
              >
                <Icon name="arrow" className="h-4 w-4" />
                חזרה לעובדים
              </Link>

              <div className="mt-5 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-gradient-to-br from-indigo-100 to-fuchsia-100 text-xl font-black text-indigo-700 ring-1 ring-indigo-100">
                  {initials(employee.name)}
                </div>

                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
                    תיק עובד
                  </h1>
                  <p className="mt-2 text-lg font-black text-slate-600">
                    {employee.name || "עובד ללא שם"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/admin/employees/${encodeURIComponent(employeeId)}/hours`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-500 px-5 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:scale-[1.01]"
              >
                <Icon name="clock" className="h-4 w-4" />
                עמוד שעות מלא
              </Link>

              <button
                type="button"
                onClick={() => {
                  void loadEmployee();
                  void loadHoursSummary();
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
              >
                <Icon name="refresh" className="h-4 w-4" />
                רענון תיק עובד
              </button>
            </div>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-4">
            <div className="rounded-[24px] border border-indigo-100 bg-indigo-50 p-4">
              <p className="text-xs font-black text-indigo-500">מייל</p>
              <p className="mt-2 break-all text-sm font-black text-slate-800">
                {employee.email || "—"}
              </p>
            </div>

            <div className="rounded-[24px] border border-sky-100 bg-sky-50 p-4">
              <p className="text-xs font-black text-sky-600">טלפון</p>
              <p dir="ltr" className="mt-2 text-right text-sm font-black text-slate-800">
                {employee.phone || "—"}
              </p>
            </div>

            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-black text-emerald-600">
                תחילת העסקה
              </p>
              <p className="mt-2 text-sm font-black text-slate-800">
                {formatDate(employee.startDate)}
              </p>
            </div>

            <div className="rounded-[24px] border border-rose-100 bg-rose-50 p-4">
              <p className="text-xs font-black text-rose-600">סיום העסקה</p>
              <p className="mt-2 text-sm font-black text-slate-800">
                {formatDate(employee.endDate)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[34px] border border-white/80 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">פרטי עובד</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                כאן ממלאים את פרטי העובד. הפרטים האלה מסתנכרנים לרשימת העובדים
                הראשית באדמין.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={savingProfile}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-indigo-500 to-violet-500 px-5 text-sm font-black text-white shadow-md shadow-indigo-100 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="save" className="h-4 w-4" />
              {savingProfile ? "שומר..." : "שמירת פרטים"}
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">שם עובד</span>
              <input
                value={employee.name}
                onChange={(event) =>
                  setEmployee((prev) => ({ ...prev, name: event.target.value }))
                }
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                placeholder="לדוגמה: עובד מערכת בדיקה"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">מייל</span>
              <input
                value={employee.email}
                onChange={(event) =>
                  setEmployee((prev) => ({ ...prev, email: event.target.value }))
                }
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                placeholder="email@example.com"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">טלפון</span>
              <input
                dir="ltr"
                value={employee.phone}
                onChange={(event) =>
                  setEmployee((prev) => ({ ...prev, phone: event.target.value }))
                }
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-right text-sm font-bold outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                placeholder="0500000000"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">כתובת</span>
              <input
                value={employee.address}
                onChange={(event) =>
                  setEmployee((prev) => ({
                    ...prev,
                    address: event.target.value,
                  }))
                }
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                placeholder="כתובת העובד"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">
                תעודת זהות
              </span>
              <input
                dir="ltr"
                value={employee.idNumber}
                onChange={(event) =>
                  setEmployee((prev) => ({
                    ...prev,
                    idNumber: event.target.value,
                  }))
                }
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-right text-sm font-bold outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                placeholder="000000000"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">
                שכר שעתי לעובד
              </span>
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
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                placeholder="לדוגמה: 45"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">
                תחילת העסקה
              </span>
              <input
                type="date"
                value={employee.startDate}
                onChange={(event) =>
                  setEmployee((prev) => ({
                    ...prev,
                    startDate: event.target.value,
                  }))
                }
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black text-slate-500">
                סיום העסקה, אם יש
              </span>
              <input
                type="date"
                value={employee.endDate}
                onChange={(event) =>
                  setEmployee((prev) => ({
                    ...prev,
                    endDate: event.target.value,
                  }))
                }
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            </label>
          </div>
        </section>

        <section className="rounded-[34px] border border-white/80 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                <Icon name="clock" className="h-4 w-4" />
                סיכום שעות חודשי
              </div>

              <h2 className="mt-4 text-xl font-black text-slate-900">
                סיכום שעות — {monthLabel(month)}
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                כאן מוצג רק סיכום: כמה שעות יש, שכר שעתי שהוגדר לעובד ותשלום
                חודשי משוער. הדוח המלא לרו״ח נמצא בעמוד שעות עובד.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              />

              <button
                type="button"
                onClick={() => void loadHoursSummary()}
                disabled={hoursLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 disabled:opacity-50"
              >
                <Icon
                  name="refresh"
                  className={`h-4 w-4 ${hoursLoading ? "animate-spin" : ""}`}
                />
                רענון שעות
              </button>

              <Link
                href={`/admin/employees/${encodeURIComponent(employeeId)}/hours`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-black text-white shadow-md shadow-emerald-100 transition hover:bg-emerald-600"
              >
                <Icon name="open" className="h-4 w-4" />
                עמוד שעות מלא
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-xs font-black text-emerald-600">
                סה״כ שעות החודש
              </p>
              <p className="mt-2 text-2xl font-black text-emerald-950">
                {formatWorkDuration(totalMinutes)}
              </p>
              <p className="mt-1 text-xs font-bold text-emerald-700">
                {totalHoursDecimal.toFixed(2)} שעות מספרי
              </p>
            </div>

            <div className="rounded-[24px] border border-indigo-100 bg-indigo-50 p-5">
              <p className="text-xs font-black text-indigo-600">
                שכר שעתי מוגדר
              </p>
              <p className="mt-2 text-2xl font-black text-indigo-950">
                {formatMoney(Number(employee.hourlyRate || 0))}
              </p>
              <p className="mt-1 text-xs font-bold text-indigo-700">
                נשמר בפרטי העובד
              </p>
            </div>

            <div className="rounded-[24px] border border-violet-100 bg-violet-50 p-5">
              <p className="text-xs font-black text-violet-600">
                תשלום חודשי משוער
              </p>
              <p className="mt-2 text-2xl font-black text-violet-950">
                {formatMoney(estimatedMonthlyPayment)}
              </p>
              <p className="mt-1 text-xs font-bold text-violet-700">
                שעות × שכר שעתי
              </p>
            </div>

            <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-5">
              <p className="text-xs font-black text-amber-600">סטטוס שעות</p>
              <p className="mt-2 text-2xl font-black text-amber-950">
                {statusLabel(hoursSummary.status)}
              </p>
              <p className="mt-1 text-xs font-bold text-amber-700">
                {hoursSummary.approvedAt
                  ? `אושר: ${formatDateTime(hoursSummary.approvedAt)}`
                  : "טרם אושר"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[34px] border border-white/80 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">מסמכי עובד</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                המסמכים נשארים בתוך תיק העובד בלבד. כאן אפשר לצפות, לאשר או
                לדחות.
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
              <Icon name="file" className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {documentCards.map(({ type, doc }) => {
              const documentId = doc ? getDocumentId(doc) : "";
              const isUpdating = updatingDocId === documentId;

              return (
                <article
                  key={doc ? `${doc.source}-${documentId}` : type}
                  className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 transition hover:border-indigo-100 hover:bg-white"
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
                      <h3 className="text-lg font-black text-slate-900">
                        {documentTypeLabel(doc?.documentType || type)}
                      </h3>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {doc?.originalFileName || "לא הועלה קובץ"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 text-sm font-semibold text-slate-600">
                    <p>
                      תאריך: {formatDateTime(doc?.uploadedAt || doc?.createdAt)}
                    </p>
                    {doc?.taxYear ? <p>שנת מס: {doc.taxYear}</p> : null}
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {doc?.fileUrl ? (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center justify-center gap-1 rounded-2xl bg-indigo-600 px-3 text-xs font-black text-white transition hover:bg-indigo-700"
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
                      onClick={() =>
                        doc && void updateDocumentStatus(doc, "approved")
                      }
                      className="h-10 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      אשר
                    </button>

                    <button
                      type="button"
                      disabled={!doc || isUpdating}
                      onClick={() =>
                        doc && void updateDocumentStatus(doc, "rejected")
                      }
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
      </div>
    </div>
  );
}