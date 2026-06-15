"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";

type Form101Status = "uploaded" | "approved" | "rejected" | string;
type EmployeeDocumentType = "form101" | "idCard" | "agreement" | string;

type EmployeeForm101 = {
  _id: string;
  id?: string;
  employeeId?: string;
  businessId?: string;
  documentType?: EmployeeDocumentType;
  employeeName?: string;
  employeeEmail?: string;
  employeePhone?: string;
  originalFileName?: string;
  storedFileName?: string;
  r2Key?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  taxYear?: number;
  status?: Form101Status;
  uploadedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type EmployeeAgreement = {
  _id: string;
  id?: string;
  employeeId?: string;
  businessId?: string;
  employeeName?: string;
  employeeEmail?: string;
  employeePhone?: string;
  fullName?: string;
  idNumber?: string;
  signedFileUrl?: string;
  status?: Form101Status;
  signedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type AdminEmployeeDocument = {
  _id: string;
  id?: string;
  source: "form" | "agreement";
  employeeId?: string;
  businessId?: string;
  employeeName?: string;
  employeeEmail?: string;
  employeePhone?: string;
  documentType?: EmployeeDocumentType;
  originalFileName?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  taxYear?: number;
  status?: Form101Status;
  uploadedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

const API = {
  forms101: "/api/admin/forms/101",
  agreements: "/api/admin/employee-agreements",
};

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

function formatDateTime(value?: string) {
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

function formatFileSize(size?: number) {
  if (!size) return "—";
  const mb = size / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)}MB` : `${Math.round(size / 1024)}KB`;
}

function statusLabel(status?: Form101Status) {
  switch (String(status || "").toLowerCase()) {
    case "approved":
      return "מאושר";
    case "rejected":
      return "נדחה";
    case "signed":
      return "נחתם לבדיקה";
    case "uploaded":
      return "הועלה לבדיקה";
    default:
      return "לא ידוע";
  }
}

function statusClass(status?: Form101Status) {
  switch (String(status || "").toLowerCase()) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "signed":
    case "uploaded":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function documentTypeLabel(documentType?: EmployeeDocumentType) {
  switch (String(documentType || "form101")) {
    case "agreement":
      return "הסכם עבודה";
    case "idCard":
      return "תעודת זהות";
    case "form101":
      return "טופס 101";
    default:
      return "מסמך עובד";
  }
}

function documentTypeClass(documentType?: EmployeeDocumentType) {
  switch (String(documentType || "form101")) {
    case "agreement":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "idCard":
      return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
    case "form101":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getDocumentId(doc: AdminEmployeeDocument) {
  return String(doc.id || doc._id || "");
}

function getEmployeeName(doc: AdminEmployeeDocument) {
  return doc.employeeName || "עובד ללא שם";
}

function getEmployeeEmail(doc: AdminEmployeeDocument) {
  return doc.employeeEmail || "—";
}

function getEmployeePhone(doc: AdminEmployeeDocument) {
  return doc.employeePhone || "—";
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
    | "search"
    | "refresh"
    | "file"
    | "open"
    | "users"
    | "warning"
    | "template";
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

  if (name === "file" || name === "template") {
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

  if (name === "open") {
    return (
      <svg {...common}>
        <path d="M14 3h7v7" />
        <path d="M10 14 21 3" />
        <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
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

  return (
    <svg {...common}>
      <path d="m12 3 10 18H2L12 3z" />
      <path d="M12 9v5" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export default function AdminEmployeesPage() {
  const [documents, setDocuments] = useState<AdminEmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [documentFilter, setDocumentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const loadDocuments = useCallback(async () => {
    try {
      setError("");
      setRefreshing(true);

      const params = new URLSearchParams();

      if (statusFilter) params.set("status", statusFilter);
      if (documentFilter && documentFilter !== "agreement") {
        params.set("documentType", documentFilter);
      }
      if (yearFilter) params.set("taxYear", yearFilter);

      const formsUrl = params.toString()
        ? `${API.forms101}?${params.toString()}`
        : API.forms101;

      const agreementsParams = new URLSearchParams();
      if (statusFilter) agreementsParams.set("status", statusFilter);

      const agreementsUrl = agreementsParams.toString()
        ? `${API.agreements}?${agreementsParams.toString()}`
        : API.agreements;

      const [formsResponse, agreementsResponse] = await Promise.all([
        documentFilter === "agreement"
          ? Promise.resolve(null)
          : fetch(formsUrl, {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            }),
        documentFilter && documentFilter !== "agreement"
          ? Promise.resolve(null)
          : fetch(agreementsUrl, {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            }),
      ]);

      const mergedDocuments: AdminEmployeeDocument[] = [];

      if (formsResponse) {
        const data = await formsResponse.json().catch(() => null);

        if (!formsResponse.ok || !data?.success) {
          throw new Error(data?.error || "שגיאה בטעינת מסמכי עובדים");
        }

        const forms: EmployeeForm101[] = Array.isArray(data.documents)
          ? data.documents
          : Array.isArray(data.forms)
          ? data.forms
          : [];

        forms.forEach((form) => {
          mergedDocuments.push({
            ...form,
            source: "form",
            documentType: form.documentType || "form101",
            fileUrl: form.fileUrl,
          });
        });
      }

      if (agreementsResponse) {
        const data = await agreementsResponse.json().catch(() => null);

        if (!agreementsResponse.ok || !data?.success) {
          throw new Error(data?.error || "שגיאה בטעינת הסכמי עובדים");
        }

        const agreements: EmployeeAgreement[] = Array.isArray(data.agreements)
          ? data.agreements
          : Array.isArray(data.documents)
          ? data.documents
          : [];

        agreements.forEach((agreement) => {
          mergedDocuments.push({
            _id: agreement._id,
            id: agreement.id,
            source: "agreement",
            employeeId: agreement.employeeId,
            businessId: agreement.businessId,
            employeeName: agreement.employeeName || agreement.fullName,
            employeeEmail: agreement.employeeEmail,
            employeePhone: agreement.employeePhone,
            documentType: "agreement",
            originalFileName: "הסכם עבודה חתום",
            fileUrl: agreement.signedFileUrl,
            fileType: "application/pdf",
            fileSize: undefined,
            status: agreement.status || "signed",
            uploadedAt: agreement.signedAt,
            createdAt: agreement.createdAt,
            updatedAt: agreement.updatedAt,
          });
        });
      }

      mergedDocuments.sort((a, b) => {
        const aDate = new Date(a.uploadedAt || a.createdAt || 0).getTime();
        const bDate = new Date(b.uploadedAt || b.createdAt || 0).getTime();
        return bDate - aDate;
      });

      setDocuments(mergedDocuments);
    } catch (loadError) {
      console.error("LOAD ADMIN EMPLOYEES DOCUMENTS FAILED:", loadError);
      setDocuments([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "שגיאה בטעינת מסמכי עובדים"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, documentFilter, yearFilter]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const filteredDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return documents;

    return documents.filter((doc) => {
      return (
        getEmployeeName(doc).toLowerCase().includes(q) ||
        getEmployeeEmail(doc).toLowerCase().includes(q) ||
        getEmployeePhone(doc).toLowerCase().includes(q) ||
        String(doc.originalFileName || "").toLowerCase().includes(q) ||
        documentTypeLabel(doc.documentType).toLowerCase().includes(q) ||
        String(doc.documentType || "").toLowerCase().includes(q) ||
        String(doc.employeeId || "").toLowerCase().includes(q)
      );
    });
  }, [documents, search]);

  const stats = useMemo(() => {
    return {
      total: documents.length,
      form101: documents.filter((doc) => doc.documentType === "form101").length,
      idCard: documents.filter((doc) => doc.documentType === "idCard").length,
      agreements: documents.filter((doc) => doc.documentType === "agreement")
        .length,
      waiting: documents.filter((doc) =>
        ["uploaded", "signed"].includes(String(doc.status || ""))
      ).length,
      approved: documents.filter((doc) => doc.status === "approved").length,
      rejected: documents.filter((doc) => doc.status === "rejected").length,
    };
  }, [documents]);

  const years = useMemo(() => {
    const set = new Set<number>();

    documents.forEach((doc) => {
      if (doc.taxYear) set.add(Number(doc.taxYear));
    });

    if (set.size === 0) set.add(new Date().getFullYear());

    return Array.from(set).sort((a, b) => b - a);
  }, [documents]);

  return (
    <div dir="rtl" className="min-h-screen text-slate-950">
      <div className="mx-auto w-full max-w-[1500px] space-y-6">
        <section className="overflow-hidden rounded-[32px] bg-slate-950 p-6 text-white shadow-sm md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-black">
                <Icon name="users" className="h-4 w-4" />
                ניהול עובדים
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight md:text-5xl">
                עובדים ומסמכים
              </h1>

              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-300 md:text-base">
                כאן האדמין רואה את מסמכי העובדים. כניסה לצפייה, אישור, דחייה,
                שעות והערות מתבצעת מתוך תיק העובד.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/employees/agreement-template"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-violet-300/30 bg-violet-500 px-5 text-sm font-black text-white transition hover:bg-violet-600"
              >
                <Icon name="template" className="h-4 w-4" />
                יצירת תבנית הסכם לעובדים
              </Link>

              <button
                type="button"
                onClick={() => void loadDocuments()}
                disabled={refreshing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-black text-slate-300">סה״כ מסמכים</p>
              <p className="mt-2 text-3xl font-black">{stats.total}</p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-black text-slate-300">טופסי 101</p>
              <p className="mt-2 text-3xl font-black">{stats.form101}</p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-black text-slate-300">תעודות זהות</p>
              <p className="mt-2 text-3xl font-black">{stats.idCard}</p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-black text-slate-300">הסכמי עבודה</p>
              <p className="mt-2 text-3xl font-black">{stats.agreements}</p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-black text-slate-300">ממתינים לבדיקה</p>
              <p className="mt-2 text-3xl font-black">{stats.waiting}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1fr_190px_190px_190px_auto]">
            <div className="relative">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="חיפוש לפי עובד, מייל, טלפון, סוג מסמך, קובץ או מזהה..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon name="search" className="h-5 w-5" />
              </span>
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
            >
              <option value="">כל הסטטוסים</option>
              <option value="uploaded">הועלה לבדיקה</option>
              <option value="signed">נחתם לבדיקה</option>
              <option value="approved">מאושר</option>
              <option value="rejected">נדחה</option>
            </select>

            <select
              value={documentFilter}
              onChange={(event) => setDocumentFilter(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
            >
              <option value="">כל סוגי המסמכים</option>
              <option value="form101">טופס 101</option>
              <option value="idCard">תעודת זהות</option>
              <option value="agreement">הסכם עבודה</option>
            </select>

            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
            >
              <option value="">כל השנים</option>
              {years.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setDocumentFilter("");
                setYearFilter("");
              }}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              ניקוי
            </button>
          </div>
        </section>

        {loading ? (
          <section className="rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
            <p className="mt-4 text-sm font-black text-slate-700">
              טוען מסמכי עובדים...
            </p>
          </section>
        ) : error ? (
          <section className="rounded-[32px] border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
            <Icon name="warning" className="mx-auto h-10 w-10 text-rose-600" />
            <h2 className="mt-4 text-xl font-black text-rose-700">
              לא הצלחנו לטעון את מסמכי העובדים
            </h2>
            <p className="mt-2 text-sm font-bold text-rose-600">{error}</p>

            <button
              type="button"
              onClick={() => void loadDocuments()}
              className="mt-5 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white transition hover:bg-rose-700"
            >
              נסה שוב
            </button>
          </section>
        ) : filteredDocuments.length === 0 ? (
          <section className="rounded-[32px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <Icon name="file" className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="mt-4 text-xl font-black text-slate-800">
              אין מסמכי עובדים להצגה
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              לא נמצאו מסמכים או שאין התאמה לחיפוש/סינון.
            </p>
          </section>
        ) : (
          <>
            <section className="hidden overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm xl:block">
              <table className="w-full border-collapse text-right">
                <thead className="bg-slate-50">
                  <tr className="text-sm text-slate-500">
                    <th className="px-5 py-4 font-black">עובד</th>
                    <th className="px-5 py-4 font-black">פרטים</th>
                    <th className="px-5 py-4 font-black">סוג מסמך</th>
                    <th className="px-5 py-4 font-black">שנת מס</th>
                    <th className="px-5 py-4 font-black">קובץ</th>
                    <th className="px-5 py-4 font-black">תאריך העלאה/חתימה</th>
                    <th className="px-5 py-4 font-black">סטטוס</th>
                    <th className="px-5 py-4 font-black">תיק עובד</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredDocuments.map((doc) => {
                    const documentId = getDocumentId(doc);
                    const employeeName = getEmployeeName(doc);

                    return (
                      <tr
                        key={`${doc.source}-${documentId}`}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                              {initials(employeeName)}
                            </div>

                            <div>
                              <p className="font-black text-slate-950">
                                {employeeName}
                              </p>
                              <p className="mt-1 text-xs font-bold text-slate-400">
                                ID: {doc.employeeId || "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-700">
                            {getEmployeeEmail(doc)}
                          </p>
                          <p
                            dir="ltr"
                            className="mt-1 text-right text-sm font-semibold text-slate-500"
                          >
                            {getEmployeePhone(doc)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${documentTypeClass(
                              doc.documentType
                            )}`}
                          >
                            {documentTypeLabel(doc.documentType)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm font-black text-slate-700">
                          {doc.taxYear || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <p className="max-w-[240px] truncate text-sm font-black text-slate-800">
                            {doc.originalFileName ||
                              documentTypeLabel(doc.documentType)}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-400">
                            {formatFileSize(doc.fileSize)} ·{" "}
                            {doc.fileType || "PDF"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                          {formatDateTime(doc.uploadedAt || doc.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                              doc.status
                            )}`}
                          >
                            {statusLabel(doc.status)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {doc.employeeId ? (
                            <Link
                              href={`/admin/employees/${encodeURIComponent(
                                String(doc.employeeId)
                              )}`}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-xs font-black text-white transition hover:bg-black"
                            >
                              <Icon name="open" className="h-3.5 w-3.5" />
                              תיק עובד
                            </Link>
                          ) : (
                            <span className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-400">
                              אין מזהה עובד
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <section className="grid gap-4 xl:hidden">
              {filteredDocuments.map((doc) => {
                const documentId = getDocumentId(doc);
                const employeeName = getEmployeeName(doc);

                return (
                  <article
                    key={`${doc.source}-${documentId}`}
                    className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                          doc.status
                        )}`}
                      >
                        {statusLabel(doc.status)}
                      </span>

                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <h3 className="font-black text-slate-950">
                            {employeeName}
                          </h3>
                          <p className="mt-1 text-xs font-bold text-slate-400">
                            {getEmployeeEmail(doc)}
                          </p>
                        </div>

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                          {initials(employeeName)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600">
                      <p>
                        טלפון: <span dir="ltr">{getEmployeePhone(doc)}</span>
                      </p>
                      <p>סוג מסמך: {documentTypeLabel(doc.documentType)}</p>
                      <p>שנת מס: {doc.taxYear || "—"}</p>
                      <p>
                        קובץ:{" "}
                        {doc.originalFileName ||
                          documentTypeLabel(doc.documentType)}
                      </p>
                      <p>גודל: {formatFileSize(doc.fileSize)}</p>
                      <p>
                        תאריך העלאה/חתימה:{" "}
                        {formatDate(doc.uploadedAt || doc.createdAt)}
                      </p>
                    </div>

                    <div className="mt-5">
                      {doc.employeeId ? (
                        <Link
                          href={`/admin/employees/${encodeURIComponent(
                            String(doc.employeeId)
                          )}`}
                          className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white"
                        >
                          תיק עובד
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="h-11 w-full rounded-2xl bg-slate-100 text-sm font-black text-slate-400"
                        >
                          אין מזהה עובד
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}
      </div>
    </div>
  );
}