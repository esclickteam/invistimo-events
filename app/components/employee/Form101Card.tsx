"use client";

import { useEffect, useState } from "react";

type Form101Status = "missing" | "uploaded" | "approved" | "rejected";

type CurrentForm101 = {
  _id: string;
  originalFileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  taxYear: number;
  status: Form101Status;
  uploadedAt?: string;
  createdAt?: string;
};

type Form101CardProps = {
  employeeId: string;
  businessId: string;
};

function statusLabel(status: Form101Status) {
  switch (status) {
    case "uploaded":
      return "הועלה וממתין לבדיקה";
    case "approved":
      return "מאושר";
    case "rejected":
      return "נדחה — צריך להעלות מחדש";
    default:
      return "לא הועלה";
  }
}

function statusClass(status: Form101Status) {
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

function formatFileSize(size?: number) {
  if (!size) return "";

  const mb = size / 1024 / 1024;

  if (mb >= 1) {
    return `${mb.toFixed(1)}MB`;
  }

  return `${Math.round(size / 1024)}KB`;
}

function formatDate(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function Form101Card({
  employeeId,
  businessId,
}: Form101CardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [currentForm, setCurrentForm] = useState<CurrentForm101 | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function loadCurrentForm() {
    try {
      setError("");
      setLoading(true);

      const params = new URLSearchParams({
        employeeId,
        businessId,
      });

      const res = await fetch(`/api/forms/101/current?${params.toString()}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "שגיאה בטעינת טופס 101");
      }

      setCurrentForm(data?.form101 || null);
    } catch (err) {
      console.error("LOAD FORM 101 FAILED:", err);
      setError(err instanceof Error ? err.message : "שגיאה בטעינת טופס 101");
      setCurrentForm(null);
    } finally {
      setLoading(false);
    }
  }

  async function uploadForm101() {
    try {
      if (!file) {
        alert("בחרי קובץ קודם");
        return;
      }

      setError("");
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("employeeId", employeeId);
      formData.append("businessId", businessId);

      const res = await fetch("/api/forms/101/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "שגיאה בהעלאת טופס 101");
      }

      setFile(null);
      setCurrentForm(data.form101);
      alert("טופס 101 הועלה בהצלחה");
    } catch (err) {
      console.error("UPLOAD FORM 101 FAILED:", err);
      setError(err instanceof Error ? err.message : "שגיאה בהעלאת טופס 101");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (employeeId && businessId) {
      void loadCurrentForm();
    }
  }, [employeeId, businessId]);

  const status: Form101Status = currentForm?.status || "missing";

  return (
    <section dir="rtl" className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">טופס 101</h2>

          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            יש להוריד את הטופס, למלא ולחתום, ואז להעלות כאן קובץ PDF או תמונה.
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black ${statusClass(
            status
          )}`}
        >
          {statusLabel(status)}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-900">1. הורדת הטופס</p>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            הורידו טופס 101 ריק, מלאו אותו ושמרו כקובץ PDF או תמונה.
          </p>

          <a
            href="/api/forms/101/download"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-black"
          >
            הורדת טופס 101
          </a>
        </div>

        <div className="rounded-3xl border border-dashed border-slate-300 p-4">
          <p className="text-sm font-black text-slate-900">2. העלאת טופס חתום</p>

          <input
            type="file"
            accept=".pdf,image/png,image/jpeg"
            disabled={uploading}
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
            }}
            className="mt-4 block w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700 file:ml-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-black file:text-white"
          />

          {file && (
            <p className="mt-2 text-xs font-bold text-slate-500">
              נבחר: {file.name} · {formatFileSize(file.size)}
            </p>
          )}

          <button
            type="button"
            onClick={uploadForm101}
            disabled={uploading || !file}
            className="mt-4 h-11 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "מעלה..." : "העלאת טופס חתום"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
          טוען סטטוס טופס...
        </div>
      ) : currentForm ? (
        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-black text-slate-900">הטופס האחרון שהועלה</p>

          <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
            <span>
              קובץ: <b className="text-slate-950">{currentForm.originalFileName}</b>
            </span>

            <span>
              שנת מס: <b className="text-slate-950">{currentForm.taxYear}</b>
            </span>

            <span>
              גודל: <b className="text-slate-950">{formatFileSize(currentForm.fileSize)}</b>
            </span>

            <span>
              תאריך העלאה:{" "}
              <b className="text-slate-950">
                {formatDate(currentForm.uploadedAt || currentForm.createdAt)}
              </b>
            </span>
          </div>

          <a
            href={currentForm.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            צפייה בקובץ שהועלה
          </a>
        </div>
      ) : (
        <div className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
          עדיין לא הועלה טופס 101.
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
          {error}
        </div>
      )}
    </section>
  );
}