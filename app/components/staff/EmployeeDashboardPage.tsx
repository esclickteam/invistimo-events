"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SoftphoneStatusPanel from "@/app/components/staff/SoftphoneStatusPanel";

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
  status?: EmployeeAgreementStatus;
  signedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ApiForm101 = ApiEmployeeDocument;

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

const API = {
  dashboard: "/api/staff/dashboard",
  users: "/api/staff/users",
  myEvents: "/api/staff/events/my",
  myTasks: "/api/staff/tasks/my",
  form101Current: "/api/forms/101/current",
  form101Upload: "/api/forms/101/upload",
  form101Download: "/api/forms/101/download",
  employeeAgreementCurrent: "/api/employee-agreements/current",
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
  keys: string[]
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
      data?.error || data?.message || `REQUEST_FAILED_${response.status}`
    );
  }

  return data;
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

function formatFileSize(size?: number) {
  if (!size) return "—";

  const mb = size / 1024 / 1024;

  if (mb >= 1) {
    return `${mb.toFixed(1)}MB`;
  }

  return `${Math.round(size / 1024)}KB`;
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

function agreementStatusLabel(status?: EmployeeAgreementStatus) {
  switch (status) {
    case "approved":
      return "הסכם מאושר";
    case "rejected":
      return "הסכם נדחה — ניתן לחתום מחדש";
    case "signed":
      return "נחתם וממתין לבדיקה";
    default:
      return "לא נחתם";
  }
}

function agreementStatusClass(status?: EmployeeAgreementStatus) {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "signed":
      return "border-blue-200 bg-blue-50 text-blue-700";
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

function normalizeEventClientId(event: ApiEvent) {
  return String(
    event.clientId ||
      event.customerId ||
      event.userId ||
      event.ownerId ||
      event.createdBy ||
      ""
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
  return event.clientName || event.customerName || event.ownerName || "לקוח ללא שם";
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
      : "from-slate-950 to-slate-800";

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
          <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
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
  idCard: ApiEmployeeDocument | null
): EmployeeDocumentStatus {
  if (!form101 && !idCard) return "missing";

  if (form101?.status === "rejected" || idCard?.status === "rejected") {
    return "rejected";
  }

  if (form101?.status === "approved" && idCard?.status === "approved") {
    return "approved";
  }

  return "uploaded";
}

function getUploadedDate(document?: ApiEmployeeDocument | null) {
  return formatDate(document?.uploadedAt || document?.createdAt);
}

function DocumentsPanel({
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
}: {
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
}) {
  const [open, setOpen] = useState(false);
  const combinedStatus = getCombinedDocumentsStatus(form101, idCard);
  const agreementStatus = agreement?.status || "missing";
  const canSignAgreement =
    !agreement?.signedFileUrl || agreement.status === "rejected";

  return (
    <>
      <section className="mt-6 rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-lg">
              <Icon name="file" className="h-6 w-6" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  מסמכי עובד
                </h2>

                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${documentStatusClass(
                    combinedStatus
                  )}`}
                >
                  {documentStatusLabel(combinedStatus)}
                </span>
              </div>

              <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-500">
                טופס 101 ותעודת זהות נשמרים במערכת וממתינים לבדיקה. לחצי על
                ניהול מסמכים כדי להעלות או לצפות בקבצים.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onReload}
              disabled={loading || agreementLoading || Boolean(uploadingType)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon
                name="refresh"
                className={`h-4 w-4 ${
                  loading || agreementLoading ? "animate-spin" : ""
                }`}
              />
              רענון סטטוס
            </button>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-black"
            >
              <Icon name="open" className="h-4 w-4" />
              ניהול מסמכים
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-[28px] bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-black text-slate-950">טופס 101</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  {form101
                    ? `הועלה: ${form101.originalFileName || "קובץ"}`
                    : "עדיין לא הועלה טופס 101."}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${documentStatusClass(
                  form101?.status || "missing"
                )}`}
              >
                {documentStatusLabel(form101?.status || "missing")}
              </span>
            </div>

            {form101?.fileUrl && (
              <a
                href={form101.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50"
              >
                <Icon name="open" className="h-4 w-4" />
                צפייה בקובץ
              </a>
            )}
          </div>

          <div className="rounded-[28px] bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-black text-slate-950">
                  תעודת זהות
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  {idCard
                    ? `הועלתה: ${idCard.originalFileName || "קובץ"}`
                    : "עדיין לא הועלתה תעודת זהות."}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${documentStatusClass(
                  idCard?.status || "missing"
                )}`}
              >
                {documentStatusLabel(idCard?.status || "missing")}
              </span>
            </div>

            {idCard?.fileUrl && (
              <a
                href={idCard.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50"
              >
                <Icon name="open" className="h-4 w-4" />
                צפייה בקובץ
              </a>
            )}
          </div>
        </div>

        {loading && (
          <div className="mt-5 rounded-[28px] bg-slate-50 p-5 text-sm font-black text-slate-500">
            טוען סטטוס מסמכים...
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-[28px] border border-rose-200 bg-rose-50 p-5 text-sm font-black text-rose-700">
            {error}
          </div>
        )}
      </section>

      {open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/55 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[34px] bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                  מסמכי עובד
                </span>

                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                  ניהול טופס 101, תעודת זהות והסכם עבודה
                </h2>

                <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-500">
                  הורידי את טופס 101, מלאי וחתמי עליו, ואז העלי אותו יחד עם
                  צילום תעודת זהות. בנוסף ניתן לחתום על הסכם העבודה באתר.
                  ניתן להעלות PDF, JPG או PNG.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl font-black text-slate-500 transition hover:bg-slate-50"
                aria-label="סגירה"
              >
                ×
              </button>
            </div>


            <div className="mt-6 rounded-[30px] border border-violet-200 bg-violet-50 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-black text-slate-950">
                      הסכם עבודה
                    </h3>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${agreementStatusClass(
                        agreementStatus
                      )}`}
                    >
                      {agreementStatusLabel(agreementStatus)}
                    </span>
                  </div>

                  <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                    העובד/ת ממלא/ת את השדות לפי הסדר, חותם/ת, ובסיום נוצר PDF
                    חתום שנשמר במערכת.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {canSignAgreement ? (
                    <a
                      href={signAgreementUrl}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 text-sm font-black text-white transition hover:bg-violet-700"
                    >
                      <Icon name="check" className="h-4 w-4" />
                      חתימה על ההסכם
                    </a>
                  ) : agreement?.signedFileUrl ? (
                    <a
                      href={agreement.signedFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 text-sm font-black text-white transition hover:bg-violet-700"
                    >
                      <Icon name="open" className="h-4 w-4" />
                      צפייה בהסכם חתום
                    </a>
                  ) : null}

                  <a
                    href="/templates/employee-agreement-invistimo.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-white px-5 text-sm font-black text-violet-700 transition hover:bg-violet-50"
                  >
                    <Icon name="open" className="h-4 w-4" />
                    צפייה בתבנית ריקה
                  </a>
                </div>
              </div>

              {agreement?.signedFileUrl && (
                <div className="mt-5 rounded-[28px] border border-violet-100 bg-white p-5">
                  <p className="text-base font-black text-slate-950">
                    ההסכם החתום האחרון
                  </p>

                  <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                    {agreement.fullName && (
                      <span>
                        שם: <b className="text-slate-950">{agreement.fullName}</b>
                      </span>
                    )}

                    {agreement.idNumber && (
                      <span>
                        ת.ז: <b className="text-slate-950">{agreement.idNumber}</b>
                      </span>
                    )}

                    {agreement.signedAt && (
                      <span>
                        תאריך חתימה:{" "}
                        <b className="text-slate-950">
                          {formatDate(agreement.signedAt)}
                        </b>
                      </span>
                    )}
                  </div>

                  <a
                    href={agreement.signedFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    <Icon name="open" className="h-4 w-4" />
                    צפייה בהסכם חתום
                  </a>
                </div>
              )}

              {agreement?.status === "rejected" && agreement.rejectionReason && (
                <div className="mt-5 rounded-[28px] border border-rose-200 bg-rose-50 p-5 text-sm font-black text-rose-700">
                  ההסכם נדחה. סיבה: {agreement.rejectionReason}
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">
                      טופס 101
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                      הורידי טופס ריק, מלאי אותו, חתמי והעלי לכאן.
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${documentStatusClass(
                      form101?.status || "missing"
                    )}`}
                  >
                    {documentStatusLabel(form101?.status || "missing")}
                  </span>
                </div>

                <a
                  href={API.form101Download}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-black"
                >
                  <Icon name="open" className="h-4 w-4" />
                  הורדת טופס 101
                </a>

                <div className="mt-5 rounded-[28px] border border-dashed border-slate-300 bg-white p-5">
                  <p className="text-base font-black text-slate-950">
                    העלאת טופס חתום
                  </p>

                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    disabled={uploadingType === "form101"}
                    onChange={(event) => {
                      setForm101File(event.target.files?.[0] || null);
                    }}
                    className="mt-4 block w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700 file:ml-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-black file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  {form101File && (
                    <p className="mt-3 text-xs font-bold text-slate-500">
                      נבחר קובץ:{" "}
                      <b className="text-slate-950">{form101File.name}</b> ·{" "}
                      {formatFileSize(form101File.size)}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => onUpload("form101")}
                    disabled={uploadingType === "form101" || !form101File}
                    className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploadingType === "form101" ? (
                      <>
                        <Icon name="refresh" className="h-4 w-4 animate-spin" />
                        מעלה...
                      </>
                    ) : (
                      <>
                        <Icon name="check" className="h-4 w-4" />
                        העלאת טופס חתום
                      </>
                    )}
                  </button>
                </div>

                {form101 ? (
                  <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5">
                    <p className="text-base font-black text-slate-950">
                      הטופס האחרון שהועלה
                    </p>

                    <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                      <span>
                        קובץ:{" "}
                        <b className="text-slate-950">
                          {form101.originalFileName || "—"}
                        </b>
                      </span>

                      <span>
                        שנת מס:{" "}
                        <b className="text-slate-950">
                          {form101.taxYear || "—"}
                        </b>
                      </span>

                      <span>
                        גודל:{" "}
                        <b className="text-slate-950">
                          {formatFileSize(form101.fileSize)}
                        </b>
                      </span>

                      <span>
                        תאריך העלאה:{" "}
                        <b className="text-slate-950">
                          {getUploadedDate(form101)}
                        </b>
                      </span>
                    </div>

                    {form101.fileUrl && (
                      <a
                        href={form101.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                      >
                        <Icon name="open" className="h-4 w-4" />
                        צפייה בטופס
                      </a>
                    )}
                  </div>
                ) : (
                  !loading && (
                    <div className="mt-5 rounded-[28px] bg-white p-5 text-sm font-black text-slate-500">
                      עדיין לא הועלה טופס 101.
                    </div>
                  )
                )}
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">
                      תעודת זהות
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                      העלי צילום תעודת זהות או קובץ PDF. אפשר להעלות גם צילום
                      ספח לפי הצורך.
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${documentStatusClass(
                      idCard?.status || "missing"
                    )}`}
                  >
                    {documentStatusLabel(idCard?.status || "missing")}
                  </span>
                </div>

                <div className="mt-5 rounded-[28px] border border-dashed border-slate-300 bg-white p-5">
                  <p className="text-base font-black text-slate-950">
                    העלאת תעודת זהות
                  </p>

                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    disabled={uploadingType === "idCard"}
                    onChange={(event) => {
                      setIdCardFile(event.target.files?.[0] || null);
                    }}
                    className="mt-4 block w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700 file:ml-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-black file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  {idCardFile && (
                    <p className="mt-3 text-xs font-bold text-slate-500">
                      נבחר קובץ:{" "}
                      <b className="text-slate-950">{idCardFile.name}</b> ·{" "}
                      {formatFileSize(idCardFile.size)}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => onUpload("idCard")}
                    disabled={uploadingType === "idCard" || !idCardFile}
                    className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploadingType === "idCard" ? (
                      <>
                        <Icon name="refresh" className="h-4 w-4 animate-spin" />
                        מעלה...
                      </>
                    ) : (
                      <>
                        <Icon name="check" className="h-4 w-4" />
                        העלאת תעודת זהות
                      </>
                    )}
                  </button>
                </div>

                {idCard ? (
                  <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5">
                    <p className="text-base font-black text-slate-950">
                      תעודת הזהות האחרונה שהועלתה
                    </p>

                    <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                      <span>
                        קובץ:{" "}
                        <b className="text-slate-950">
                          {idCard.originalFileName || "—"}
                        </b>
                      </span>

                      <span>
                        גודל:{" "}
                        <b className="text-slate-950">
                          {formatFileSize(idCard.fileSize)}
                        </b>
                      </span>

                      <span>
                        תאריך העלאה:{" "}
                        <b className="text-slate-950">
                          {getUploadedDate(idCard)}
                        </b>
                      </span>
                    </div>

                    {idCard.fileUrl && (
                      <a
                        href={idCard.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                      >
                        <Icon name="open" className="h-4 w-4" />
                        צפייה בתעודת זהות
                      </a>
                    )}
                  </div>
                ) : (
                  !loading && (
                    <div className="mt-5 rounded-[28px] bg-white p-5 text-sm font-black text-slate-500">
                      עדיין לא הועלתה תעודת זהות.
                    </div>
                  )
                )}
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-[28px] border border-rose-200 bg-rose-50 p-5 text-sm font-black text-rose-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={onReload}
                disabled={loading || agreementLoading || Boolean(uploadingType)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon
                  name="refresh"
                  className={`h-4 w-4 ${
                    loading || agreementLoading ? "animate-spin" : ""
                  }`}
                />
                {loading || agreementLoading ? "מרענן..." : "רענון סטטוס"}
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 rounded-2xl bg-slate-950 px-6 text-sm font-black text-white transition hover:bg-black"
              >
                סגירה
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [serverStats, setServerStats] = useState<Partial<DashboardStats>>({});

  const [form101, setForm101] = useState<ApiEmployeeDocument | null>(null);
  const [idCard, setIdCard] = useState<ApiEmployeeDocument | null>(null);
  const [agreement, setAgreement] = useState<ApiEmployeeAgreement | null>(null);
  const [agreementLoading, setAgreementLoading] = useState(true);
  const [form101File, setForm101File] = useState<File | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [uploadingDocumentType, setUploadingDocumentType] =
    useState<EmployeeDocumentType | null>(null);
  const [documentsError, setDocumentsError] = useState("");

  const [userSearch, setUserSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enteringUserId, setEnteringUserId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const currentEmployeeId = String(
    (user as any)?.id || (user as any)?._id || ""
  );
  const currentBusinessId = normalizeUserBusinessId(user as any);

  const signAgreementUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (currentEmployeeId) {
      params.set("employeeId", currentEmployeeId);
    }

    if (currentBusinessId) {
      params.set("businessId", currentBusinessId);
    }

    const query = params.toString();

    return query ? `/employee/agreement/sign?${query}` : "/employee/agreement/sign";
  }, [currentEmployeeId, currentBusinessId]);

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

        const [usersResponse, eventsResponse, tasksResponse] = await Promise.all([
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
          : "שגיאה בטעינת נתוני דשבורד עובדים"
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

      const response = await fetch(`${API.form101Current}?${params.toString()}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "שגיאה בטעינת המסמך");
      }

      return (data?.document ||
        (documentType === "form101" ? data?.form101 : data?.idCard) ||
        null) as ApiEmployeeDocument | null;
    },
    []
  );

  const loadEmployeeDocuments = useCallback(async () => {
    try {
      setDocumentsError("");
      setDocumentsLoading(true);

      const [form101Document, idCardDocument] = await Promise.all([
        loadEmployeeDocument("form101").catch((loadError) => {
          console.error("LOAD FORM 101 FAILED:", loadError);
          return null;
        }),
        loadEmployeeDocument("idCard").catch((loadError) => {
          console.error("LOAD ID CARD FAILED:", loadError);
          return null;
        }),
      ]);

      setForm101(form101Document);
      setIdCard(idCardDocument);
    } catch (loadError) {
      console.error("LOAD EMPLOYEE DOCUMENTS FAILED:", loadError);
      setForm101(null);
      setIdCard(null);
      setDocumentsError(
        loadError instanceof Error
          ? loadError.message
          : "שגיאה בטעינת מסמכי עובד"
      );
    } finally {
      setDocumentsLoading(false);
    }
  }, [loadEmployeeDocument]);

  const loadEmployeeAgreement = useCallback(async () => {
    try {
      setAgreementLoading(true);

      if (!currentEmployeeId || !currentBusinessId) {
        setAgreement(null);
        return;
      }

      const params = new URLSearchParams({
        employeeId: currentEmployeeId,
        businessId: currentBusinessId,
      });

      const response = await fetch(
        `${API.employeeAgreementCurrent}?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "שגיאה בטעינת הסכם העבודה");
      }

      setAgreement((data?.agreement || null) as ApiEmployeeAgreement | null);
    } catch (loadError) {
      console.error("LOAD EMPLOYEE AGREEMENT FAILED:", loadError);
      setAgreement(null);
    } finally {
      setAgreementLoading(false);
    }
  }, [currentEmployeeId, currentBusinessId]);

  const uploadEmployeeDocument = useCallback(
    async (documentType: EmployeeDocumentType) => {
      const selectedFile = documentType === "form101" ? form101File : idCardFile;

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
          (documentType === "form101" ? data?.form101 : data?.idCard) ||
          null) as ApiEmployeeDocument | null;

        if (documentType === "form101") {
          setForm101File(null);
          setForm101(uploadedDocument);
          alert("טופס 101 הועלה בהצלחה");
        } else {
          setIdCardFile(null);
          setIdCard(uploadedDocument);
          alert("תעודת זהות הועלתה בהצלחה");
        }

        await loadEmployeeDocuments();
      } catch (uploadError) {
        console.error("UPLOAD EMPLOYEE DOCUMENT FAILED:", uploadError);
        setDocumentsError(
          uploadError instanceof Error
            ? uploadError.message
            : "שגיאה בהעלאת המסמך"
        );
      } finally {
        setUploadingDocumentType(null);
      }
    },
    [
      form101File,
      idCardFile,
      loadEmployeeDocuments,
      uploadingDocumentType,
    ]
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
        alert("לא הצלחנו להיכנס לדשבורד של הלקוח");
      } finally {
        setEnteringUserId(null);
      }
    },
    [enteringUserId, router]
  );

  useEffect(() => {
    void loadDashboard();
    void loadEmployeeDocuments();
    void loadEmployeeAgreement();
  }, [loadDashboard, loadEmployeeDocuments, loadEmployeeAgreement]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();

    if (!q) return users;

    return users.filter((currentUser) => {
      const name = normalizeUserName(currentUser).toLowerCase();
      const email = String(currentUser.email || "").toLowerCase();
      const phone = String(currentUser.phone || "").toLowerCase();
      const role = roleLabel(currentUser.role).toLowerCase();
      const status = statusLabel(normalizeUserStatus(currentUser)).toLowerCase();

      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        role.includes(q) ||
        status.includes(q)
      );
    });
  }, [userSearch, users]);

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();

    if (!q) return events;

    return events.filter((event) => {
      const title = normalizeEventTitle(event).toLowerCase();
      const clientName = normalizeClientName(event).toLowerCase();
      const clientPhone = normalizeClientPhone(event).toLowerCase();
      const eventType = String(event.eventType || event.type || "").toLowerCase();
      const location = normalizeLocation(event).toLowerCase();
      const careStatus = careStatusLabel(
        normalizeCareStatus(event.careStatus || event.supportStatus)
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
  }, [eventSearch, events]);

  const eventsNeedCheck = useMemo(() => {
    return events.filter((event) => {
      const status = normalizeCareStatus(event.careStatus || event.supportStatus);
      return status === "urgent" || status === "check";
    });
  }, [events]);

  const unreadMessages = useMemo(() => {
    return events.reduce((sum, event) => {
      return sum + Number(event.unreadMessages ?? event.unreadCount ?? 0);
    }, 0);
  }, [events]);

  const activeUsersCount = useMemo(() => {
    return users.filter((currentUser) => {
      return String(normalizeUserStatus(currentUser)).toLowerCase() === "active";
    }).length;
  }, [users]);

  const stats: DashboardStats = {
    totalUsers: Number(serverStats.totalUsers ?? users.length),
    myEvents: Number(serverStats.myEvents ?? events.length),
    needCheck: Number(serverStats.needCheck ?? eventsNeedCheck.length),
    unreadMessages: Number(serverStats.unreadMessages ?? unreadMessages),
    activeUsers: Number(serverStats.activeUsers ?? activeUsersCount),
  };

  const displayName = user?.name || user?.email?.split("@")[0] || "עובד";

  return (
    <div dir="rtl" className="min-h-screen bg-[#F5F7FB] text-slate-950">
      <SoftphoneStatusPanel />

      <main className="min-h-screen pb-10">
        <section className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[36px] bg-slate-950 p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.18)] sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(139,92,246,0.35),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(16,185,129,0.22),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_35%)]" />

            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white">
                  <Icon name="shield" className="h-4 w-4" />
                  דשבורד עובדים
                </span>

                <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                  היי {displayName}, בוקר טוב 👋
                </h1>

                <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-300">
                  כאן העובד רואה נתונים אמיתיים מהשרת: לקוחות, אירועים בטיפול
                  אישי, שיחות שדורשות בדיקה ופעולות שצריך לבצע אצל הלקוח.
                </p>
              </div>

              <div className="flex flex-col gap-3 xl:items-end">
                <button
                  type="button"
                  onClick={() => {
                    void loadDashboard();
                    void loadEmployeeDocuments();
                    void loadEmployeeAgreement();
                  }}
                  disabled={refreshing || documentsLoading || agreementLoading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon
                    name="refresh"
                    className={`h-4 w-4 ${
                      refreshing || documentsLoading || agreementLoading
                        ? "animate-spin"
                        : ""
                    }`}
                  />
                  רענון נתונים
                </button>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[560px]">
                  <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs font-black text-slate-300">משתמשים</p>
                    <p className="mt-2 text-3xl font-black">{stats.totalUsers}</p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs font-black text-slate-300">
                      אירועים שלי
                    </p>
                    <p className="mt-2 text-3xl font-black">{stats.myEvents}</p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs font-black text-slate-300">
                      דורש בדיקה
                    </p>
                    <p className="mt-2 text-3xl font-black">{stats.needCheck}</p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs font-black text-slate-300">
                      הודעות פתוחות
                    </p>
                    <p className="mt-2 text-3xl font-black">
                      {stats.unreadMessages}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DocumentsPanel
            form101={form101}
            idCard={idCard}
            agreement={agreement}
            form101File={form101File}
            idCardFile={idCardFile}
            setForm101File={setForm101File}
            setIdCardFile={setIdCardFile}
            loading={documentsLoading}
            agreementLoading={agreementLoading}
            uploadingType={uploadingDocumentType}
            error={documentsError}
            onUpload={(documentType) => void uploadEmployeeDocument(documentType)}
            onReload={() => {
              void loadEmployeeDocuments();
              void loadEmployeeAgreement();
            }}
            signAgreementUrl={signAgreementUrl}
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
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="אירועים בטיפול אישי"
                  value={stats.myEvents}
                  subtitle="אירועים שהוקצו לעובד"
                  icon={<Icon name="calendar" className="h-6 w-6" />}
                  tone="purple"
                />

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
              </div>

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
                        event.careStatus || event.supportStatus
                      );
                      const title = normalizeEventTitle(event);
                      const clientName = normalizeClientName(event);
                      const clientPhone = normalizeClientPhone(event);
                      const unread = Number(
                        event.unreadMessages ?? event.unreadCount ?? 0
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
                                    careStatus
                                  )}`}
                                >
                                  {careStatusLabel(careStatus)}
                                </span>

                                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                                  {progressLabel(event.progress || event.status)}
                                </span>

                                {unread > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                                    <Icon name="message" className="h-3.5 w-3.5" />
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
                                        {formatDate(event.eventDate || event.date)}
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
                                  enterClientDashboard(normalizeEventClientId(event))
                                }
                                disabled={
                                  !normalizeEventClientId(event) ||
                                  enteringUserId === normalizeEventClientId(event)
                                }
                                className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {enteringUserId === normalizeEventClientId(event)
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
                          task.priority || task.careStatus
                        );

                        return (
                          <div
                            key={normalizeId(task) || task.title}
                            className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-black ${careStatusClass(
                                  priority
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
                          event.careStatus || event.supportStatus
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
                                    careStatus
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
                                  status
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
                                  currentUser.updatedAt
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    enterClientDashboard(normalizeId(currentUser))
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
                              status
                            )}`}
                          >
                            {statusLabel(status)}
                          </span>

                          <div className="flex items-center gap-3">
                            <div>
                              <h3 className="font-black text-slate-950">{name}</h3>
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
                                currentUser.updatedAt
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