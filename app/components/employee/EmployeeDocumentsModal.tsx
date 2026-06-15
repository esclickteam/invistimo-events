"use client";

import React, { useEffect, useMemo, useState } from "react";

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

  // מוכן להמשך — הדשבורד יכול לשלוח בעתיד בלי לשבור את הקומפוננטה
  hoursUpdates?: ApiEmployeeHoursUpdate[];
  payslips?: ApiEmployeePayslip[];
  hoursLoading?: boolean;
  payslipsLoading?: boolean;
};

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

function documentStatusLabel(status?: EmployeeDocumentStatus) {
  switch (status) {
    case "approved":
      return "מאושר";
    case "rejected":
      return "נדחה — ניתן להעלות מחדש";
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
  if (normalized === "paid") return "שולם";

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

  if (normalized === "pending" || normalized === "uploaded" || normalized === "sent") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
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
    | "close";
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
      className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-black ${className}`}
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
      className={`flex min-w-[180px] flex-1 items-center justify-between gap-3 rounded-2xl border p-3 text-right transition ${
        active
          ? "border-slate-900 bg-slate-950 text-white shadow-lg"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {icon}
        </span>

        <span>
          <span className="block text-sm font-black">{title}</span>
          <span
            className={`mt-0.5 block text-[11px] font-bold ${
              active ? "text-slate-200" : "text-slate-400"
            }`}
          >
            {subtitle}
          </span>
        </span>
      </span>

      {badge}
    </button>
  );
}

function ReadonlyNotice({ text }: { text?: string }) {
  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-bold leading-6 text-sky-800">
      <div className="flex items-start gap-2">
        <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {text ||
            "המסמך כבר נשלח למערכת ולכן לא ניתן לערוך או להחליף אותו מתוך תיק העובד. אם צריך תיקון, האדמין צריך לדחות/לפתוח מחדש."}
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
            ". ניתן להעלות קובץ חדש."
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
          <p className="text-lg font-black text-slate-950">{title}</p>

          <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
            <span>
              קובץ:{" "}
              <b className="text-slate-950">
                {document.originalFileName || "—"}
              </b>
            </span>

            {document.taxYear && (
              <span>
                שנת מס: <b className="text-slate-950">{document.taxYear}</b>
              </span>
            )}

            <span>
              גודל:{" "}
              <b className="text-slate-950">
                {formatFileSize(document.fileSize)}
              </b>
            </span>

            <span>
              תאריך העלאה:{" "}
              <b className="text-slate-950">{getUploadedDate(document)}</b>
            </span>

            {document.approvedAt && (
              <span>
                תאריך אישור:{" "}
                <b className="text-slate-950">
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
      <p className="text-lg font-black text-slate-950">{title}</p>
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
        className="mt-5 block w-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700 file:ml-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-black file:text-white disabled:cursor-not-allowed disabled:opacity-60"
      />

      {selectedFile && (
        <p className="mt-3 text-xs font-bold text-slate-500">
          נבחר קובץ: <b className="text-slate-950">{selectedFile.name}</b> ·{" "}
          {formatFileSize(selectedFile.size)}
        </p>
      )}

      <button
        type="button"
        onClick={() => onUpload(documentType)}
        disabled={isUploading || !selectedFile}
        className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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
}: EmployeeDocumentsModalProps) {
  const [activeTab, setActiveTab] = useState<DocumentsTab>("form101");

  const form101Status = form101?.status || "missing";
  const idCardStatus = idCard?.status || "missing";

  const agreementStatus = getAgreementEffectiveStatus(agreement);
  const agreementFileUrl = getAgreementFileUrl(agreement);
  const agreementDate = getAgreementDate(agreement);
  const canSignAgreement =
    agreementStatus === "missing" || agreementStatus === "rejected";

  const canUploadForm101 = canUploadDocument(form101);
  const canUploadIdCard = canUploadDocument(idCard);

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
        subtitle: "דיווחים ועדכונים",
        icon: <Icon name="clock" className="h-5 w-5" />,
        badge: (
          <Badge className="border-slate-200 bg-slate-50 text-slate-600">
            {hoursUpdates.length}
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
    [agreementStatus, form101Status, hoursUpdates.length, idCardStatus, payslips.length],
  );

  if (!open) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/45 px-3 py-5 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                התיק עובד שלי
              </span>

              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                מסמכים, הסכמים, שעות ותלושי שכר
              </h2>

              <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-500">
                כל אזור נמצא בטאב נפרד. לאחר שליחת מסמך הוא נשמר לצפייה בלבד
                עד שאדמין מאשר או דוחה אותו.
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
          {(loading || agreementLoading || hoursLoading || payslipsLoading) && (
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
                    <h3 className="text-xl font-black text-slate-950">
                      טופס 101
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                      הורידי טופס 101 ריק, מלאי אותו, חתמי והעלי למערכת.
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
                      className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-black"
                    >
                      <Icon name="open" className="h-4 w-4" />
                      הורדת טופס 101 ריק
                    </a>

                    <div className="mt-5">
                      <UploadDocumentBox
                        documentType="form101"
                        title="העלאת טופס 101 חתום"
                        description="ניתן להעלות PDF, JPG או PNG. אחרי השליחה לא ניתן להחליף את הקובץ אלא אם הוא נדחה."
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
                    title="הטופס האחרון שהועלה"
                    document={form101}
                    viewLabel="צפייה בטופס"
                  />
                ) : (
                  !loading && (
                    <EmptyTabState
                      title="עדיין לא הועלה טופס 101"
                      subtitle="אחרי שהעובד יעלה טופס חתום, הוא יופיע כאן לצפייה בלבד עם סטטוס בדיקה."
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
                    <h3 className="text-xl font-black text-slate-950">
                      תעודת זהות
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                      העלאת צילום תעודת זהות או קובץ PDF. אפשר להעלות גם ספח
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
                      title="העלאת תעודת זהות"
                      description="ניתן להעלות PDF, JPG או PNG. אחרי השליחה לא ניתן להחליף את הקובץ אלא אם הוא נדחה."
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
                    title="תעודת הזהות האחרונה שהועלתה"
                    document={idCard}
                    viewLabel="צפייה בתעודת זהות"
                  />
                ) : (
                  !loading && (
                    <EmptyTabState
                      title="עדיין לא הועלתה תעודת זהות"
                      subtitle="אחרי שהעובד יעלה תעודת זהות, היא תופיע כאן לצפייה בלבד עם סטטוס בדיקה."
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
                    <h3 className="text-xl font-black text-slate-950">
                      הסכם עבודה
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                      העובד ממלא את השדות, חותם, ובסיום נוצר PDF חתום שנשמר
                      במערכת.
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
                    <ReadonlyNotice text="ההסכם כבר נחתם ונשמר במערכת. העובד יכול לצפות בהסכם החתום בלבד, ללא עריכה." />
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  {canSignAgreement ? (
                    <a
                      href={signAgreementUrl}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-black"
                    >
                      <Icon name="check" className="h-4 w-4" />
                      חתימה על ההסכם
                    </a>
                  ) : agreementFileUrl ? (
                    <a
                      href={agreementFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-black"
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
                        <p className="text-lg font-black text-slate-950">
                          ההסכם החתום האחרון
                        </p>

                        <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                          {agreement.fullName && (
                            <span>
                              שם:{" "}
                              <b className="text-slate-950">
                                {agreement.fullName}
                              </b>
                            </span>
                          )}

                          {agreement.idNumber && (
                            <span>
                              ת.ז:{" "}
                              <b className="text-slate-950">
                                {agreement.idNumber}
                              </b>
                            </span>
                          )}

                          {agreement.email && (
                            <span>
                              מייל:{" "}
                              <b className="text-slate-950">
                                {agreement.email}
                              </b>
                            </span>
                          )}

                          {agreementDate && (
                            <span>
                              תאריך חתימה:{" "}
                              <b className="text-slate-950">
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
                      subtitle="כאשר העובד יחתום על ההסכם, ה-PDF החתום יופיע כאן לצפייה בלבד."
                    />
                  )
                )}
              </div>
            </div>
          )}

          {activeTab === "hours" && (
            <div className="space-y-5">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                <h3 className="text-xl font-black text-slate-950">
                  שעות ועדכוני נוכחות
                </h3>

                <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                  כאן יוצגו דיווחי שעות ועדכונים שנשלחו לעובד. לאחר שליחה הם
                  לצפייה בלבד.
                </p>

                <div className="mt-5">
                  <ReadonlyNotice text="טאב שעות מיועד לצפייה ועדכונים בלבד. עריכה/תיקון שעות צריכה להתבצע דרך המעסיק או האדמין לפי ההרשאות." />
                </div>
              </div>

              {hoursUpdates.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {hoursUpdates.map((item) => {
                    const id = String(item.id || item._id || Math.random());
                    const period =
                      item.period ||
                      [monthName(item.month), item.year].filter(Boolean).join(" ");

                    return (
                      <div
                        key={id}
                        className="rounded-[26px] border border-slate-200 bg-white p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-black text-slate-950">
                              {item.title || "עדכון שעות"}
                            </p>

                            <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                              <span>
                                תקופה:{" "}
                                <b className="text-slate-950">
                                  {period || "—"}
                                </b>
                              </span>

                              <span>
                                סה״כ שעות:{" "}
                                <b className="text-slate-950">
                                  {item.totalHours || "—"}
                                </b>
                              </span>

                              <span>
                                תאריך שליחה:{" "}
                                <b className="text-slate-950">
                                  {formatDate(item.submittedAt || item.createdAt)}
                                </b>
                              </span>

                              {item.note && (
                                <span>
                                  הערה:{" "}
                                  <b className="text-slate-950">{item.note}</b>
                                </span>
                              )}
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
                            צפייה בקובץ שעות
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                !hoursLoading && (
                  <EmptyTabState
                    title="אין עדיין עדכוני שעות"
                    subtitle="ברגע שיהיו דיווחי שעות או קבצי נוכחות לעובד, הם יופיעו כאן."
                  />
                )
              )}
            </div>
          )}

          {activeTab === "payslips" && (
            <div className="space-y-5">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                <h3 className="text-xl font-black text-slate-950">
                  תלושי שכר
                </h3>

                <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                  כאן יוצגו תלושי השכר שהועלו לעובד. התלושים הם לצפייה בלבד
                  ואינם ניתנים לעריכה.
                </p>

                <div className="mt-5">
                  <ReadonlyNotice text="תלושי שכר מוצגים לעובד לצפייה בלבד. העלאה, החלפה או מחיקה צריכות להתבצע דרך המעסיק/אדמין." />
                </div>
              </div>

              {payslips.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {payslips.map((item) => {
                    const id = String(item.id || item._id || Math.random());
                    const period =
                      item.period ||
                      [monthName(item.month), item.year].filter(Boolean).join(" ");

                    return (
                      <div
                        key={id}
                        className="rounded-[26px] border border-slate-200 bg-white p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-black text-slate-950">
                              {item.title || "תלוש שכר"}
                            </p>

                            <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                              <span>
                                תקופה:{" "}
                                <b className="text-slate-950">
                                  {period || "—"}
                                </b>
                              </span>

                              <span>
                                ברוטו:{" "}
                                <b className="text-slate-950">
                                  {formatMoney(item.grossSalary)}
                                </b>
                              </span>

                              <span>
                                נטו:{" "}
                                <b className="text-slate-950">
                                  {formatMoney(item.netSalary)}
                                </b>
                              </span>

                              <span>
                                תאריך העלאה:{" "}
                                <b className="text-slate-950">
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
                    subtitle="כאשר המעסיק או האדמין יעלו תלושי שכר, הם יופיעו כאן לצפייה בלבד."
                  />
                )
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold leading-6 text-slate-400">
            כל מסמך שנשלח נשמר במערכת ולא ניתן לעריכה מצד העובד לאחר השליחה.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onReload}
              disabled={
                loading ||
                agreementLoading ||
                hoursLoading ||
                payslipsLoading ||
                Boolean(uploadingType)
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon
                name="refresh"
                className={`h-4 w-4 ${
                  loading || agreementLoading || hoursLoading || payslipsLoading
                    ? "animate-spin"
                    : ""
                }`}
              />
              רענון סטטוס
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-2xl bg-slate-950 px-6 text-sm font-black text-white transition hover:bg-black"
            >
              סגירה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}