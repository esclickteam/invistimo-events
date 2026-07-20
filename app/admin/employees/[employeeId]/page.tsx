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

type DocumentType =
  | "form101"
  | "idCard"
  | "idCardAppendix"
  | "accountManagement"
  | "agreement"
  | "termination_request"
  | "payslip"
  | string;

type EmployeeProfile = {
  id: string;
  businessId: string;
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
  businessId?: string;
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
  month?: string;
  payrollMonth?: string;
  status?: DocumentStatus;
  uploadedAt?: string;
  sentAt?: string | null;
  templateType?: string;
  templateTypeLabel?: string;
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

type EmployeeSaleRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  saleTitle: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  eventName: string;
  eventDate: string;
  eventCity: string;
  venueName: string;
  dealAmountBeforeVat: number;
  dealAmountAfterVat: number;
  commissionRate: number;
  commissionAmount: number;
  paymentMode: string;
  paymentProvider: string;
  status: string;
  saleDate: string;
  paidAt: string;
  createdAt: string;
  notes: string;
};

type EmployeeSalesTotals = {
  salesCount: number;
  totalBeforeVat: number;
  totalAfterVat: number;
  totalCommission: number;
  paidSalesCount: number;
  paidBeforeVat: number;
  paidAfterVat: number;
  paidCommission: number;
};

const API = {
  profile: (employeeId: string) =>
    `/api/admin/employees/${encodeURIComponent(employeeId)}/profile`,
  forms101: "/api/admin/forms/101",
  agreements: "/api/admin/employee-agreements",
  updateFormStatus: (formId: string) => `/api/admin/forms/101/${formId}/status`,
  updateAgreementStatus: (agreementId: string) =>
    `/api/admin/employee-agreements/${agreementId}/status`,
  uploadForm101: "/api/forms/101/upload",
  uploadPayslip: "/api/forms/101/upload",
  hours: (employeeId: string, month: string) =>
    `/api/admin/employees/${encodeURIComponent(
      employeeId,
    )}/hours?month=${encodeURIComponent(month)}`,
  sales: (employeeId: string, month: string) =>
    `/api/admin/employees/${encodeURIComponent(
      employeeId,
    )}/sales?month=${encodeURIComponent(month)}&status=all`,
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
    date.getDate(),
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

function formatFileSize(size?: number) {
  if (!size) return "—";

  const mb = Number(size) / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(1)}MB`;

  return `${Math.round(Number(size) / 1024)}KB`;
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
    case "pending":
      return "ממתין לתשלום";
    case "paid":
      return "שולם";
    case "cancelled":
      return "בוטל";
    case "refunded":
      return "זוכה";
    default:
      return "לא הועלה";
  }
}

function documentStatusLabel(doc?: AdminEmployeeDocument | null) {
  const status = String(doc?.status || "").toLowerCase();
  const isAgreementDoc =
    doc?.source === "agreement" ||
    doc?.documentType === "agreement" ||
    doc?.documentType === "termination_request";

  if (isAgreementDoc && status === "pending") {
    return "ממתין למילוי";
  }

  return statusLabel(doc?.status);
}

function statusClass(status?: string) {
  switch (String(status || "").toLowerCase()) {
    case "approved":
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
    case "cancelled":
    case "refunded":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "signed":
    case "uploaded":
    case "submitted":
    case "pending":
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
    case "idCardAppendix":
      return "ספח תעודת זהות";
    case "accountManagement":
      return "אישור ניהול חשבון";
    case "agreement":
      return "הסכם עבודה";
    case "termination_request":
      return "בקשה לסיום העסקה";
    case "payslip":
      return "תלוש שכר";
    default:
      return "מסמך עובד";
  }
}

function paymentModeLabel(value?: string) {
  switch (String(value || "").toLowerCase()) {
    case "full":
      return "תשלום מלא";
    case "split":
      return "שני תשלומים";
    default:
      return "—";
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

function safeDocumentUrl(doc?: AdminEmployeeDocument | null) {
  return cleanStr(doc?.fileUrl);
}

function isForm101Document(doc?: AdminEmployeeDocument | null) {
  return String(doc?.documentType || "") === "form101";
}

function isPayslipDocument(doc?: AdminEmployeeDocument | null) {
  return String(doc?.documentType || "") === "payslip";
}

function documentViewLabel(doc?: AdminEmployeeDocument | null) {
  if (isForm101Document(doc)) return "צפייה בטופס השמור";
  if (isPayslipDocument(doc)) return "צפייה בתלוש";
  return "צפייה";
}

function documentExportLabel(doc?: AdminEmployeeDocument | null) {
  if (isForm101Document(doc)) return "ייצוא PDF שמור";
  if (isPayslipDocument(doc)) return "הורדת תלוש";
  return "הורדה";
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
    | "download"
    | "clock"
    | "save"
    | "warning"
    | "user"
    | "money"
    | "calendar"
    | "sparkles"
    | "sales"
    | "upload";
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

  if (name === "download") {
    return (
      <svg {...common}>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
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

  if (name === "sales") {
    return (
      <svg {...common}>
        <path d="M3 3v18h18" />
        <path d="m7 15 4-4 3 3 6-7" />
        <path d="M18 7h2v2" />
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
    businessId: "",
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

  const [salesRows, setSalesRows] = useState<EmployeeSaleRow[]>([]);
  const [salesTotals, setSalesTotals] = useState<EmployeeSalesTotals>({
    salesCount: 0,
    totalBeforeVat: 0,
    totalAfterVat: 0,
    totalCommission: 0,
    paidSalesCount: 0,
    paidBeforeVat: 0,
    paidAfterVat: 0,
    paidCommission: 0,
  });

  const [loading, setLoading] = useState(true);
  const [hoursLoading, setHoursLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingDocId, setUpdatingDocId] = useState<string | null>(null);
  const [form101UploadFile, setForm101UploadFile] = useState<File | null>(null);
  const [uploadingForm101, setUploadingForm101] = useState(false);
  const [payslipUploadFiles, setPayslipUploadFiles] = useState<File[]>([]);
  const [uploadingPayslips, setUploadingPayslips] = useState(false);
  const [error, setError] = useState("");
  const [salesError, setSalesError] = useState("");

  const form101 = documents.find((doc) => doc.documentType === "form101") || null;
  const idCard = documents.find((doc) => doc.documentType === "idCard") || null;
  const idCardAppendix =
    documents.find((doc) => doc.documentType === "idCardAppendix") || null;
  const accountManagement =
    documents.find((doc) => doc.documentType === "accountManagement") || null;
  const agreement =
    documents.find((doc) => doc.documentType === "agreement") || null;
  const terminationRequest =
    documents.find((doc) => doc.documentType === "termination_request") || null;

  const payslips = useMemo(
    () =>
      documents
        .filter((doc) => String(doc.documentType || "") === "payslip")
        .sort((a, b) => {
          const aDate = new Date(a.uploadedAt || a.createdAt || 0).getTime();
          const bDate = new Date(b.uploadedAt || b.createdAt || 0).getTime();
          return bDate - aDate;
        }),
    [documents],
  );

  const payslipsForMonth = useMemo(
    () =>
      payslips.filter((doc) => {
        const docMonth =
          cleanStr(doc.payrollMonth) ||
          cleanStr(doc.month) ||
          cleanStr(doc.uploadedAt || doc.createdAt).slice(0, 7);

        return docMonth === month;
      }),
    [payslips, month],
  );

  const documentCards = useMemo(
    () => [
      { type: "form101", doc: form101 },
      { type: "idCard", doc: idCard },
      { type: "idCardAppendix", doc: idCardAppendix },
      { type: "accountManagement", doc: accountManagement },
      { type: "agreement", doc: agreement },
      { type: "termination_request", doc: terminationRequest },
    ],
    [form101, idCard, idCardAppendix, accountManagement, agreement, terminationRequest],
  );

  const totalMinutes = useMemo(
    () => hoursRows.reduce((sum, row) => sum + Number(row.totalMinutes || 0), 0),
    [hoursRows],
  );

  const totalHoursDecimal = useMemo(() => totalMinutes / 60, [totalMinutes]);

  const estimatedMonthlyPayment = useMemo(
    () => totalHoursDecimal * Number(employee.hourlyRate || 0),
    [employee.hourlyRate, totalHoursDecimal],
  );

  const estimatedMonthlyPaymentWithCommissions = useMemo(
    () => estimatedMonthlyPayment + Number(salesTotals.paidCommission || 0),
    [estimatedMonthlyPayment, salesTotals.paidCommission],
  );

  const loadSalesSummary = useCallback(async () => {
    if (!employeeId) return;

    try {
      setSalesLoading(true);
      setSalesError("");

      const data = await fetchJson(API.sales(employeeId, month), true);

      const rows = Array.isArray(data?.sales) ? data.sales : [];
      const totals = data?.totals || {};

      setSalesRows(
        rows.map((sale: any) => ({
          id: cleanStr(sale.id),
          employeeId: cleanStr(sale.employeeId),
          employeeName: cleanStr(sale.employeeName),
          employeeEmail: cleanStr(sale.employeeEmail),
          saleTitle: cleanStr(sale.saleTitle) || "מכירה",
          clientName: cleanStr(sale.clientName),
          clientEmail: cleanStr(sale.clientEmail),
          clientPhone: cleanStr(sale.clientPhone),
          eventName: cleanStr(sale.eventName),
          eventDate: cleanStr(sale.eventDate),
          eventCity: cleanStr(sale.eventCity),
          venueName: cleanStr(sale.venueName),
          dealAmountBeforeVat: Number(sale.dealAmountBeforeVat || 0),
          dealAmountAfterVat: Number(sale.dealAmountAfterVat || 0),
          commissionRate: Number(sale.commissionRate || 5),
          commissionAmount: Number(sale.commissionAmount || 0),
          paymentMode: cleanStr(sale.paymentMode),
          paymentProvider: cleanStr(sale.paymentProvider),
          status: cleanStr(sale.status) || "pending",
          saleDate: cleanStr(sale.saleDate),
          paidAt: cleanStr(sale.paidAt),
          createdAt: cleanStr(sale.createdAt),
          notes: cleanStr(sale.notes),
        })),
      );

      setSalesTotals({
        salesCount: Number(totals.salesCount || 0),
        totalBeforeVat: Number(totals.totalBeforeVat || 0),
        totalAfterVat: Number(totals.totalAfterVat || 0),
        totalCommission: Number(totals.totalCommission || 0),
        paidSalesCount: Number(totals.paidSalesCount || 0),
        paidBeforeVat: Number(totals.paidBeforeVat || 0),
        paidAfterVat: Number(totals.paidAfterVat || 0),
        paidCommission: Number(totals.paidCommission || 0),
      });
    } catch (loadError) {
      console.error("LOAD EMPLOYEE SALES SUMMARY FAILED:", loadError);
      setSalesRows([]);
      setSalesTotals({
        salesCount: 0,
        totalBeforeVat: 0,
        totalAfterVat: 0,
        totalCommission: 0,
        paidSalesCount: 0,
        paidBeforeVat: 0,
        paidAfterVat: 0,
        paidCommission: 0,
      });
      setSalesError(
        loadError instanceof Error ? loadError.message : "שגיאה בטעינת מכירות",
      );
    } finally {
      setSalesLoading(false);
    }
  }, [employeeId, month]);

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
        })),
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

        const fileUrl = cleanStr(form.fileUrl);

        mergedDocs.push({
          ...form,
          source: "form",
          businessId: cleanStr(form.businessId),
          documentType: form.documentType || "form101",
          fileUrl,
          month: cleanStr(form.month),
          payrollMonth: cleanStr(form.payrollMonth),
          startDate:
            form.startDate || form.employeeStartDate || form.employmentStartDate,
        });
      });

      agreements.forEach((agreementItem) => {
        if (String(agreementItem.employeeId || "") !== employeeId) return;

        const templateType = String(
          agreementItem.templateType || "phone_representative_agreement",
        );
        const isTermination = templateType === "termination_request";

        const fileUrl = cleanStr(
          agreementItem.signedFileUrl ||
            agreementItem.signedPdfUrl ||
            agreementItem.fileUrl ||
            agreementItem.pdfUrl,
        );

        const status = cleanStr(agreementItem.status) || (fileUrl ? "signed" : "pending");

        mergedDocs.push({
          _id: agreementItem._id,
          id: agreementItem.id,
          source: "agreement",
          employeeId: agreementItem.employeeId,
          employeeName: agreementItem.employeeName || agreementItem.fullName,
          employeeEmail: agreementItem.employeeEmail || agreementItem.email,
          employeePhone: agreementItem.employeePhone || agreementItem.phone,
          documentType: isTermination ? "termination_request" : "agreement",
          templateType,
          templateTypeLabel:
            agreementItem.templateTypeLabel ||
            (isTermination ? "בקשה לסיום העסקה" : "הסכם עבודה"),
          originalFileName: isTermination
            ? "בקשה לסיום העסקה"
            : "הסכם עבודה חתום",
          fileUrl,
          fileType: "application/pdf",
          status,
          sentAt: agreementItem.sentAt || null,
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
        businessId:
          cleanStr(profile.businessId) ||
          cleanStr(firstDoc?.businessId) ||
          cleanStr(forms.find((form) => String(form.employeeId || "") === employeeId)?.businessId),
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
        loadError instanceof Error ? loadError.message : "שגיאה בטעינת תיק עובד",
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
    void loadSalesSummary();
  }, [loadHoursSummary, loadSalesSummary]);

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
          : "שגיאה בשמירת פרטי עובד",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function updateDocumentStatus(
    doc: AdminEmployeeDocument,
    status: "approved" | "rejected",
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
            : item,
        ),
      );
    } catch (updateError) {
      console.error("UPDATE DOCUMENT STATUS FAILED:", updateError);
      alert(
        updateError instanceof Error
          ? updateError.message
          : "שגיאה בעדכון סטטוס מסמך",
      );
    } finally {
      setUpdatingDocId(null);
    }
  }


  async function uploadForm101ForEmployee() {
    if (uploadingForm101) return;

    try {
      if (!form101UploadFile) {
        alert("בחרי קובץ PDF של טופס 101 קודם");
        return;
      }

      if (!employeeId) {
        alert("חסר מזהה עובד");
        return;
      }

      const optionalBusinessId =
        cleanStr(employee.businessId) ||
        cleanStr(form101?.businessId) ||
        cleanStr(idCard?.businessId) ||
        cleanStr(accountManagement?.businessId) ||
        cleanStr(agreement?.businessId) ||
        cleanStr(payslips.find((item) => item.businessId)?.businessId) ||
        cleanStr(documents.find((item) => item.businessId)?.businessId);

      setUploadingForm101(true);

      const formData = new FormData();
      formData.append("file", form101UploadFile);
      formData.append("employeeId", employeeId);
      formData.append("documentType", "form101");
      formData.append("taxYear", String(new Date().getFullYear()));

      if (optionalBusinessId) {
        formData.append("businessId", optionalBusinessId);
      }

      const response = await fetch(API.uploadForm101, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || data?.message || "שגיאה בהעלאת טופס 101");
      }

      setForm101UploadFile(null);
      await loadEmployee();
      alert("טופס 101 הועלה לתיק העובד בהצלחה");
    } catch (uploadError) {
      console.error("ADMIN UPLOAD FORM 101 FAILED:", uploadError);
      alert(
        uploadError instanceof Error
          ? uploadError.message
          : "שגיאה בהעלאת טופס 101",
      );
    } finally {
      setUploadingForm101(false);
    }
  }

  async function uploadPayslipsForEmployee() {
    if (uploadingPayslips) return;

    try {
      if (payslipUploadFiles.length === 0) {
        alert("בחרי לפחות קובץ אחד של תלוש שכר");
        return;
      }

      if (!employeeId) {
        alert("חסר מזהה עובד");
        return;
      }

      const optionalBusinessId =
        cleanStr(employee.businessId) ||
        cleanStr(form101?.businessId) ||
        cleanStr(idCard?.businessId) ||
        cleanStr(accountManagement?.businessId) ||
        cleanStr(agreement?.businessId) ||
        cleanStr(payslips.find((item) => item.businessId)?.businessId) ||
        cleanStr(documents.find((item) => item.businessId)?.businessId);

      setUploadingPayslips(true);

      for (const file of payslipUploadFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("employeeId", employeeId);
        formData.append("documentType", "payslip");
        formData.append("taxYear", String(Number(month.slice(0, 4)) || new Date().getFullYear()));
        formData.append("month", month);
        formData.append("payrollMonth", month);

        if (optionalBusinessId) {
          formData.append("businessId", optionalBusinessId);
        }

        const response = await fetch(API.uploadPayslip, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || data?.success === false) {
          throw new Error(
            data?.error ||
              data?.message ||
              `שגיאה בהעלאת תלוש שכר: ${file.name}`,
          );
        }
      }

      setPayslipUploadFiles([]);
      await loadEmployee();
      alert("תלושי השכר הועלו לתיק העובד בהצלחה");
    } catch (uploadError) {
      console.error("ADMIN UPLOAD PAYSLIPS FAILED:", uploadError);
      alert(
        uploadError instanceof Error
          ? uploadError.message
          : "שגיאה בהעלאת תלושי שכר",
      );
    } finally {
      setUploadingPayslips(false);
    }
  }

  function excelSafe(value: unknown) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function excelNumber(value: unknown) {
    const numberValue = Number(value || 0);
    return Number.isFinite(numberValue) ? numberValue.toFixed(2) : "0.00";
  }

  function excelFileName(value: string) {
    return String(value || "דוח")
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 120);
  }

  function downloadExcelHtml(filename: string, html: string) {
    const blob = new Blob(["\uFEFF" + html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function buildExcelCell(value: unknown, className = "") {
    return `<td class="${className}">${excelSafe(value)}</td>`;
  }

  function buildExcelHeader(cells: string[]) {
    return `<tr>${cells
      .map((cell) => `<th>${excelSafe(cell)}</th>`)
      .join("")}</tr>`;
  }

  function exportAccountantHoursAndSalesReport() {
    const employeeFullNameForReport = cleanStr(employee.name) || "—";
    const employeeIdNumberForReport = cleanStr(employee.idNumber) || "—";
    const employeePhoneForReport = cleanStr(employee.phone) || "—";
    const employeeEmailForReport = cleanStr(employee.email) || "—";
    const employeeAddressForReport = cleanStr(employee.address) || "—";
    const employeeSystemIdForReport = cleanStr(employee.id || employeeId) || "—";

    const hourlyRate = Number(employee.hourlyRate || 0);
    const hoursAmount = Number(estimatedMonthlyPayment || 0);
    const paidCommissionAmount = Number(salesTotals.paidCommission || 0);
    const grossTotalToPay = Number(
      (hoursAmount + paidCommissionAmount).toFixed(2),
    );

    const hoursRowsHtml = hoursRows
      .map((row, index) => {
        const rowHours = Number(row.totalMinutes || 0) / 60;
        const rowAmount = Number((rowHours * hourlyRate).toFixed(2));

        return `<tr class="${index % 2 ? "alt" : ""}">
          ${buildExcelCell(formatDate(row.date))}
          ${buildExcelCell(row.dayName || "—")}
          ${buildExcelCell(row.isScheduled ? "כן" : "לא")}
          ${buildExcelCell(row.shiftLabel || "—")}
          ${buildExcelCell(row.scheduledStart || "—", "ltr")}
          ${buildExcelCell(row.scheduledEnd || "—", "ltr")}
          ${buildExcelCell(row.actualStart || "—", "ltr")}
          ${buildExcelCell(row.actualEnd || "—", "ltr")}
          ${buildExcelCell(row.totalMinutes || 0, "num")}
          ${buildExcelCell(rowHours.toFixed(2), "num")}
          ${buildExcelCell(hourlyRate.toFixed(2), "money")}
          ${buildExcelCell(rowAmount.toFixed(2), "money")}
          ${buildExcelCell(statusLabel(row.status))}
          ${buildExcelCell(row.note || "")}
        </tr>`;
      })
      .join("");

    const salesRowsHtml = salesRows
      .map(
        (sale, index) => `<tr class="${index % 2 ? "alt" : ""}">
        ${buildExcelCell(formatDate(sale.paidAt || sale.saleDate || sale.createdAt))}
        ${buildExcelCell(sale.saleTitle || "מכירה")}
        ${buildExcelCell(sale.clientName || "—")}
        ${buildExcelCell(sale.clientPhone || "—", "ltr")}
        ${buildExcelCell(sale.clientEmail || "—", "ltr")}
        ${buildExcelCell(excelNumber(sale.dealAmountBeforeVat), "money")}
        ${buildExcelCell(excelNumber(sale.dealAmountAfterVat), "money")}
        ${buildExcelCell(excelNumber(sale.commissionAmount), "money highlight")}
        ${buildExcelCell(paymentModeLabel(sale.paymentMode))}
        ${buildExcelCell(statusLabel(sale.status))}
        ${buildExcelCell(sale.notes || "")}
      </tr>`,
      )
      .join("");

    const html = `
      <!doctype html>
      <html dir="rtl">
        <head>
          <meta charSet="utf-8" />
          <style>
            body { direction: rtl; font-family: Arial, sans-serif; color: #111827; background: #ffffff; }
            table { border-collapse: collapse; width: 100%; direction: rtl; }
            th { background: #1e293b; color: #ffffff; font-weight: 800; border: 1px solid #94a3b8; padding: 9px; text-align: right; white-space: nowrap; }
            td { border: 1px solid #cbd5e1; padding: 8px; text-align: right; vertical-align: middle; mso-number-format: "\\@"; }
            .title { background: #312e81; color: #ffffff; font-size: 24px; font-weight: 800; padding: 18px; text-align: center; }
            .subtitle { background: #eef2ff; color: #3730a3; font-size: 14px; font-weight: 700; padding: 10px; text-align: center; }
            .section { background: #0f766e; color: #ffffff; font-size: 16px; font-weight: 800; padding: 10px; text-align: right; }
            .summary-label { background: #f8fafc; color: #475569; font-weight: 800; }
            .summary-value { background: #ffffff; color: #111827; font-weight: 800; }
            .total-label { background: #fef3c7; color: #92400e; font-weight: 900; }
            .total-value { background: #fffbeb; color: #78350f; font-weight: 900; font-size: 15px; }
            .alt td { background: #f8fafc; }
            .num, .money, .ltr { direction: ltr; text-align: left; }
            .num { mso-number-format: "0.00"; }
            .money { mso-number-format: "#,##0.00"; font-weight: 700; }
            .highlight { color: #047857; background: #ecfdf5; font-weight: 900; }
            .spacer td { border: none; height: 14px; background: #ffffff; }
          </style>
        </head>
        <body>
          <table>
            <tr><td class="title" colspan="14">דוח שעות ומכירות לרואה חשבון</td></tr>
            <tr><td class="subtitle" colspan="14">${excelSafe(employeeFullNameForReport)} · ${excelSafe(monthLabel(month))}</td></tr>
            <tr class="spacer"><td colspan="14"></td></tr>
            <tr><td class="section" colspan="14">פרטי עובד מלאים</td></tr>
            <tr>
              <td class="summary-label">שם מלא</td><td class="summary-value" colspan="3">${excelSafe(employeeFullNameForReport)}</td>
              <td class="summary-label">תעודת זהות</td><td class="summary-value ltr" colspan="2">${excelSafe(employeeIdNumberForReport)}</td>
              <td class="summary-label">טלפון</td><td class="summary-value ltr" colspan="2">${excelSafe(employeePhoneForReport)}</td>
              <td class="summary-label">מייל</td><td class="summary-value ltr" colspan="4">${excelSafe(employeeEmailForReport)}</td>
            </tr>
            <tr>
              <td class="summary-label">כתובת</td><td class="summary-value" colspan="5">${excelSafe(employeeAddressForReport)}</td>
              <td class="summary-label">תחילת העסקה</td><td class="summary-value" colspan="2">${excelSafe(formatDate(employee.startDate))}</td>
              <td class="summary-label">סיום העסקה</td><td class="summary-value" colspan="2">${excelSafe(formatDate(employee.endDate))}</td>
              <td class="summary-label">חודש דוח</td><td class="summary-value" colspan="2">${excelSafe(monthLabel(month))}</td>
            </tr>
            <tr><td class="summary-label">מזהה עובד במערכת</td><td class="summary-value ltr" colspan="13">${excelSafe(employeeSystemIdForReport)}</td></tr>
            <tr class="spacer"><td colspan="14"></td></tr>
            <tr><td class="section" colspan="14">סיכום לתשלום ברוטו</td></tr>
            <tr>
              <td class="summary-label">סה״כ שעות</td><td class="summary-value money">${excelNumber(totalHoursDecimal)}</td>
              <td class="summary-label">שכר שעתי</td><td class="summary-value money">${excelNumber(hourlyRate)}</td>
              <td class="summary-label">תשלום שעות</td><td class="summary-value money">${excelNumber(hoursAmount)}</td>
              <td class="summary-label">מכירות ששולמו</td><td class="summary-value num">${salesTotals.paidSalesCount}</td>
              <td class="summary-label">מכירות לפני מע״מ</td><td class="summary-value money">${excelNumber(salesTotals.paidBeforeVat)}</td>
              <td class="summary-label">עמלות 5%</td><td class="summary-value money highlight">${excelNumber(paidCommissionAmount)}</td>
              <td class="total-label">סה״כ ברוטו</td><td class="total-value money">${excelNumber(grossTotalToPay)}</td>
            </tr>
            <tr class="spacer"><td colspan="14"></td></tr>
            <tr><td class="section" colspan="14">פירוט יומי של שעות</td></tr>
          </table>

          <table>
            ${buildExcelHeader([
              "תאריך",
              "יום",
              "משובץ",
              "משמרת",
              "התחלה מתוכנן",
              "סיום מתוכנן",
              "התחלה בפועל",
              "סיום בפועל",
              "סה״כ דקות",
              "סה״כ שעות",
              "שכר שעתי",
              "סכום יומי ברוטו",
              "סטטוס",
              "הערה",
            ])}
            ${hoursRowsHtml || `<tr><td colspan="14">אין נתוני שעות לחודש הזה</td></tr>`}
          </table>

          <table>
            <tr class="spacer"><td colspan="11"></td></tr>
            <tr><td class="section" colspan="11">פירוט מכירות ועמלות</td></tr>
          </table>

          <table>
            ${buildExcelHeader([
              "תאריך",
              "איזה מכירה",
              "לקוח",
              "טלפון לקוח",
              "מייל לקוח",
              "סכום לפני מע״מ",
              "סכום אחרי מע״מ",
              "עמלה 5%",
              "תשלום",
              "סטטוס",
              "הערות",
            ])}
            ${salesRowsHtml || `<tr><td colspan="11">אין מכירות לחודש הזה</td></tr>`}
          </table>
        </body>
      </html>
    `;

    downloadExcelHtml(
      excelFileName(`דוח-שעות-ומכירות-${employee.name || "עובד"}-${month}`),
      html,
    );
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
              <button
                type="button"
                onClick={exportAccountantHoursAndSalesReport}
                disabled={hoursLoading || salesLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-fuchsia-500 to-purple-500 px-5 text-sm font-black text-white shadow-lg shadow-fuchsia-100 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="file" className="h-4 w-4" />
                ייצוא שעות ומכירות לרו״ח
              </button>

              <Link
                href={`/admin/employees/${encodeURIComponent(employeeId)}/sales`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-indigo-500 to-blue-500 px-5 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:scale-[1.01]"
              >
                <Icon name="sales" className="h-4 w-4" />
                עמוד מכירות שלי
              </Link>

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
                  void loadSalesSummary();
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
                onClick={() => {
                  void loadHoursSummary();
                  void loadSalesSummary();
                }}
                disabled={hoursLoading || salesLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 disabled:opacity-50"
              >
                <Icon
                  name="refresh"
                  className={`h-4 w-4 ${
                    hoursLoading || salesLoading ? "animate-spin" : ""
                  }`}
                />
                רענון חודש
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

          <div className="mt-5 grid gap-3 md:grid-cols-5">
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
                תשלום שעות משוער
              </p>
              <p className="mt-2 text-2xl font-black text-violet-950">
                {formatMoney(estimatedMonthlyPayment)}
              </p>
              <p className="mt-1 text-xs font-bold text-violet-700">
                שעות × שכר שעתי
              </p>
            </div>

            <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-5">
              <p className="text-xs font-black text-amber-600">
                עמלות מכירה ששולמו
              </p>
              <p className="mt-2 text-2xl font-black text-amber-950">
                {formatMoney(salesTotals.paidCommission)}
              </p>
              <p className="mt-1 text-xs font-bold text-amber-700">
                5% מהסכום לפני מע״מ
              </p>
            </div>

            <div className="rounded-[24px] border border-fuchsia-100 bg-fuchsia-50 p-5">
              <p className="text-xs font-black text-fuchsia-600">
                שעות + עמלות
              </p>
              <p className="mt-2 text-2xl font-black text-fuchsia-950">
                {formatMoney(estimatedMonthlyPaymentWithCommissions)}
              </p>
              <p className="mt-1 text-xs font-bold text-fuchsia-700">
                לחישוב פנימי
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[34px] border border-white/80 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700">
                <Icon name="sales" className="h-4 w-4" />
                מכירות ועמלות
              </div>

              <h2 className="mt-4 text-xl font-black text-slate-900">
                מכירות העובד — {monthLabel(month)}
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                כאן מוצגות כל המכירות ששויכו לעובד. עמלת המכירה היא 5% מהסכום
                לפני מע״מ. הסכום לתשלום בפועל מחושב לפי מכירות בסטטוס שולם.
              </p>
            </div>
          </div>

          {salesError ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
              {salesError}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-[24px] border border-indigo-100 bg-indigo-50 p-5">
              <p className="text-xs font-black text-indigo-600">סה״כ מכירות</p>
              <p className="mt-2 text-3xl font-black text-indigo-950">
                {salesTotals.salesCount}
              </p>
              <p className="mt-1 text-xs font-bold text-indigo-700">
                שולם: {salesTotals.paidSalesCount}
              </p>
            </div>

            <div className="rounded-[24px] border border-sky-100 bg-sky-50 p-5">
              <p className="text-xs font-black text-sky-600">
                סכום לפני מע״מ
              </p>
              <p className="mt-2 text-2xl font-black text-sky-950">
                {formatMoney(salesTotals.totalBeforeVat)}
              </p>
              <p className="mt-1 text-xs font-bold text-sky-700">
                שולם: {formatMoney(salesTotals.paidBeforeVat)}
              </p>
            </div>

            <div className="rounded-[24px] border border-violet-100 bg-violet-50 p-5">
              <p className="text-xs font-black text-violet-600">
                סכום אחרי מע״מ
              </p>
              <p className="mt-2 text-2xl font-black text-violet-950">
                {formatMoney(salesTotals.totalAfterVat)}
              </p>
              <p className="mt-1 text-xs font-bold text-violet-700">
                שולם: {formatMoney(salesTotals.paidAfterVat)}
              </p>
            </div>

            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-xs font-black text-emerald-600">עמלה 5%</p>
              <p className="mt-2 text-2xl font-black text-emerald-950">
                {formatMoney(salesTotals.totalCommission)}
              </p>
              <p className="mt-1 text-xs font-bold text-emerald-700">
                לתשלום: {formatMoney(salesTotals.paidCommission)}
              </p>
            </div>
          </div>

          {salesLoading ? (
            <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-8 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-500" />
              <p className="mt-3 text-sm font-black text-slate-600">
                טוען מכירות...
              </p>
            </div>
          ) : salesRows.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-black text-slate-500">
              אין מכירות לעובד בחודש הזה.
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-100">
              <table className="w-full border-collapse text-right">
                <thead className="bg-slate-50">
                  <tr className="text-sm text-slate-500">
                    <th className="px-5 py-4 font-black">תאריך</th>
                    <th className="px-5 py-4 font-black">איזה מכירה</th>
                    <th className="px-5 py-4 font-black">לקוח</th>
                    <th className="px-5 py-4 font-black">סכום לפני מע״מ</th>
                    <th className="px-5 py-4 font-black">סכום אחרי מע״מ</th>
                    <th className="px-5 py-4 font-black">עמלה 5%</th>
                    <th className="px-5 py-4 font-black">תשלום</th>
                    <th className="px-5 py-4 font-black">סטטוס</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {salesRows.map((sale) => (
                    <tr key={sale.id} className="transition hover:bg-indigo-50/40">
                      <td className="px-5 py-4 text-sm font-black text-slate-700">
                        {formatDate(sale.paidAt || sale.saleDate || sale.createdAt)}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-black text-slate-900">
                          {sale.saleTitle || "מכירה"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {sale.eventName || sale.venueName || ""}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-black text-slate-800">
                          {sale.clientName || "—"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {sale.clientPhone || sale.clientEmail || ""}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm font-black text-slate-700">
                        {formatMoney(sale.dealAmountBeforeVat)}
                      </td>

                      <td className="px-5 py-4 text-sm font-black text-slate-700">
                        {formatMoney(sale.dealAmountAfterVat)}
                      </td>

                      <td className="px-5 py-4 text-sm font-black text-emerald-700">
                        {formatMoney(sale.commissionAmount)}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-600">
                        {paymentModeLabel(sale.paymentMode)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                            sale.status,
                          )}`}
                        >
                          {statusLabel(sale.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-[34px] border border-white/80 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">מסמכי עובד</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                המסמכים נשמרים בתיק העובד. צפייה וייצוא פותחים את הקובץ השמור
                בלבד, בלי יצירת PDF מחדש.
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
              <Icon name="file" className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {documentCards.map(({ type, doc }) => {
              const documentId = doc ? getDocumentId(doc) : "";
              const isUpdating = updatingDocId === documentId;
              const documentUrl = safeDocumentUrl(doc);
              const isPendingWithoutFile =
                String(doc?.status || "") === "pending" && !documentUrl;

              return (
                <article
                  key={doc ? `${doc.source}-${documentId}` : type}
                  className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 transition hover:border-indigo-100 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                        doc?.status,
                      )}`}
                    >
                      {documentStatusLabel(doc)}
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

                  <div className="mt-4 space-y-1 text-sm font-semibold text-slate-600">
                    {doc?.sentAt ? (
                      <p>נשלח לעובד: {formatDateTime(doc.sentAt)}</p>
                    ) : null}
                    <p>
                      תאריך: {formatDateTime(doc?.uploadedAt || doc?.createdAt)}
                    </p>
                    {doc?.taxYear ? <p>שנת מס: {doc.taxYear}</p> : null}
                    {doc?.fileSize ? <p>גודל: {formatFileSize(doc.fileSize)}</p> : null}
                    {isForm101Document(doc) && documentUrl ? (
                      <p className="rounded-2xl bg-sky-50 px-3 py-2 text-xs font-black text-sky-700">
                        זהו קובץ טופס 101 הסופי שנשמר בזמן שליחת העובד. צפייה
                        וייצוא משתמשים באותו קובץ בדיוק.
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {documentUrl ? (
                      <>
                        <a
                          href={documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center justify-center gap-1 rounded-2xl bg-indigo-600 px-3 text-xs font-black text-white transition hover:bg-indigo-700"
                        >
                          <Icon name="open" className="h-3.5 w-3.5" />
                          {documentViewLabel(doc)}
                        </a>

                        <a
                          href={documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="inline-flex h-10 items-center justify-center gap-1 rounded-2xl border border-indigo-200 bg-white px-3 text-xs font-black text-indigo-700 transition hover:bg-indigo-50"
                        >
                          <Icon name="download" className="h-3.5 w-3.5" />
                          {documentExportLabel(doc)}
                        </a>
                      </>
                    ) : isPendingWithoutFile ? (
                      <div className="col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-black leading-5 text-amber-800">
                        נשלח לעובד — ממתין למילוי וחתימה. לאחר שליחה יופיע
                        כאן הקובץ החתום.
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="col-span-2 h-10 rounded-2xl bg-slate-200 text-xs font-black text-slate-400"
                      >
                        אין קובץ
                      </button>
                    )}
                  </div>

                  {String(type) === "form101" ? (
                    <div className="mt-4 rounded-3xl border border-dashed border-sky-200 bg-white p-4">
                      <p className="text-sm font-black text-slate-900">
                        העלאת טופס 101 מהמייל
                      </p>
                      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                        הורידי מהמייל את קובץ ה-PDF שהתקבל מהטופס החיצוני,
                        העלי אותו כאן, והוא יישמר בתיק העובד ויופיע לאישור/דחייה.
                      </p>

                      <input
                        type="file"
                        accept=".pdf,application/pdf,image/png,image/jpeg"
                        disabled={uploadingForm101}
                        onChange={(event) => {
                          setForm101UploadFile(event.target.files?.[0] || null);
                        }}
                        className="mt-3 block w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700 file:ml-4 file:rounded-xl file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:text-xs file:font-black file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      />

                      {form101UploadFile ? (
                        <p className="mt-2 text-xs font-bold text-slate-500">
                          נבחר: {form101UploadFile.name} · {formatFileSize(form101UploadFile.size)}
                        </p>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => void uploadForm101ForEmployee()}
                        disabled={uploadingForm101 || !form101UploadFile}
                        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 text-xs font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Icon
                          name={uploadingForm101 ? "refresh" : "upload"}
                          className={`h-3.5 w-3.5 ${uploadingForm101 ? "animate-spin" : ""}`}
                        />
                        {uploadingForm101 ? "מעלה טופס..." : "העלאת טופס 101"}
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!doc || isUpdating || isPendingWithoutFile}
                      onClick={() =>
                        doc && void updateDocumentStatus(doc, "approved")
                      }
                      className="h-10 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      אשר
                    </button>

                    <button
                      type="button"
                      disabled={!doc || isUpdating || isPendingWithoutFile}
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

            <article className="rounded-[28px] border border-purple-200 bg-purple-50 p-5 transition hover:border-purple-300 hover:bg-white">
              <div className="flex items-start justify-between gap-4">
                <span className="rounded-full border border-purple-200 bg-white px-3 py-1 text-xs font-black text-purple-700">
                  {payslipsForMonth.length} קבצים
                </span>

                <div className="text-right">
                  <h3 className="text-lg font-black text-slate-900">תלושי שכר</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    העלאה חודשית חופשית · {monthLabel(month)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-dashed border-purple-200 bg-white p-4">
                <p className="text-sm font-black text-slate-900">
                  העלאת תלושי שכר לחודש
                </p>

                <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                  אפשר לבחור כמה קבצים יחד. כל קובץ יישמר כתלוש שכר נפרד תחת החודש שנבחר למעלה.
                </p>

                <input
                  type="file"
                  multiple
                  accept=".pdf,application/pdf,image/png,image/jpeg"
                  disabled={uploadingPayslips}
                  onChange={(event) => {
                    setPayslipUploadFiles(Array.from(event.target.files || []));
                  }}
                  className="mt-3 block w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700 file:ml-4 file:rounded-xl file:border-0 file:bg-purple-600 file:px-4 file:py-2 file:text-xs file:font-black file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                />

                {payslipUploadFiles.length > 0 ? (
                  <div className="mt-2 space-y-1 text-xs font-bold text-slate-500">
                    {payslipUploadFiles.map((file) => (
                      <p key={`${file.name}-${file.size}`}>
                        נבחר: {file.name} · {formatFileSize(file.size)}
                      </p>
                    ))}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => void uploadPayslipsForEmployee()}
                  disabled={uploadingPayslips || payslipUploadFiles.length === 0}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-4 text-xs font-black text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon
                    name={uploadingPayslips ? "refresh" : "upload"}
                    className={`h-3.5 w-3.5 ${uploadingPayslips ? "animate-spin" : ""}`}
                  />
                  {uploadingPayslips
                    ? "מעלה תלושים..."
                    : `העלאת ${payslipUploadFiles.length || ""} תלושי שכר`}
                </button>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs font-black text-slate-500">
                  תלושים שמורים לחודש הזה
                </p>

                {payslipsForMonth.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs font-black text-slate-400">
                    עדיין לא הועלו תלושי שכר לחודש הזה.
                  </div>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-auto pr-1">
                    {payslipsForMonth.map((doc) => {
                      const documentId = getDocumentId(doc);
                      const documentUrl = safeDocumentUrl(doc);
                      const isUpdating = updatingDocId === documentId;

                      return (
                        <div
                          key={`${doc.source}-${documentId}`}
                          className="rounded-2xl border border-slate-200 bg-white p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span
                              className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-black ${statusClass(
                                doc.status,
                              )}`}
                            >
                              {statusLabel(doc.status)}
                            </span>

                            <div className="min-w-0 text-right">
                              <p className="truncate text-xs font-black text-slate-900">
                                {doc.originalFileName || "תלוש שכר"}
                              </p>
                              <p className="mt-1 text-[11px] font-bold text-slate-400">
                                {formatDateTime(doc.uploadedAt || doc.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {documentUrl ? (
                              <>
                                <a
                                  href={documentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 text-[11px] font-black text-white transition hover:bg-indigo-700"
                                >
                                  <Icon name="open" className="h-3 w-3" />
                                  צפייה
                                </a>

                                <a
                                  href={documentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-indigo-200 bg-white px-3 text-[11px] font-black text-indigo-700 transition hover:bg-indigo-50"
                                >
                                  <Icon name="download" className="h-3 w-3" />
                                  הורדה
                                </a>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="col-span-2 h-9 rounded-xl bg-slate-100 text-[11px] font-black text-slate-400"
                              >
                                אין קובץ
                              </button>
                            )}
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={!documentId || isUpdating}
                              onClick={() => void updateDocumentStatus(doc, "approved")}
                              className="h-8 rounded-xl border border-emerald-200 bg-emerald-50 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              אשר
                            </button>

                            <button
                              type="button"
                              disabled={!documentId || isUpdating}
                              onClick={() => void updateDocumentStatus(doc, "rejected")}
                              className="h-8 rounded-xl border border-rose-200 bg-rose-50 text-[11px] font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              דחה
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
