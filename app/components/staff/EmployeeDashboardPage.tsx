"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import EmployeeDocumentsModal from "../employee/EmployeeDocumentsModal";

type UserRole =
  | "client"
  | "customer"
  | "employee"
  | "staff"
  | "admin"
  | "producer"
  | "business"
  | string;

type UserStatus = "active" | "pending" | "blocked" | "inactive" | string;

type CareStatus = "ok" | "check" | "urgent";

type EventProgress =
  | "new"
  | "in_progress"
  | "waiting_client"
  | "ready"
  | "completed"
  | string;

type EmployeeDocumentStatus = "missing" | "uploaded" | "approved" | "rejected";
type EmployeeDocumentType =
  | "form101"
  | "idCard"
  | "idCardAppendix"
  | "accountManagement"
  | "payslip";

type ApiEmployeeDocument = {
  _id?: string;
  id?: string;
  documentType?: EmployeeDocumentType;
  originalFileName?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  taxYear?: number;
  payrollMonth?: string;
  status?: EmployeeDocumentStatus;
  rejectionReason?: string;
  uploadedAt?: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ApiEmployeePayslip = {
  _id?: string;
  id?: string;
  documentType?: "payslip" | string;
  title?: string;
  month?: number | string;
  year?: number | string;
  period?: string;
  payrollMonth?: string;
  netSalary?: number | string;
  grossSalary?: number | string;
  status?: string;
  fileUrl?: string;
  originalFileName?: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt?: string;
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

  // ✅ תמיכה בכמה שמות שדות מהשרת כדי שהסטטוס לא ייתקע על "לא נחתם"
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

type ApiUser = {
  _id?: string;
  id?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  businessId?: string | { _id?: string; id?: string };
  business?: string | { _id?: string; id?: string };
  role?: UserRole;
  staffType?: string | null;
  employeeScope?: string | null;
  assignedClientIds?: string[];
  assignedStaffIds?: string[];
  status?: UserStatus;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastActivity?: string;
  lastSeenAt?: string;
  avatar?: string;
  image?: string;
};

type ApiEvent = {
  _id?: string;
  id?: string;
  title?: string;
  eventName?: string;
  name?: string;
  clientName?: string;
  customerName?: string;
  ownerName?: string;
  ownerId?: string;
  userId?: string;
  clientId?: string;
  customerId?: string;
  createdBy?: string;
  clientPhone?: string;
  customerPhone?: string;
  phone?: string;
  eventType?: string;
  type?: string;
  eventDate?: string;
  date?: string;
  location?: string | { name?: string; address?: string };
  guestsCount?: number;
  guests?: number;
  maxGuests?: number;
  assignedEmployeeId?: string;
  assignedStaffId?: string;
  assignedStaffIds?: string[];
  assignedClientIds?: string[];
  assignedTo?: string;
  assignedEmployeeName?: string;
  assignedStaffName?: string;
  progress?: EventProgress;
  status?: EventProgress;
  careStatus?: CareStatus;
  supportStatus?: CareStatus;
  unreadMessages?: number;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageAt?: string;
  notes?: string;
  supportNote?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ApiTask = {
  _id?: string;
  id?: string;
  title?: string;
  text?: string;
  clientName?: string;
  customerName?: string;
  eventName?: string;
  eventTitle?: string;
  priority?: CareStatus;
  careStatus?: CareStatus;
  dueText?: string;
  dueAt?: string;
};

type DashboardStats = {
  totalUsers: number;
  myEvents: number;
  needCheck: number;
  unreadMessages: number;
  activeUsers: number;
};

type DashboardData = {
  users: ApiUser[];
  events: ApiEvent[];
  tasks: ApiTask[];
  stats?: Partial<DashboardStats>;
};

type EmployeeWorkOrderSummary = {
  total: number;
  pending: number;
  in_progress: number;
  confirmed: number;
  declined: number;
  no_answer: number;
  callback: number;
  wrong_number: number;
  completed: number;
  cancelled: number;
  completedLogical: number;
  remaining: number;
};

type EmployeeWorkOrderListItem = {
  id?: string;
  _id?: string;
  title?: string;
  clientName?: string;
  clientEmail?: string;
  eventName?: string;
  round?: number;
  myTasksTotal?: number;
  myTasksRemaining?: number;
  myTasksCompleted?: number;
};

type EmployeeWorkOrdersResponse = {
  success?: boolean;
  error?: string;
  summary?: Partial<EmployeeWorkOrderSummary>;
  workOrders?: EmployeeWorkOrderListItem[];
  activeWorkOrders?: EmployeeWorkOrderListItem[];
  completedWorkOrders?: EmployeeWorkOrderListItem[];
};

type EmployeeWorkOrdersDashboardData = {
  loading: boolean;
  error: string;
  summary: EmployeeWorkOrderSummary;
  workOrdersCount: number;
  activeWorkOrdersCount: number;
  completedWorkOrdersCount: number;
};

type EmployeeLead = {
  _id?: string;
  id?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  eventDate?: string;
  packageName?: string;
  status?: string;
  leadSource?: string;
  leadProvider?: string;
  leadStatus?: string;
  interestedService?: string;
  facebookLeadId?: string;
  campaignName?: string;
  adName?: string;
  formName?: string;
  source?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

type EmployeeLeadsResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  employeeId?: string;
  leads?: EmployeeLead[];
};

function getEmptyWorkOrdersDashboardData(): EmployeeWorkOrdersDashboardData {
  return {
    loading: true,
    error: "",
    summary: {
      total: 0,
      pending: 0,
      in_progress: 0,
      confirmed: 0,
      declined: 0,
      no_answer: 0,
      callback: 0,
      wrong_number: 0,
      completed: 0,
      cancelled: 0,
      completedLogical: 0,
      remaining: 0,
    },
    workOrdersCount: 0,
    activeWorkOrdersCount: 0,
    completedWorkOrdersCount: 0,
  };
}

const API = {
  dashboard: "/api/staff/dashboard",
  users: "/api/staff/users",
  myEvents: "/api/staff/events/my",
  myTasks: "/api/staff/tasks/my",
  form101Current: "/api/forms/101/current",
  form101Upload: "/api/forms/101/upload",
  form101Download: "/api/forms/101/download",
  employeeAgreementCurrent: "/api/employee-agreements/current",
  employeeWorkOrders: "/api/employee/work-orders",
  employeeLeads: "/api/employee/leads",
};

function getArrayFromResponse<T>(data: any, keys: string[]): T[] {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    const value = data?.[key];
    if (Array.isArray(value)) return value;
  }

  for (const key of keys) {
    const value = data?.data?.[key];
    if (Array.isArray(value)) return value;
  }

  return [];
}

function getObjectFromResponse<T extends object>(
  data: any,
  keys: string[],
): Partial<T> {
  for (const key of keys) {
    const value = data?.[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
  }

  for (const key of keys) {
    const value = data?.data?.[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
  }

  return {};
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error || data?.message || `REQUEST_FAILED_${response.status}`,
    );
  }

  return data;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getTodayKey() {
  const now = new Date();

  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(
    now.getDate(),
  )}`;
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

function asNumber(value: unknown) {
  const n = Number(value || 0);

  return Number.isFinite(n) ? n : 0;
}

function normalizeWorkOrdersSummary(
  summary?: Partial<EmployeeWorkOrderSummary>,
): EmployeeWorkOrderSummary {
  return {
    total: asNumber(summary?.total),
    pending: asNumber(summary?.pending),
    in_progress: asNumber(summary?.in_progress),
    confirmed: asNumber(summary?.confirmed),
    declined: asNumber(summary?.declined),
    no_answer: asNumber(summary?.no_answer),
    callback: asNumber(summary?.callback),
    wrong_number: asNumber(summary?.wrong_number),
    completed: asNumber(summary?.completed),
    cancelled: asNumber(summary?.cancelled),
    completedLogical: asNumber(summary?.completedLogical),
    remaining: asNumber(summary?.remaining),
  };
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTimeAgo(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "עכשיו";
  if (diffMinutes < 60) return `לפני ${diffMinutes} דק׳`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `לפני ${diffHours} שעות`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `לפני ${diffDays} ימים`;

  return formatDate(value);
}

function documentStatusLabel(status?: EmployeeDocumentStatus) {
  switch (status) {
    case "approved":
      return "מאושר";
    case "rejected":
      return "נדחה — צריך להעלות מחדש";
    case "uploaded":
      return "הועלה וממתין לבדיקה";
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

  // אם האדמין דחה את ההסכם — העובד צריך לראות שניתן לחתום מחדש.
  if (agreement.status === "rejected") return "rejected";

  // אם האדמין אישר — זה חייב להופיע כמאושר, גם אם יש קובץ חתום.
  if (agreement.status === "approved" || agreement.approvedAt) {
    return "approved";
  }

  // אם העובד חתם ונוצר PDF חתום — זה חייב להופיע כנחתם.
  if (
    getAgreementFileUrl(agreement) ||
    agreement.signedAt ||
    agreement.status === "signed"
  ) {
    return "signed";
  }

  return "missing";
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

function normalizeEmployeeAgreementFromResponse(data: any) {
  const rawAgreement =
    data?.agreement ||
    data?.employeeAgreement ||
    data?.signedAgreement ||
    data?.document ||
    data?.data?.agreement ||
    data?.data?.employeeAgreement ||
    data?.data?.signedAgreement ||
    data?.data?.document ||
    null;

  if (
    !rawAgreement ||
    typeof rawAgreement !== "object" ||
    Array.isArray(rawAgreement)
  ) {
    return null;
  }

  const normalized = { ...rawAgreement } as ApiEmployeeAgreement;
  const fileUrl = getAgreementFileUrl(normalized);

  if (fileUrl) {
    normalized.signedFileUrl = fileUrl;
  }

  normalized.status = getAgreementEffectiveStatus(normalized);

  return normalized;
}

function normalizePayslipFromDocument(document: any): ApiEmployeePayslip | null {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return null;
  }

  const documentType = String(document.documentType || "").trim();

  if (documentType && documentType !== "payslip") {
    return null;
  }

  const payrollMonth = String(
    document.payrollMonth ||
      document.period ||
      (document.year && document.month
        ? `${document.year}-${pad2(Number(document.month))}`
        : ""),
  ).trim();

  return {
    _id: document._id ? String(document._id) : undefined,
    id: String(document.id || document._id || ""),
    documentType: "payslip",
    title: document.title || "תלוש שכר",
    month: document.month,
    year: document.year,
    period: document.period || payrollMonth,
    payrollMonth,
    netSalary: document.netSalary,
    grossSalary: document.grossSalary,
    status: document.status || "uploaded",
    fileUrl: document.fileUrl || "",
    originalFileName: document.originalFileName || "",
    fileType: document.fileType || "",
    fileSize: Number(document.fileSize || 0),
    uploadedAt: document.uploadedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function sortPayslipsByDate(items: ApiEmployeePayslip[]) {
  return [...items].sort((a, b) => {
    const aTime = new Date(
      a.uploadedAt || a.createdAt || a.updatedAt || 0,
    ).getTime();
    const bTime = new Date(
      b.uploadedAt || b.createdAt || b.updatedAt || 0,
    ).getTime();

    return bTime - aTime;
  });
}

function agreementStatusLabel(status?: EmployeeAgreementStatus) {
  switch (status) {
    case "approved":
      return "מאושר";
    case "signed":
      return "נחתם";
    case "rejected":
      return "הסכם נדחה — ניתן לחתום מחדש";
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

function normalizeId(item: { _id?: string; id?: string }) {
  return String(item.id || item._id || "");
}

function normalizeUserBusinessId(user: any) {
  const businessValue = user?.businessId || user?.business;

  if (!businessValue) return "";

  if (typeof businessValue === "string") return businessValue;

  return String(businessValue.id || businessValue._id || "");
}

function normalizeObjectIdValue(value: unknown) {
  if (!value) return "";

  if (typeof value === "string") return value.trim();

  return String((value as any)?.id || (value as any)?._id || value || "").trim();
}

function normalizeObjectIdArray(values: unknown) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => normalizeObjectIdValue(value))
    .filter(Boolean);
}

function normalizeEventClientId(event: ApiEvent) {
  return String(
    event.clientId ||
      event.customerId ||
      event.userId ||
      event.ownerId ||
      event.createdBy ||
      "",
  );
}

function normalizeUserName(user: ApiUser) {
  const fromFull = user.name || user.fullName;
  if (fromFull) return fromFull;

  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || "משתמש ללא שם";
}

function normalizeEventTitle(event: ApiEvent) {
  return event.title || event.eventName || event.name || "אירוע ללא שם";
}

function normalizeClientName(event: ApiEvent) {
  return (
    event.clientName || event.customerName || event.ownerName || "לקוח ללא שם"
  );
}

function normalizeClientPhone(event: ApiEvent) {
  return event.clientPhone || event.customerPhone || event.phone || "";
}

function normalizeLocation(event: ApiEvent) {
  if (!event.location) return "—";
  if (typeof event.location === "string") return event.location;
  return event.location.name || event.location.address || "—";
}

function normalizeGuests(event: ApiEvent) {
  return Number(event.guestsCount ?? event.guests ?? event.maxGuests ?? 0);
}

function normalizeCareStatus(value?: string): CareStatus {
  const status = String(value || "").toLowerCase();

  if (
    status === "urgent" ||
    status === "critical" ||
    status === "danger" ||
    status === "דחוף"
  ) {
    return "urgent";
  }

  if (
    status === "check" ||
    status === "warning" ||
    status === "pending" ||
    status === "needs_check" ||
    status === "דורש בדיקה"
  ) {
    return "check";
  }

  return "ok";
}

function normalizeUserStatus(user: ApiUser): UserStatus {
  if (user.status) return user.status;
  if (user.isActive === false) return "inactive";
  return "active";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

function roleLabel(role?: UserRole) {
  switch (String(role || "").toLowerCase()) {
    case "client":
    case "customer":
      return "לקוח";
    case "employee":
    case "staff":
      return "עובד";
    case "admin":
      return "אדמין";
    case "producer":
      return "מפיק";
    case "business":
      return "עסק";
    default:
      return role || "משתמש";
  }
}

function statusLabel(status?: UserStatus) {
  switch (String(status || "").toLowerCase()) {
    case "active":
      return "פעיל";
    case "pending":
      return "ממתין";
    case "blocked":
      return "חסום";
    case "inactive":
      return "לא פעיל";
    default:
      return status || "—";
  }
}

function progressLabel(progress?: EventProgress) {
  switch (String(progress || "").toLowerCase()) {
    case "new":
      return "חדש";
    case "in_progress":
      return "בטיפול";
    case "waiting_client":
      return "ממתין ללקוח";
    case "ready":
      return "מוכן";
    case "completed":
      return "הושלם";
    default:
      return progress || "—";
  }
}

function careStatusLabel(status: CareStatus) {
  switch (status) {
    case "ok":
      return "הכול תקין";
    case "check":
      return "דורש בדיקה";
    case "urgent":
      return "דחוף";
    default:
      return status;
  }
}

function careStatusClass(status: CareStatus) {
  switch (status) {
    case "ok":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "check":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "urgent":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function userStatusClass(status: UserStatus) {
  switch (String(status || "").toLowerCase()) {
    case "active":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "pending":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "blocked":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "inactive":
      return "bg-slate-100 text-slate-600 ring-slate-200";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name:
    | "search"
    | "users"
    | "calendar"
    | "message"
    | "warning"
    | "check"
    | "phone"
    | "arrow"
    | "spark"
    | "clock"
    | "user"
    | "activity"
    | "open"
    | "shield"
    | "refresh"
    | "file"
    | "sales";
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

  if (name === "file") {
    return (
      <svg {...common}>
        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
        <path d="M14 2v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
        <path d="M9 9h1" />
      </svg>
    );
  }

  if (name === "sales") {
    return (
      <svg {...common}>
        <path d="M3 17h18" />
        <path d="M6 17V9" />
        <path d="M12 17V5" />
        <path d="M18 17v-6" />
        <path d="M5 21h14" />
        <path d="M8 7l4-4 4 4" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
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

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="18" rx="4" />
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <path d="M3 10h18" />
      </svg>
    );
  }

  if (name === "message") {
    return (
      <svg {...common}>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
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

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m20 6-11 11-5-5" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg {...common}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.1 5.18 2 2 0 0 1 5.11 3h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.62a2 2 0 0 1-.45 2.11L9 10.7a16 16 0 0 0 4.3 4.3l1.25-1.25a2 2 0 0 1 2.11-.45c.84.29 1.72.5 2.62.62A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    );
  }

  if (name === "spark") {
    return (
      <svg {...common}>
        <path d="M12 3 9.8 9.8 3 12l6.8 2.2L12 21l2.2-6.8L21 12l-6.8-2.2L12 3z" />
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

  if (name === "activity") {
    return (
      <svg {...common}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
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

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
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

  return (
    <svg {...common}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  tone = "dark",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  tone?: "dark" | "purple" | "green" | "amber";
}) {
  const toneClass =
    tone === "purple"
      ? "from-violet-600 to-fuchsia-600"
      : tone === "green"
        ? "from-emerald-500 to-teal-600"
        : tone === "amber"
          ? "from-amber-400 to-orange-500"
          : "from-sky-500 to-blue-600";

  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div
        className={`absolute -left-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${toneClass} opacity-10 blur-2xl transition group-hover:opacity-20`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-400">{subtitle}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${toneClass} text-white shadow-lg`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:w-[360px]">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:shadow-sm"
      />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
        <Icon name="search" className="h-5 w-5" />
      </span>
    </div>
  );
}

function EmptyState({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-slate-500 shadow-sm">
        <Icon name="search" className="h-6 w-6" />
      </div>
      <p className="mt-4 text-lg font-black text-slate-800">{title}</p>
      <p className="mt-2 text-sm font-semibold text-slate-500">{subtitle}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="rounded-[34px] border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex min-h-[280px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
          <p className="mt-4 text-sm font-black text-slate-800">
            טוען נתוני עובד מהשרת...
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-400">
            משתמשים, אירועים, שיחות ומשימות
          </p>
        </div>
      </div>
    </div>
  );
}

function getCombinedDocumentsStatus(
  form101: ApiEmployeeDocument | null,
  idCard: ApiEmployeeDocument | null,
  idCardAppendix: ApiEmployeeDocument | null,
  accountManagement: ApiEmployeeDocument | null,
): EmployeeDocumentStatus {
  if (!form101 && !idCard && !idCardAppendix && !accountManagement) {
    return "missing";
  }

  if (
    form101?.status === "rejected" ||
    idCard?.status === "rejected" ||
    idCardAppendix?.status === "rejected" ||
    accountManagement?.status === "rejected"
  ) {
    return "rejected";
  }

  if (
    form101?.status === "approved" &&
    idCard?.status === "approved" &&
    idCardAppendix?.status === "approved" &&
    accountManagement?.status === "approved"
  ) {
    return "approved";
  }

  return "uploaded";
}

function getUploadedDate(document?: ApiEmployeeDocument | null) {
  return formatDate(document?.uploadedAt || document?.createdAt);
}

function MiniDocumentStatusCard({
  title,
  subtitle,
  statusLabel,
  statusClass,
  icon,
}: {
  title: string;
  subtitle: string;
  statusLabel: string;
  statusClass: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            {icon}
          </div>

          <div>
            <p className="text-sm font-black text-slate-950">{title}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
              {subtitle}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-black ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  );
}

function getLeadStatusLabel(status?: string) {
  switch (String(status || "").toLowerCase()) {
    case "new":
      return "חדש";
    case "contacted":
      return "נוצר קשר";
    case "quote_sent":
      return "נשלחה הצעה";
    case "converted":
      return "הומר ללקוח";
    case "lost":
      return "לא רלוונטי";
    default:
      return "חדש";
  }
}

function getLeadStatusClass(status?: string) {
  switch (String(status || "").toLowerCase()) {
    case "contacted":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "quote_sent":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "converted":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "lost":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "new":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getLeadSourceLabel(source?: string, provider?: string) {
  const cleanSource = String(source || "").trim().toLowerCase();
  const cleanProvider = String(provider || "").trim().toLowerCase();

  if (cleanSource === "facebook" && cleanProvider === "make") {
    return "Facebook / Make";
  }

  if (cleanSource === "facebook") return "Facebook";
  if (cleanProvider === "make") return "Make";
  if (cleanSource === "whatsapp") return "WhatsApp";

  return source || provider || "—";
}

function normalizeLeadName(lead: EmployeeLead) {
  return lead.fullName || "ליד ללא שם";
}

function normalizeLeadPhone(lead: EmployeeLead) {
  return String(lead.phone || "").trim();
}

function normalizeLeadService(lead: EmployeeLead) {
  return lead.interestedService || lead.packageName || "—";
}

function normalizeLeadSource(lead: EmployeeLead) {
  return getLeadSourceLabel(lead.leadSource, lead.leadProvider);
}

function isFacebookLead(lead: EmployeeLead) {
  return (
    String(lead.leadSource || "").toLowerCase() === "facebook" ||
    String(lead.source || "").toLowerCase() === "facebook_lead_make" ||
    Boolean(lead.facebookLeadId)
  );
}

function EmployeeFileSummaryPanel({
  form101,
  idCard,
  idCardAppendix,
  accountManagement,
  agreement,
  loading,
  agreementLoading,
  error,
  onReload,
  onOpen,
}: {
  form101: ApiEmployeeDocument | null;
  idCard: ApiEmployeeDocument | null;
  idCardAppendix: ApiEmployeeDocument | null;
  accountManagement: ApiEmployeeDocument | null;
  agreement: ApiEmployeeAgreement | null;
  loading: boolean;
  agreementLoading: boolean;
  error: string;
  onReload: () => void;
  onOpen: () => void;
}) {
  const combinedStatus = getCombinedDocumentsStatus(
    form101,
    idCard,
    idCardAppendix,
    accountManagement,
  );
  const agreementStatus = getAgreementEffectiveStatus(agreement);
  const agreementFileUrl = getAgreementFileUrl(agreement);
  const agreementDate = getAgreementDate(agreement);
  const isReloading = loading || agreementLoading;

  return (
    <section className="mt-6 overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="relative border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50 p-5 sm:p-6 xl:border-b-0 xl:border-l">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-sky-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-0 h-48 w-48 rounded-full bg-emerald-200/30 blur-3xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-white text-sky-700 shadow-sm ring-1 ring-slate-200">
                  <Icon name="file" className="h-6 w-6" />
                </div>

                <div>
                  <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                    אזור אישי לעובד
                  </span>

                  <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    התיק עובד שלי
                  </h2>

                  <p className="mt-2 max-w-xl text-sm font-semibold leading-7 text-slate-600">
                    כל המסמכים האישיים במקום אחד: טופס 101, תעודת זהות, הסכם
                    עבודה, שעות ותלושי שכר. מסמך שנשלח נשאר לצפייה בלבד, אלא אם
                    נדחה ונדרש להעלות מחדש.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onOpen}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-sky-700"
              >
                <Icon name="open" className="h-4 w-4" />
                התיק עובד שלי
              </button>

              <button
                type="button"
                onClick={onReload}
                disabled={isReloading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon
                  name="refresh"
                  className={`h-4 w-4 ${isReloading ? "animate-spin" : ""}`}
                />
                רענון סטטוס
              </button>
            </div>

            {error && (
              <div className="mt-5 rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm font-black leading-6 text-rose-700">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <MiniDocumentStatusCard
              title="טופס 101"
              subtitle={
                form101
                  ? `הועלה: ${form101.originalFileName || "קובץ"} · ${getUploadedDate(form101)}`
                  : "לא הועלה עדיין"
              }
              statusLabel={documentStatusLabel(form101?.status || "missing")}
              statusClass={documentStatusClass(form101?.status || "missing")}
              icon={<Icon name="file" className="h-5 w-5" />}
            />

            <MiniDocumentStatusCard
              title="תעודת זהות"
              subtitle={
                idCard
                  ? `הועלתה: ${idCard.originalFileName || "קובץ"} · ${getUploadedDate(idCard)}`
                  : "לא הועלתה עדיין"
              }
              statusLabel={documentStatusLabel(idCard?.status || "missing")}
              statusClass={documentStatusClass(idCard?.status || "missing")}
              icon={<Icon name="shield" className="h-5 w-5" />}
            />

            <MiniDocumentStatusCard
              title="ספח תעודת זהות"
              subtitle={
                idCardAppendix
                  ? `הועלה: ${idCardAppendix.originalFileName || "קובץ"} · ${getUploadedDate(idCardAppendix)}`
                  : "לא הועלה עדיין"
              }
              statusLabel={documentStatusLabel(idCardAppendix?.status || "missing")}
              statusClass={documentStatusClass(
                idCardAppendix?.status || "missing",
              )}
              icon={<Icon name="shield" className="h-5 w-5" />}
            />

            <MiniDocumentStatusCard
              title="אישור ניהול חשבון"
              subtitle={
                accountManagement
                  ? `הועלה: ${accountManagement.originalFileName || "קובץ"} · ${getUploadedDate(accountManagement)}`
                  : "לא הועלה עדיין"
              }
              statusLabel={documentStatusLabel(
                accountManagement?.status || "missing",
              )}
              statusClass={documentStatusClass(
                accountManagement?.status || "missing",
              )}
              icon={<Icon name="file" className="h-5 w-5" />}
            />

            <MiniDocumentStatusCard
              title="הסכם עבודה"
              subtitle={
                agreementFileUrl
                  ? `קיים הסכם חתום${agreementDate ? ` · ${formatDate(agreementDate)}` : ""}`
                  : "לא נחתם עדיין"
              }
              statusLabel={agreementStatusLabel(agreementStatus)}
              statusClass={agreementStatusClass(agreementStatus)}
              icon={<Icon name="check" className="h-5 w-5" />}
            />

            <MiniDocumentStatusCard
              title="שעות ותלושי שכר"
              subtitle="ייפתחו בטאבים נפרדים בתוך תיק העובד"
              statusLabel="זמין בתיק"
              statusClass="border-slate-200 bg-slate-50 text-slate-600"
              icon={<Icon name="clock" className="h-5 w-5" />}
            />
          </div>

          <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-950">
                  סטטוס כללי של מסמכי חובה
                </p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                  טופס 101 + תעודת זהות + אישור ניהול חשבון + הסכם עבודה. כניסה מלאה נמצאת בכפתור
                  הקטן של תיק העובד.
                </p>
              </div>

              <span
                className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black ${documentStatusClass(
                  combinedStatus,
                )}`}
              >
                {documentStatusLabel(combinedStatus)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [serverStats, setServerStats] = useState<Partial<DashboardStats>>({});
  const [workOrdersDashboard, setWorkOrdersDashboard] =
    useState<EmployeeWorkOrdersDashboardData>(() =>
      getEmptyWorkOrdersDashboardData(),
    );
  const [employeeLeads, setEmployeeLeads] = useState<EmployeeLead[]>([]);
  const [employeeLeadsLoading, setEmployeeLeadsLoading] = useState(true);
  const [employeeLeadsError, setEmployeeLeadsError] = useState("");

  const [form101, setForm101] = useState<ApiEmployeeDocument | null>(null);
  const [idCard, setIdCard] = useState<ApiEmployeeDocument | null>(null);
  const [idCardAppendix, setIdCardAppendix] =
    useState<ApiEmployeeDocument | null>(null);
  const [accountManagement, setAccountManagement] =
    useState<ApiEmployeeDocument | null>(null);
  const [payslips, setPayslips] = useState<ApiEmployeePayslip[]>([]);
  const [payslipsLoading, setPayslipsLoading] = useState(true);
  const [agreement, setAgreement] = useState<ApiEmployeeAgreement | null>(null);
  const [agreementLoading, setAgreementLoading] = useState(true);
  const [form101File, setForm101File] = useState<File | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardAppendixFile, setIdCardAppendixFile] =
    useState<File | null>(null);
  const [accountManagementFile, setAccountManagementFile] =
    useState<File | null>(null);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [uploadingDocumentType, setUploadingDocumentType] =
    useState<EmployeeDocumentType | null>(null);
  const [documentsError, setDocumentsError] = useState("");
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enteringUserId, setEnteringUserId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const currentEmployeeId = String(
    (user as any)?.id || (user as any)?._id || "",
  );
  const currentBusinessId = normalizeUserBusinessId(user as any);

  const currentStaffType = String((user as any)?.staffType || "").toLowerCase();
  const currentEmployeeScope = String(
    (user as any)?.employeeScope || "",
  ).toLowerCase();

  const isCurrentUserSeatingStaff =
    currentStaffType === "seating_staff" && currentEmployeeScope === "system";

  const isCurrentUserUsherStaff =
    currentStaffType === "usher_staff" && currentEmployeeScope === "system";

  const canSeeLeadsAndWorkOrders = !isCurrentUserUsherStaff;

  const currentAssignedClientIds = useMemo(() => {
    return normalizeObjectIdArray((user as any)?.assignedClientIds);
  }, [user]);

  const currentAssignedClientIdSet = useMemo(() => {
    return new Set(currentAssignedClientIds);
  }, [currentAssignedClientIds]);

  /*
    עובד הושבה אמור לקבל מהשרת רק לקוחות שהוקצו אליו.
    הפילטר הזה הוא שכבת הגנה נוספת בפרונט, למקרה שה־API מחזיר יותר מדי נתונים.
    אם ה־AuthContext עדיין לא מחזיר assignedClientIds, לא מסתירים כאן כדי לא לשבור את הרשימה;
    החסימה הסופית נשארת ב־/api/staff/impersonate.
  */
  const shouldClientSideRestrictToAssignedClients =
    (isCurrentUserSeatingStaff || isCurrentUserUsherStaff) &&
    currentAssignedClientIds.length > 0;

  const signAgreementUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (currentEmployeeId) {
      params.set("employeeId", currentEmployeeId);
    }

    if (currentBusinessId) {
      params.set("businessId", currentBusinessId);
    }

    const query = params.toString();

    return query
      ? `/employee/agreement/sign?${query}`
      : "/employee/agreement/sign";
  }, [currentEmployeeId, currentBusinessId]);

  const loadEmployeeWorkOrders = useCallback(async () => {
    try {
      setWorkOrdersDashboard((prev) => ({
        ...prev,
        loading: true,
        error: "",
      }));

      const params = new URLSearchParams({
        date: getTodayKey(),
        limit: "100",
      });

      const response = await fetch(`${API.employeeWorkOrders}?${params}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = (await response
        .json()
        .catch(() => null)) as EmployeeWorkOrdersResponse | null;

      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || "שגיאה בטעינת הוראות העבודה");
      }

      const workOrders = Array.isArray(data?.workOrders) ? data.workOrders : [];
      const activeWorkOrders = Array.isArray(data?.activeWorkOrders)
        ? data.activeWorkOrders
        : workOrders.filter((order) => asNumber(order.myTasksRemaining) > 0);
      const completedWorkOrders = Array.isArray(data?.completedWorkOrders)
        ? data.completedWorkOrders
        : workOrders.filter(
            (order) =>
              asNumber(order.myTasksTotal) > 0 &&
              asNumber(order.myTasksRemaining) <= 0,
          );

      setWorkOrdersDashboard({
        loading: false,
        error: "",
        summary: normalizeWorkOrdersSummary(data?.summary),
        workOrdersCount: workOrders.length,
        activeWorkOrdersCount: activeWorkOrders.length,
        completedWorkOrdersCount: completedWorkOrders.length,
      });
    } catch (loadError) {
      console.error("LOAD EMPLOYEE WORK ORDERS FAILED:", loadError);

      setWorkOrdersDashboard({
        ...getEmptyWorkOrdersDashboardData(),
        loading: false,
        error:
          loadError instanceof Error
            ? loadError.message
            : "שגיאה בטעינת הוראות העבודה",
      });
    }
  }, []);

  const loadEmployeeLeads = useCallback(async () => {
    try {
      setEmployeeLeadsLoading(true);
      setEmployeeLeadsError("");

      const params = new URLSearchParams();

      if (leadSearch.trim()) {
        params.set("q", leadSearch.trim());
      }

      const url = params.toString()
        ? `${API.employeeLeads}?${params.toString()}`
        : API.employeeLeads;

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = (await response
        .json()
        .catch(() => null)) as EmployeeLeadsResponse | null;

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message || data?.error || "שגיאה בטעינת הלידים שלי",
        );
      }

      setEmployeeLeads(Array.isArray(data?.leads) ? data.leads : []);
    } catch (loadError) {
      console.error("LOAD EMPLOYEE LEADS FAILED:", loadError);
      setEmployeeLeads([]);
      setEmployeeLeadsError(
        loadError instanceof Error
          ? loadError.message
          : "שגיאה בטעינת הלידים שלי",
      );
    } finally {
      setEmployeeLeadsLoading(false);
    }
  }, [leadSearch]);

  const loadDashboard = useCallback(async () => {
    try {
      setError("");
      setRefreshing(true);

      let dashboardData: DashboardData | null = null;

      try {
        const dashboardResponse = await fetchJson(API.dashboard);

        dashboardData = {
          users: getArrayFromResponse<ApiUser>(dashboardResponse, [
            "users",
            "allUsers",
            "staffUsers",
          ]),
          events: getArrayFromResponse<ApiEvent>(dashboardResponse, [
            "events",
            "myEvents",
            "assignedEvents",
          ]),
          tasks: getArrayFromResponse<ApiTask>(dashboardResponse, [
            "tasks",
            "myTasks",
            "followUpTasks",
          ]),
          stats: getObjectFromResponse<DashboardStats>(dashboardResponse, [
            "stats",
            "summary",
            "dashboardStats",
          ]),
        };
      } catch (dashboardError) {
        console.warn("STAFF DASHBOARD SINGLE ENDPOINT FAILED:", dashboardError);

        const [usersResponse, eventsResponse, tasksResponse] =
          await Promise.all([
            fetchJson(API.users),
            fetchJson(API.myEvents),
            fetchJson(API.myTasks).catch(() => ({ tasks: [] })),
          ]);

        dashboardData = {
          users: getArrayFromResponse<ApiUser>(usersResponse, [
            "users",
            "allUsers",
            "items",
            "data",
          ]),
          events: getArrayFromResponse<ApiEvent>(eventsResponse, [
            "events",
            "myEvents",
            "assignedEvents",
            "items",
            "data",
          ]),
          tasks: getArrayFromResponse<ApiTask>(tasksResponse, [
            "tasks",
            "myTasks",
            "followUpTasks",
            "items",
            "data",
          ]),
          stats: {},
        };
      }

      setUsers(dashboardData.users);
      setEvents(dashboardData.events);
      setTasks(dashboardData.tasks);
      setServerStats(dashboardData.stats || {});
    } catch (loadError) {
      console.error("LOAD STAFF DASHBOARD FAILED:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "שגיאה בטעינת נתוני דשבורד עובדים",
      );
      setUsers([]);
      setEvents([]);
      setTasks([]);
      setServerStats({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadEmployeeDocument = useCallback(
    async (documentType: EmployeeDocumentType) => {
      const params = new URLSearchParams({
        documentType,
      });

      const response = await fetch(
        `${API.form101Current}?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "שגיאה בטעינת המסמך");
      }

      return (data?.document ||
        (documentType === "form101"
          ? data?.form101
          : documentType === "idCard"
            ? data?.idCard
            : documentType === "idCardAppendix"
              ? data?.idCardAppendix
              : documentType === "payslip"
                ? data?.payslip
                : data?.accountManagement) ||
        null) as ApiEmployeeDocument | null;
    },
    [],
  );

  const loadEmployeeDocuments = useCallback(async () => {
    try {
      setDocumentsError("");
      setDocumentsLoading(true);

      const [
        form101Document,
        idCardDocument,
        idCardAppendixDocument,
        accountManagementDocument,
      ] = await Promise.all([
          loadEmployeeDocument("form101").catch((loadError) => {
            console.error("LOAD FORM 101 FAILED:", loadError);
            return null;
          }),
          loadEmployeeDocument("idCard").catch((loadError) => {
            console.error("LOAD ID CARD FAILED:", loadError);
            return null;
          }),
          loadEmployeeDocument("idCardAppendix").catch((loadError) => {
            console.error("LOAD ID CARD APPENDIX FAILED:", loadError);
            return null;
          }),
          loadEmployeeDocument("accountManagement").catch((loadError) => {
            console.error("LOAD ACCOUNT MANAGEMENT DOCUMENT FAILED:", loadError);
            return null;
          }),
        ]);

      setForm101(form101Document);
      setIdCard(idCardDocument);
      setIdCardAppendix(idCardAppendixDocument);
      setAccountManagement(accountManagementDocument);
    } catch (loadError) {
      console.error("LOAD EMPLOYEE DOCUMENTS FAILED:", loadError);
      setForm101(null);
      setIdCard(null);
      setIdCardAppendix(null);
      setAccountManagement(null);
      setDocumentsError(
        loadError instanceof Error
          ? loadError.message
          : "שגיאה בטעינת מסמכי עובד",
      );
    } finally {
      setDocumentsLoading(false);
    }
  }, [loadEmployeeDocument]);

  const loadEmployeePayslips = useCallback(async () => {
    try {
      setPayslipsLoading(true);

      const params = new URLSearchParams({
        documentType: "payslip",
        type: "payslip",
        month: getCurrentMonthKey(),
      });

      const response = await fetch(
        `${API.form101Current}?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "שגיאה בטעינת תלושי שכר");
      }

      const rawItems = getArrayFromResponse<any>(data, [
        "payslips",
        "documents",
        "forms",
        "items",
      ]);

      const singleItem =
        data?.payslip ||
        data?.document ||
        data?.data?.payslip ||
        data?.data?.document ||
        null;

      const normalizedItems = rawItems
        .map((item) => normalizePayslipFromDocument(item))
        .filter(Boolean) as ApiEmployeePayslip[];

      const normalizedSingle = normalizePayslipFromDocument(singleItem);

      const merged = normalizedSingle
        ? [normalizedSingle, ...normalizedItems]
        : normalizedItems;

      const uniqueByIdOrFile = new Map<string, ApiEmployeePayslip>();

      for (const item of merged) {
        const key =
          String(item.id || item._id || "") ||
          `${item.fileUrl || ""}-${item.uploadedAt || item.createdAt || ""}`;

        if (key && !uniqueByIdOrFile.has(key)) {
          uniqueByIdOrFile.set(key, item);
        }
      }

      setPayslips(sortPayslipsByDate(Array.from(uniqueByIdOrFile.values())));
    } catch (loadError) {
      console.error("LOAD EMPLOYEE PAYSLIPS FAILED:", loadError);
      setPayslips([]);
    } finally {
      setPayslipsLoading(false);
    }
  }, []);

  const loadEmployeeAgreement = useCallback(async () => {
    try {
      setAgreementLoading(true);

      if (!currentEmployeeId) {
        setAgreement(null);
        return;
      }

      const params = new URLSearchParams();
      params.set("employeeId", currentEmployeeId);

      if (currentBusinessId) {
        params.set("businessId", currentBusinessId);
      }

      const response = await fetch(
        `${API.employeeAgreementCurrent}?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "שגיאה בטעינת הסכם העבודה");
      }

      setAgreement(normalizeEmployeeAgreementFromResponse(data));
    } catch (loadError) {
      console.error("LOAD EMPLOYEE AGREEMENT FAILED:", loadError);
      setAgreement(null);
    } finally {
      setAgreementLoading(false);
    }
  }, [currentEmployeeId, currentBusinessId]);

  const uploadEmployeeDocument = useCallback(
    async (documentType: EmployeeDocumentType) => {
      const selectedFile =
        documentType === "form101"
          ? form101File
          : documentType === "idCard"
            ? idCardFile
            : documentType === "idCardAppendix"
              ? idCardAppendixFile
              : accountManagementFile;

      if (!selectedFile || uploadingDocumentType) return;

      try {
        setDocumentsError("");
        setUploadingDocumentType(documentType);

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("documentType", documentType);

        const response = await fetch(API.form101Upload, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "שגיאה בהעלאת המסמך");
        }

        const uploadedDocument = (data?.document ||
          (documentType === "form101"
            ? data?.form101
            : documentType === "idCard"
              ? data?.idCard
              : documentType === "idCardAppendix"
                ? data?.idCardAppendix
                : documentType === "payslip"
                  ? data?.payslip
                  : data?.accountManagement) ||
          null) as ApiEmployeeDocument | null;

        if (documentType === "form101") {
          setForm101File(null);
          setForm101(uploadedDocument);
          alert("טופס 101 הועלה בהצלחה");
        } else if (documentType === "idCard") {
          setIdCardFile(null);
          setIdCard(uploadedDocument);
          alert("תעודת זהות הועלתה בהצלחה");
        } else if (documentType === "idCardAppendix") {
          setIdCardAppendixFile(null);
          setIdCardAppendix(uploadedDocument);
          alert("ספח תעודת זהות הועלה בהצלחה");
        } else {
          setAccountManagementFile(null);
          setAccountManagement(uploadedDocument);
          alert("אישור ניהול חשבון הועלה בהצלחה");
        }

        await loadEmployeeDocuments();
      } catch (uploadError) {
        console.error("UPLOAD EMPLOYEE DOCUMENT FAILED:", uploadError);
        setDocumentsError(
          uploadError instanceof Error
            ? uploadError.message
            : "שגיאה בהעלאת המסמך",
        );
      } finally {
        setUploadingDocumentType(null);
      }
    },
    [
      form101File,
      idCardFile,
      idCardAppendixFile,
      accountManagementFile,
      loadEmployeeDocuments,
      uploadingDocumentType,
    ],
  );

  const enterClientDashboard = useCallback(
    async (targetUserId: string) => {
      if (!targetUserId || enteringUserId) return;

      try {
        setEnteringUserId(targetUserId);

        const response = await fetch("/api/staff/impersonate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({
            targetUserId,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "IMPERSONATION_FAILED");
        }

        router.push(data.redirectTo || "/dashboard");
        router.refresh();
      } catch (error) {
        console.error("ENTER CLIENT DASHBOARD FAILED:", error);

        const errorMessage =
          error instanceof Error &&
          error.message === "SEATING_STAFF_CLIENT_NOT_ASSIGNED"
            ? "אין לעובד ההושבה הרשאה להיכנס ללקוח הזה"
            : "לא הצלחנו להיכנס לדשבורד של הלקוח";

        alert(errorMessage);
      } finally {
        setEnteringUserId(null);
      }
    },
    [enteringUserId, router],
  );

  useEffect(() => {
    void loadDashboard();
    void loadEmployeeDocuments();
    void loadEmployeePayslips();
    void loadEmployeeAgreement();

    if (canSeeLeadsAndWorkOrders) {
      void loadEmployeeWorkOrders();
      void loadEmployeeLeads();
    } else {
      setWorkOrdersDashboard({
        ...getEmptyWorkOrdersDashboardData(),
        loading: false,
      });
      setEmployeeLeads([]);
      setEmployeeLeadsLoading(false);
      setEmployeeLeadsError("");
    }
  }, [
    loadDashboard,
    loadEmployeeDocuments,
    loadEmployeePayslips,
    loadEmployeeAgreement,
    loadEmployeeWorkOrders,
    loadEmployeeLeads,
    canSeeLeadsAndWorkOrders,
  ]);

  const visibleUsers = useMemo(() => {
    if (!shouldClientSideRestrictToAssignedClients) return users;

    return users.filter((currentUser) => {
      const currentUserId = normalizeId(currentUser);
      return currentUserId && currentAssignedClientIdSet.has(currentUserId);
    });
  }, [currentAssignedClientIdSet, shouldClientSideRestrictToAssignedClients, users]);

  const visibleEvents = useMemo(() => {
    if (!shouldClientSideRestrictToAssignedClients) return events;

    return events.filter((event) => {
      const clientId = normalizeEventClientId(event);
      return clientId && currentAssignedClientIdSet.has(clientId);
    });
  }, [currentAssignedClientIdSet, events, shouldClientSideRestrictToAssignedClients]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();

    if (!q) return visibleUsers;

    return visibleUsers.filter((currentUser) => {
      const name = normalizeUserName(currentUser).toLowerCase();
      const email = String(currentUser.email || "").toLowerCase();
      const phone = String(currentUser.phone || "").toLowerCase();
      const role = roleLabel(currentUser.role).toLowerCase();
      const status = statusLabel(
        normalizeUserStatus(currentUser),
      ).toLowerCase();

      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        role.includes(q) ||
        status.includes(q)
      );
    });
  }, [userSearch, visibleUsers]);

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();

    if (!q) return visibleEvents;

    return visibleEvents.filter((event) => {
      const title = normalizeEventTitle(event).toLowerCase();
      const clientName = normalizeClientName(event).toLowerCase();
      const clientPhone = normalizeClientPhone(event).toLowerCase();
      const eventType = String(
        event.eventType || event.type || "",
      ).toLowerCase();
      const location = normalizeLocation(event).toLowerCase();
      const careStatus = careStatusLabel(
        normalizeCareStatus(event.careStatus || event.supportStatus),
      ).toLowerCase();

      return (
        title.includes(q) ||
        clientName.includes(q) ||
        clientPhone.includes(q) ||
        eventType.includes(q) ||
        location.includes(q) ||
        careStatus.includes(q)
      );
    });
  }, [eventSearch, visibleEvents]);

  const filteredLeads = useMemo(() => {
    const q = leadSearch.trim().toLowerCase();

    if (!q) return employeeLeads;

    return employeeLeads.filter((lead) => {
      const name = normalizeLeadName(lead).toLowerCase();
      const phone = normalizeLeadPhone(lead).toLowerCase();
      const email = String(lead.email || "").toLowerCase();
      const service = normalizeLeadService(lead).toLowerCase();
      const source = normalizeLeadSource(lead).toLowerCase();
      const status = getLeadStatusLabel(lead.leadStatus || "new").toLowerCase();

      return (
        name.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        service.includes(q) ||
        source.includes(q) ||
        status.includes(q)
      );
    });
  }, [employeeLeads, leadSearch]);

  const newLeadsCount = useMemo(() => {
    return employeeLeads.filter((lead) => {
      return String(lead.leadStatus || "new").toLowerCase() === "new";
    }).length;
  }, [employeeLeads]);

  const eventsNeedCheck = useMemo(() => {
    return visibleEvents.filter((event) => {
      const status = normalizeCareStatus(
        event.careStatus || event.supportStatus,
      );
      return status === "urgent" || status === "check";
    });
  }, [visibleEvents]);

  const unreadMessages = useMemo(() => {
    return visibleEvents.reduce((sum, event) => {
      return sum + Number(event.unreadMessages ?? event.unreadCount ?? 0);
    }, 0);
  }, [visibleEvents]);

  const activeUsersCount = useMemo(() => {
    return visibleUsers.filter((currentUser) => {
      return (
        String(normalizeUserStatus(currentUser)).toLowerCase() === "active"
      );
    }).length;
  }, [visibleUsers]);

  const stats: DashboardStats = {
    totalUsers: shouldClientSideRestrictToAssignedClients
      ? visibleUsers.length
      : Number(serverStats.totalUsers ?? visibleUsers.length),
    myEvents: shouldClientSideRestrictToAssignedClients
      ? visibleEvents.length
      : Number(serverStats.myEvents ?? visibleEvents.length),
    needCheck: shouldClientSideRestrictToAssignedClients
      ? eventsNeedCheck.length
      : Number(serverStats.needCheck ?? eventsNeedCheck.length),
    unreadMessages: shouldClientSideRestrictToAssignedClients
      ? unreadMessages
      : Number(serverStats.unreadMessages ?? unreadMessages),
    activeUsers: shouldClientSideRestrictToAssignedClients
      ? activeUsersCount
      : Number(serverStats.activeUsers ?? activeUsersCount),
  };

  const displayName = user?.name || user?.email?.split("@")[0] || "עובד";

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] text-slate-950"
    >
      <main className="min-h-screen pb-10">
        <section className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-100 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-emerald-100 blur-3xl" />

            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700">
                  <Icon name="shield" className="h-4 w-4 text-sky-600" />
                  דשבורד עובדים
                </span>

                <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
  היי {displayName}
</h1>

                <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-600">
                  כאן מופיעים הנתונים שלך כעובד: אירועים בטיפול אישי, לקוחות
                  שדורשים בדיקה, הודעות פתוחות, מכירות ותיק העובד האישי שלך.
                </p>
              </div>


              <div className="flex flex-col gap-3 xl:items-end">
                <button
                  type="button"
                  onClick={() => {
                    void loadDashboard();
                    void loadEmployeeDocuments();
                    void loadEmployeePayslips();
                    void loadEmployeeAgreement();

                    if (canSeeLeadsAndWorkOrders) {
                      void loadEmployeeWorkOrders();
                      void loadEmployeeLeads();
                    }
                  }}
                  disabled={
                    refreshing ||
                    documentsLoading ||
                    payslipsLoading ||
                    agreementLoading ||
                    (canSeeLeadsAndWorkOrders &&
                      (workOrdersDashboard.loading || employeeLeadsLoading))
                  }
                  className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 text-xs font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon
                    name="refresh"
                    className={`h-4 w-4 ${
                      refreshing ||
                      documentsLoading ||
                      payslipsLoading ||
                      agreementLoading ||
                      (canSeeLeadsAndWorkOrders &&
                        (workOrdersDashboard.loading || employeeLeadsLoading))
                        ? "animate-spin"
                        : ""
                    }`}
                  />
                  רענון נתונים
                </button>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-start xl:justify-end">
                  <button
                    type="button"
                    onClick={() => router.push("/employee/sales")}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-black hover:shadow-md"
                  >
                    <Icon name="sales" className="h-4 w-4" />
                    המכירות שלי
                  </button>

                  {canSeeLeadsAndWorkOrders && (
                    <>
                      <button
                        type="button"
                        onClick={() => router.push("/employee/leads")}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-600 hover:shadow-md"
                      >
                        <Icon name="message" className="h-4 w-4" />
                        הלידים שלי
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push("/employee/work-orders")}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md"
                      >
                        <Icon name="phone" className="h-4 w-4" />
                        הוראות עבודה
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setDocumentsModalOpen(true)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-md"
                  >
                    <Icon name="file" className="h-4 w-4" />
                    תיק עובד שלי
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/employee/shifts")}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-700 hover:shadow-md"
                  >
                    <Icon name="calendar" className="h-4 w-4" />
                    השיבוצים שלי
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:min-w-[820px] xl:grid-cols-6">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-black text-slate-500">משתמשים</p>
                    <p className="mt-2 text-3xl font-black text-slate-950">
                      {stats.totalUsers}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-black text-slate-500">
                      אירועים שלי
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-950">
                      {stats.myEvents}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-black text-amber-700">
                      דורש בדיקה
                    </p>
                    <p className="mt-2 text-3xl font-black text-amber-900">
                      {stats.needCheck}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-4">
                    <p className="text-xs font-black text-sky-700">
                      הודעות פתוחות
                    </p>
                    <p className="mt-2 text-3xl font-black text-sky-950">
                      {stats.unreadMessages}
                    </p>
                  </div>

                  {canSeeLeadsAndWorkOrders && (
                    <>
                      <button
                        type="button"
                        onClick={() => router.push("/employee/leads")}
                        className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-right transition hover:-translate-y-0.5 hover:bg-amber-100"
                      >
                        <p className="text-xs font-black text-amber-700">
                          לידים שלי
                        </p>
                        <p className="mt-2 text-3xl font-black text-amber-950">
                          {employeeLeadsLoading ? "..." : employeeLeads.length}
                        </p>
                        <p className="mt-1 text-[11px] font-black text-amber-700/70">
                          {newLeadsCount} חדשים
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push("/employee/work-orders")}
                        className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-right transition hover:-translate-y-0.5 hover:bg-emerald-100"
                      >
                        <p className="text-xs font-black text-emerald-700">
                          שיחות שלי היום
                        </p>
                        <p className="mt-2 text-3xl font-black text-emerald-950">
                          {workOrdersDashboard.loading
                            ? "..."
                            : workOrdersDashboard.summary.remaining}
                        </p>
                        <p className="mt-1 text-[11px] font-black text-emerald-700/70">
                          מתוך {workOrdersDashboard.summary.total} שיחות
                        </p>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <EmployeeDocumentsModal
            open={documentsModalOpen}
            onClose={() => setDocumentsModalOpen(false)}
            form101={form101}
            idCard={idCard}
            idCardAppendix={idCardAppendix}
            accountManagement={accountManagement}
            agreement={agreement}
            form101File={form101File}
            idCardFile={idCardFile}
            idCardAppendixFile={idCardAppendixFile}
            accountManagementFile={accountManagementFile}
            setForm101File={setForm101File}
            setIdCardFile={setIdCardFile}
            setIdCardAppendixFile={setIdCardAppendixFile}
            setAccountManagementFile={setAccountManagementFile}
            loading={documentsLoading}
            agreementLoading={agreementLoading}
            uploadingType={uploadingDocumentType}
            error={documentsError}
            onUpload={(documentType: EmployeeDocumentType) =>
              void uploadEmployeeDocument(documentType)
            }
            onReload={() => {
              void loadEmployeeDocuments();
              void loadEmployeePayslips();
              void loadEmployeeAgreement();
            }}
            signAgreementUrl={signAgreementUrl}
            form101DownloadUrl={API.form101Download}
            payslips={payslips}
            payslipsLoading={payslipsLoading}
          />

          {loading ? (
            <div className="mt-6">
              <LoadingPanel />
            </div>
          ) : error ? (
            <div className="mt-6">
              <EmptyState
                title="לא הצלחנו לטעון נתונים מהשרת"
                subtitle={error}
                action={
                  <button
                    type="button"
                    onClick={() => void loadDashboard()}
                    className="h-11 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-black"
                  >
                    נסה שוב
                  </button>
                }
              />
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <StatCard
                  title="אירועים בטיפול אישי"
                  value={stats.myEvents}
                  subtitle="אירועים שהוקצו לעובד"
                  icon={<Icon name="calendar" className="h-6 w-6" />}
                  tone="purple"
                />

                {canSeeLeadsAndWorkOrders && (
                  <button
                    type="button"
                    onClick={() => router.push("/employee/leads")}
                    className="text-right"
                  >
                    <StatCard
                      title="לידים שלי"
                      value={employeeLeadsLoading ? "..." : employeeLeads.length}
                      subtitle={`${newLeadsCount} לידים חדשים לטיפול`}
                      icon={<Icon name="message" className="h-6 w-6" />}
                      tone="amber"
                    />
                  </button>
                )}

                <StatCard
                  title="לקוחות שצריך לבדוק"
                  value={stats.needCheck}
                  subtitle="דורש מעקב אנושי"
                  icon={<Icon name="warning" className="h-6 w-6" />}
                  tone="amber"
                />

                <StatCard
                  title="הודעות לא נקראו"
                  value={stats.unreadMessages}
                  subtitle="מתוך אירועים בטיפול"
                  icon={<Icon name="message" className="h-6 w-6" />}
                  tone="dark"
                />

                <StatCard
                  title="משתמשים פעילים"
                  value={stats.activeUsers}
                  subtitle="במערכת כרגע"
                  icon={<Icon name="users" className="h-6 w-6" />}
                  tone="green"
                />

                {canSeeLeadsAndWorkOrders && (
                  <button
                    type="button"
                    onClick={() => router.push("/employee/work-orders")}
                    className="text-right"
                  >
                    <StatCard
                      title="הוראות עבודה"
                      value={
                        workOrdersDashboard.loading
                          ? "..."
                          : workOrdersDashboard.activeWorkOrdersCount
                      }
                      subtitle={`נותרו ${workOrdersDashboard.summary.remaining} שיחות להיום`}
                      icon={<Icon name="phone" className="h-6 w-6" />}
                      tone="green"
                    />
                  </button>
                )}
              </div>

              {canSeeLeadsAndWorkOrders && (
                <section className="mt-6 rounded-[34px] border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
                  <SectionHeader
                    title="הלידים שלי"
                  subtitle="לידים שהאדמין שייך אליך לטיפול. כאן מתחיל הטיפול לפני חיבור הצ׳אט וה־WhatsApp API."
                  action={
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                      <SearchBox
                        value={leadSearch}
                        onChange={setLeadSearch}
                        placeholder="חיפוש ליד, טלפון, שירות, מקור..."
                      />

                      <button
                        type="button"
                        onClick={() => void loadEmployeeLeads()}
                        disabled={employeeLeadsLoading}
                        className="h-12 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-black text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {employeeLeadsLoading ? "טוען..." : "רענון לידים"}
                      </button>
                    </div>
                  }
                />

                {employeeLeadsError ? (
                  <div className="mt-5 rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
                    {employeeLeadsError}
                  </div>
                ) : null}

                {employeeLeadsLoading ? (
                  <div className="mt-5 rounded-[28px] border border-amber-100 bg-amber-50/60 p-8 text-center text-sm font-black text-amber-800">
                    טוען את הלידים שהוקצו אליך...
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="mt-5">
                    <EmptyState
                      title="אין לידים להצגה"
                      subtitle="ברגע שהאדמין יקצה לך ליד, הוא יופיע כאן לטיפול."
                    />
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3 xl:grid-cols-2">
                    {filteredLeads.map((lead) => {
                      const leadId = normalizeId(lead);
                      const leadName = normalizeLeadName(lead);
                      const leadPhone = normalizeLeadPhone(lead);
                      const leadService = normalizeLeadService(lead);
                      const leadSource = normalizeLeadSource(lead);
                      const status = lead.leadStatus || "new";

                      return (
                        <article
                          key={leadId || leadPhone || leadName}
                          className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-lg"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getLeadStatusClass(
                                    status,
                                  )}`}
                                >
                                  {getLeadStatusLabel(status)}
                                </span>

                                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                                  {leadSource}
                                </span>

                                {isFacebookLead(lead) ? (
                                  <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                                    ליד מפייסבוק
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-3 flex items-start gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-sm font-black text-white">
                                  {initials(leadName)}
                                </div>

                                <div className="min-w-0">
                                  <h3 className="truncate text-xl font-black text-slate-950">
                                    {leadName}
                                  </h3>

                                  <div className="mt-2 grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-2">
                                    <span dir="ltr" className="text-right sm:text-left">
                                      {leadPhone || "—"}
                                    </span>

                                    <span>
                                      תאריך אירוע: {formatDate(lead.eventDate)}
                                    </span>

                                    <span>
                                      שירות: <b className="text-slate-950">{leadService}</b>
                                    </span>

                                    <span>
                                      נוצר: {formatDateTimeAgo(lead.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 rounded-3xl bg-slate-50 p-4">
                                <p className="flex items-center gap-2 text-xs font-black text-slate-400">
                                  <Icon name="message" className="h-4 w-4" />
                                  הערות / מידע מהליד
                                </p>
                                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                                  {lead.notes || lead.campaignName || lead.adName || "אין הערות נוספות"}
                                </p>
                              </div>
                            </div>

                            <div className="grid shrink-0 grid-cols-2 gap-2 lg:w-[172px] lg:grid-cols-1">
                              <button
                                type="button"
                                onClick={() => router.push(`/employee/leads/${leadId}`)}
                                disabled={!leadId}
                                className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                טיפול בליד
                              </button>

                              <a
                                href={leadPhone ? `tel:${leadPhone}` : undefined}
                                className={`inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-black transition ${
                                  leadPhone
                                    ? "bg-white text-slate-700 hover:bg-slate-50"
                                    : "pointer-events-none bg-slate-50 text-slate-300"
                                }`}
                              >
                                התקשר
                              </a>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
                </section>
              )}

              <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <SectionHeader
                    title="אירועים בטיפול שלי"
                    subtitle="אירועים אמיתיים מהשרת שהעובד אחראי לבדוק אישית."
                    action={
                      <SearchBox
                        value={eventSearch}
                        onChange={setEventSearch}
                        placeholder="חיפוש אירוע, לקוח, טלפון, מיקום..."
                      />
                    }
                  />

                  <div className="mt-5 space-y-3">
                    {filteredEvents.map((event) => {
                      const eventId = normalizeId(event);
                      const careStatus = normalizeCareStatus(
                        event.careStatus || event.supportStatus,
                      );
                      const title = normalizeEventTitle(event);
                      const clientName = normalizeClientName(event);
                      const clientPhone = normalizeClientPhone(event);
                      const unread = Number(
                        event.unreadMessages ?? event.unreadCount ?? 0,
                      );

                      return (
                        <article
                          key={eventId || title}
                          className="group rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${careStatusClass(
                                    careStatus,
                                  )}`}
                                >
                                  {careStatusLabel(careStatus)}
                                </span>

                                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                                  {progressLabel(
                                    event.progress || event.status,
                                  )}
                                </span>

                                {unread > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                                    <Icon
                                      name="message"
                                      className="h-3.5 w-3.5"
                                    />
                                    {unread} הודעות
                                  </span>
                                )}
                              </div>

                              <div className="mt-3 flex items-start gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                                  {initials(clientName)}
                                </div>

                                <div className="min-w-0">
                                  <h3 className="truncate text-xl font-black text-slate-950">
                                    {title}
                                  </h3>

                                  <div className="mt-2 grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
                                    <span>
                                      לקוח:{" "}
                                      <b className="text-slate-950">
                                        {clientName}
                                      </b>
                                    </span>

                                    <span
                                      dir="ltr"
                                      className="text-right sm:text-left"
                                    >
                                      {clientPhone || "—"}
                                    </span>

                                    <span>
                                      תאריך:{" "}
                                      <b className="text-slate-950">
                                        {formatDate(
                                          event.eventDate || event.date,
                                        )}
                                      </b>
                                    </span>

                                    <span>
                                      מיקום:{" "}
                                      <b className="text-slate-950">
                                        {normalizeLocation(event)}
                                      </b>
                                    </span>

                                    <span>
                                      סוג:{" "}
                                      <b className="text-slate-950">
                                        {event.eventType || event.type || "—"}
                                      </b>
                                    </span>

                                    <span>
                                      מוזמנים:{" "}
                                      <b className="text-slate-950">
                                        {normalizeGuests(event)}
                                      </b>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                <div className="rounded-3xl bg-slate-50 p-4">
                                  <p className="flex items-center gap-2 text-xs font-black text-slate-400">
                                    <Icon name="message" className="h-4 w-4" />
                                    הודעה אחרונה
                                  </p>
                                  <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                                    {event.lastMessage || "אין הודעה אחרונה"}
                                  </p>
                                  <p className="mt-2 text-xs font-black text-slate-400">
                                    {formatDateTimeAgo(event.lastMessageAt)}
                                  </p>
                                </div>

                                <div className="rounded-3xl border border-dashed border-slate-200 p-4">
                                  <p className="flex items-center gap-2 text-xs font-black text-slate-400">
                                    <Icon name="activity" className="h-4 w-4" />
                                    הערת טיפול
                                  </p>
                                  <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                                    {event.notes ||
                                      event.supportNote ||
                                      "אין הערת טיפול"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="grid shrink-0 grid-cols-2 gap-2 lg:w-[172px] lg:grid-cols-1">
                              <button
                                type="button"
                                onClick={() =>
                                  enterClientDashboard(
                                    normalizeEventClientId(event),
                                  )
                                }
                                disabled={
                                  !normalizeEventClientId(event) ||
                                  enteringUserId ===
                                    normalizeEventClientId(event)
                                }
                                className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {enteringUserId ===
                                normalizeEventClientId(event)
                                  ? "נכנס..."
                                  : "כניסה ללקוח"}
                              </button>

                              <button className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                                פתח שיחה
                              </button>

                              <button className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                                פעולות
                              </button>

                              <button className="h-11 rounded-2xl bg-emerald-50 px-4 text-sm font-black text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100">
                                סמן כטופל
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}

                    {filteredEvents.length === 0 && (
                      <EmptyState
                        title="אין אירועים להצגה"
                        subtitle="לא נמצאו אירועים מהשרת שתואמים לחיפוש או שלא הוקצו לעובד אירועים."
                      />
                    )}
                  </div>
                </section>

                <div className="space-y-6">
                  <section className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <SectionHeader
                      title="משימות מעקב"
                      subtitle="משימות שהגיעו מהשרת לעובד הנוכחי."
                    />

                    <div className="mt-5 space-y-3">
                      {tasks.map((task) => {
                        const priority = normalizeCareStatus(
                          task.priority || task.careStatus,
                        );

                        return (
                          <div
                            key={normalizeId(task) || task.title}
                            className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-black ${careStatusClass(
                                  priority,
                                )}`}
                              >
                                {careStatusLabel(priority)}
                              </span>

                              <div className="min-w-0 text-right">
                                <h3 className="text-base font-black text-slate-950">
                                  {task.title || task.text || "משימה ללא כותרת"}
                                </h3>
                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                  {task.clientName ||
                                    task.customerName ||
                                    "לקוח לא צוין"}{" "}
                                  ·{" "}
                                  {task.eventName ||
                                    task.eventTitle ||
                                    "אירוע לא צוין"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                              <span className="flex items-center gap-1 text-xs font-black text-slate-400">
                                <Icon name="clock" className="h-4 w-4" />
                                {task.dueText || formatDateTimeAgo(task.dueAt)}
                              </span>

                              <button className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-black">
                                טיפול
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {tasks.length === 0 && (
                        <EmptyState
                          title="אין משימות מעקב"
                          subtitle="כרגע לא חזרו משימות מהשרת לעובד הזה."
                        />
                      )}
                    </div>
                  </section>

                  <section className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <SectionHeader
                      title="לקוחות שדורשים בדיקה"
                      subtitle="לקוחות עם הודעות פתוחות או סטטוס טיפול בעייתי."
                    />

                    <div className="mt-5 space-y-3">
                      {eventsNeedCheck.map((event) => {
                        const eventId = normalizeId(event);
                        const careStatus = normalizeCareStatus(
                          event.careStatus || event.supportStatus,
                        );
                        const clientName = normalizeClientName(event);

                        return (
                          <button
                            key={eventId || clientName}
                            className="flex w-full items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-3 text-right transition hover:bg-white hover:shadow-md"
                          >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-950 shadow-sm">
                              {initials(clientName)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${careStatusClass(
                                    careStatus,
                                  )}`}
                                >
                                  {careStatusLabel(careStatus)}
                                </span>
                                <p className="truncate text-sm font-black text-slate-950">
                                  {clientName}
                                </p>
                              </div>
                              <p className="mt-1 truncate text-xs font-bold text-slate-500">
                                {event.lastMessage || "אין הודעה אחרונה"}
                              </p>
                            </div>
                          </button>
                        );
                      })}

                      {eventsNeedCheck.length === 0 && (
                        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 text-center">
                          <p className="text-sm font-black text-emerald-700">
                            אין לקוחות שדורשים בדיקה כרגע
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>

              <section className="mt-6 rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <SectionHeader
                  title="כל המשתמשים"
                  subtitle="נתונים אמיתיים מהשרת עם חיפוש לפי שם, מייל, טלפון, סוג משתמש או סטטוס."
                  action={
                    <SearchBox
                      value={userSearch}
                      onChange={setUserSearch}
                      placeholder="חיפוש משתמש..."
                    />
                  }
                />

                <div className="mt-5 hidden overflow-hidden rounded-[28px] border border-slate-200 lg:block">
                  <table className="w-full border-collapse bg-white text-right">
                    <thead className="bg-slate-50">
                      <tr className="text-sm text-slate-500">
                        <th className="px-5 py-4 font-black">משתמש</th>
                        <th className="px-5 py-4 font-black">מייל</th>
                        <th className="px-5 py-4 font-black">טלפון</th>
                        <th className="px-5 py-4 font-black">סוג</th>
                        <th className="px-5 py-4 font-black">סטטוס</th>
                        <th className="px-5 py-4 font-black">הצטרף</th>
                        <th className="px-5 py-4 font-black">פעילות אחרונה</th>
                        <th className="px-5 py-4 font-black">פעולות</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((currentUser) => {
                        const name = normalizeUserName(currentUser);
                        const status = normalizeUserStatus(currentUser);

                        return (
                          <tr
                            key={normalizeId(currentUser) || currentUser.email}
                            className="transition hover:bg-slate-50"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                                  {initials(name)}
                                </div>
                                <span className="font-black text-slate-950">
                                  {name}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                              {currentUser.email || "—"}
                            </td>

                            <td
                              dir="ltr"
                              className="px-5 py-4 text-right text-sm font-semibold text-slate-600"
                            >
                              {currentUser.phone || "—"}
                            </td>

                            <td className="px-5 py-4">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                                {roleLabel(currentUser.role)}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${userStatusClass(
                                  status,
                                )}`}
                              >
                                {statusLabel(status)}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                              {formatDate(currentUser.createdAt)}
                            </td>

                            <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                              {formatDateTimeAgo(
                                currentUser.lastActivity ||
                                  currentUser.lastSeenAt ||
                                  currentUser.updatedAt,
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    enterClientDashboard(
                                      normalizeId(currentUser),
                                    )
                                  }
                                  disabled={
                                    !normalizeId(currentUser) ||
                                    enteringUserId === normalizeId(currentUser)
                                  }
                                  className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {enteringUserId === normalizeId(currentUser)
                                    ? "נכנס..."
                                    : "כניסה"}
                                </button>
                                <button className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100">
                                  שיחה
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 grid gap-3 lg:hidden">
                  {filteredUsers.map((currentUser) => {
                    const name = normalizeUserName(currentUser);
                    const status = normalizeUserStatus(currentUser);

                    return (
                      <div
                        key={normalizeId(currentUser) || currentUser.email}
                        className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${userStatusClass(
                              status,
                            )}`}
                          >
                            {statusLabel(status)}
                          </span>

                          <div className="flex items-center gap-3">
                            <div>
                              <h3 className="font-black text-slate-950">
                                {name}
                              </h3>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {currentUser.email || "—"}
                              </p>
                            </div>

                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                              {initials(name)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600">
                          <p>
                            טלפון:{" "}
                            <span dir="ltr">{currentUser.phone || "—"}</span>
                          </p>
                          <p>סוג משתמש: {roleLabel(currentUser.role)}</p>
                          <p>
                            פעילות אחרונה:{" "}
                            {formatDateTimeAgo(
                              currentUser.lastActivity ||
                                currentUser.lastSeenAt ||
                                currentUser.updatedAt,
                            )}
                          </p>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              enterClientDashboard(normalizeId(currentUser))
                            }
                            disabled={
                              !normalizeId(currentUser) ||
                              enteringUserId === normalizeId(currentUser)
                            }
                            className="h-11 rounded-2xl bg-slate-950 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {enteringUserId === normalizeId(currentUser)
                              ? "נכנס..."
                              : "כניסה"}
                          </button>
                          <button className="h-11 rounded-2xl border border-slate-200 text-sm font-black text-slate-700">
                            שיחה
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredUsers.length === 0 && (
                  <div className="mt-5">
                    <EmptyState
                      title="אין משתמשים להצגה"
                      subtitle="לא חזרו משתמשים מהשרת או שלא נמצאה התאמה לחיפוש."
                    />
                  </div>
                )}
              </section>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
