"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";

type Form101Status = "uploaded" | "approved" | "rejected" | string;

type EmployeeForm101 = {
  _id: string;
  id?: string;

  employeeId?: string;
  businessId?: string;

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

const API = {
  forms101: "/api/admin/forms/101",
  updateStatus: (formId: string) => `/api/admin/forms/101/${formId}/status`,
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

  if (mb >= 1) {
    return `${mb.toFixed(1)}MB`;
  }

  return `${Math.round(size / 1024)}KB`;
}

function statusLabel(status?: Form101Status) {
  switch (String(status || "").toLowerCase()) {
    case "approved":
      return "מאושר";
    case "rejected":
      return "נדחה";
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
    case "uploaded":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function getFormId(form: EmployeeForm101) {
  return String(form.id || form._id || "");
}

function getEmployeeName(form: EmployeeForm101) {
  return form.employeeName || "עובד ללא שם";
}

function getEmployeeEmail(form: EmployeeForm101) {
  return form.employeeEmail || "—";
}

function getEmployeePhone(form: EmployeeForm101) {
  return form.employeePhone || "—";
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
    | "check"
    | "x"
    | "open"
    | "users"
    | "warning";
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
  const [forms, setForms] = useState<EmployeeForm101[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const loadForms = useCallback(async () => {
    try {
      setError("");
      setRefreshing(true);

      const params = new URLSearchParams();

      if (statusFilter) {
        params.set("status", statusFilter);
      }

      if (yearFilter) {
        params.set("taxYear", yearFilter);
      }

      const url = params.toString()
        ? `${API.forms101}?${params.toString()}`
        : API.forms101;

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "שגיאה בטעינת טפסי 101");
      }

      setForms(Array.isArray(data.forms) ? data.forms : []);
    } catch (loadError) {
      console.error("LOAD ADMIN EMPLOYEES FORMS 101 FAILED:", loadError);
      setForms([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "שגיאה בטעינת טפסי 101"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, yearFilter]);

  useEffect(() => {
    void loadForms();
  }, [loadForms]);

  const filteredForms = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return forms;

    return forms.filter((form) => {
      return (
        getEmployeeName(form).toLowerCase().includes(q) ||
        getEmployeeEmail(form).toLowerCase().includes(q) ||
        getEmployeePhone(form).toLowerCase().includes(q) ||
        String(form.originalFileName || "").toLowerCase().includes(q) ||
        String(form.employeeId || "").toLowerCase().includes(q)
      );
    });
  }, [forms, search]);

  const stats = useMemo(() => {
    return {
      total: forms.length,
      uploaded: forms.filter((form) => form.status === "uploaded").length,
      approved: forms.filter((form) => form.status === "approved").length,
      rejected: forms.filter((form) => form.status === "rejected").length,
    };
  }, [forms]);

  const years = useMemo(() => {
    const set = new Set<number>();

    forms.forEach((form) => {
      if (form.taxYear) {
        set.add(Number(form.taxYear));
      }
    });

    if (set.size === 0) {
      set.add(new Date().getFullYear());
    }

    return Array.from(set).sort((a, b) => b - a);
  }, [forms]);

  async function updateStatus(formId: string, status: "approved" | "rejected" | "uploaded") {
    if (!formId || updatingId) return;

    try {
      setUpdatingId(formId);

      const response = await fetch(API.updateStatus(formId), {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "שגיאה בעדכון סטטוס");
      }

      setForms((prev) =>
        prev.map((form) =>
          getFormId(form) === formId
            ? {
                ...form,
                status,
                updatedAt: new Date().toISOString(),
              }
            : form
        )
      );
    } catch (updateError) {
      console.error("UPDATE FORM 101 STATUS FAILED:", updateError);
      alert(
        updateError instanceof Error
          ? updateError.message
          : "שגיאה בעדכון סטטוס"
      );
    } finally {
      setUpdatingId(null);
    }
  }

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
                עובדים וטפסי 101
              </h1>

              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-300 md:text-base">
                כאן האדמין רואה את טפסי 101 של כל העובדים/לקוחות, כולל סטטוס,
                תאריך העלאה, צפייה בקובץ ואישור או דחייה.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadForms()}
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

          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-black text-slate-300">סה״כ טפסים</p>
              <p className="mt-2 text-3xl font-black">{stats.total}</p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-black text-slate-300">ממתינים לבדיקה</p>
              <p className="mt-2 text-3xl font-black">{stats.uploaded}</p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-black text-slate-300">מאושרים</p>
              <p className="mt-2 text-3xl font-black">{stats.approved}</p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-black text-slate-300">נדחו</p>
              <p className="mt-2 text-3xl font-black">{stats.rejected}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1fr_220px_220px_auto]">
            <div className="relative">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="חיפוש לפי עובד, מייל, טלפון, קובץ או מזהה..."
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
              <option value="approved">מאושר</option>
              <option value="rejected">נדחה</option>
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
              טוען טפסי 101...
            </p>
          </section>
        ) : error ? (
          <section className="rounded-[32px] border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
            <Icon name="warning" className="mx-auto h-10 w-10 text-rose-600" />
            <h2 className="mt-4 text-xl font-black text-rose-700">
              לא הצלחנו לטעון את טפסי 101
            </h2>
            <p className="mt-2 text-sm font-bold text-rose-600">{error}</p>

            <button
              type="button"
              onClick={() => void loadForms()}
              className="mt-5 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white transition hover:bg-rose-700"
            >
              נסה שוב
            </button>
          </section>
        ) : filteredForms.length === 0 ? (
          <section className="rounded-[32px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <Icon name="file" className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="mt-4 text-xl font-black text-slate-800">
              אין טפסי 101 להצגה
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              לא נמצאו טפסים או שאין התאמה לחיפוש/סינון.
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
                    <th className="px-5 py-4 font-black">שנת מס</th>
                    <th className="px-5 py-4 font-black">קובץ</th>
                    <th className="px-5 py-4 font-black">תאריך העלאה</th>
                    <th className="px-5 py-4 font-black">סטטוס</th>
                    <th className="px-5 py-4 font-black">פעולות</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredForms.map((form) => {
                    const formId = getFormId(form);
                    const employeeName = getEmployeeName(form);
                    const isUpdating = updatingId === formId;

                    return (
                      <tr key={formId} className="transition hover:bg-slate-50">
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
                                ID: {form.employeeId || "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-700">
                            {getEmployeeEmail(form)}
                          </p>
                          <p dir="ltr" className="mt-1 text-right text-sm font-semibold text-slate-500">
                            {getEmployeePhone(form)}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm font-black text-slate-700">
                          {form.taxYear || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <p className="max-w-[240px] truncate text-sm font-black text-slate-800">
                            {form.originalFileName || "טופס 101"}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-400">
                            {formatFileSize(form.fileSize)} · {form.fileType || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                          {formatDateTime(form.uploadedAt || form.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                              form.status
                            )}`}
                          >
                            {statusLabel(form.status)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {form.fileUrl ? (
                              <a
                                href={form.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-black"
                              >
                                <Icon name="open" className="h-3.5 w-3.5" />
                                צפייה
                              </a>
                            ) : (
                              <span className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-400">
                                אין קובץ
                              </span>
                            )}

                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => void updateStatus(formId, "approved")}
                              className="inline-flex items-center gap-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Icon name="check" className="h-3.5 w-3.5" />
                              אשר
                            </button>

                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => void updateStatus(formId, "rejected")}
                              className="inline-flex items-center gap-1 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Icon name="x" className="h-3.5 w-3.5" />
                              דחה
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <section className="grid gap-4 xl:hidden">
              {filteredForms.map((form) => {
                const formId = getFormId(form);
                const employeeName = getEmployeeName(form);
                const isUpdating = updatingId === formId;

                return (
                  <article
                    key={formId}
                    className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                          form.status
                        )}`}
                      >
                        {statusLabel(form.status)}
                      </span>

                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <h3 className="font-black text-slate-950">
                            {employeeName}
                          </h3>
                          <p className="mt-1 text-xs font-bold text-slate-400">
                            {getEmployeeEmail(form)}
                          </p>
                        </div>

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                          {initials(employeeName)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600">
                      <p>
                        טלפון: <span dir="ltr">{getEmployeePhone(form)}</span>
                      </p>
                      <p>שנת מס: {form.taxYear || "—"}</p>
                      <p>קובץ: {form.originalFileName || "טופס 101"}</p>
                      <p>גודל: {formatFileSize(form.fileSize)}</p>
                      <p>תאריך העלאה: {formatDate(form.uploadedAt || form.createdAt)}</p>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      {form.fileUrl ? (
                        <a
                          href={form.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white"
                        >
                          צפייה
                        </a>
                      ) : (
                        <button
                          disabled
                          className="h-11 rounded-2xl bg-slate-100 text-sm font-black text-slate-400"
                        >
                          אין קובץ
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => void updateStatus(formId, "approved")}
                        className="h-11 rounded-2xl bg-emerald-50 text-sm font-black text-emerald-700 ring-1 ring-emerald-200 disabled:opacity-50"
                      >
                        אשר
                      </button>

                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => void updateStatus(formId, "rejected")}
                        className="h-11 rounded-2xl bg-rose-50 text-sm font-black text-rose-700 ring-1 ring-rose-200 disabled:opacity-50"
                      >
                        דחה
                      </button>
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