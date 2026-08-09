"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";

type VenueFileRow = {
  id: string;
  kind: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  relatedLeadId?: string;
  relatedEventId?: string;
  createdAt?: string;
};

const KIND_LABELS: Record<string, string> = {
  proposal: "הצעת מחיר",
  contract: "חוזה",
  document: "מסמך",
  hall_image: "תמונת אולם",
  other: "אחר",
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("he-IL");
  } catch {
    return value;
  }
}

export default function VenueFilesPage() {
  const params = useParams<{ hallId: string }>();
  const hallId = params?.hallId || "";
  const encodedHallId = encodeURIComponent(hallId);

  const [files, setFiles] = useState<VenueFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [kindFilter, setKindFilter] = useState("all");

  const loadFiles = async () => {
    if (!hallId) return;

    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams();
      if (kindFilter !== "all") {
        query.set("kind", kindFilter);
      }

      const res = await fetch(
        `/api/venues/dashboard/halls/${encodedHallId}/files?${query.toString()}`,
        { cache: "no-store", credentials: "include" }
      );

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "טעינת קבצים נכשלה");
      }

      setFiles(Array.isArray(data.files) ? data.files : []);
    } catch (err) {
      console.error("load files failed:", err);
      setError(err instanceof Error ? err.message : "טעינת קבצים נכשלה");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hallId, kindFilter]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kindFilter === "all" ? "document" : kindFilter);

      const res = await fetch(
        `/api/venues/dashboard/halls/${encodedHallId}/files`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "העלאת קובץ נכשלה");
      }

      await loadFiles();
    } catch (err) {
      console.error("upload failed:", err);
      setError(err instanceof Error ? err.message : "העלאת קובץ נכשלה");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleDelete = async (fileId: string, name: string) => {
    const ok = window.confirm(`למחוק את הקובץ "${name}"?`);
    if (!ok) return;

    setDeletingId(fileId);
    setError("");

    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodedHallId}/files?fileId=${encodeURIComponent(fileId)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "מחיקת קובץ נכשלה");
      }

      setFiles((current) => current.filter((file) => file.id !== fileId));
    } catch (err) {
      console.error("delete failed:", err);
      setError(err instanceof Error ? err.message : "מחיקת קובץ נכשלה");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f6f2] text-[#2b241c]">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/venues/dashboard/halls/${encodedHallId}`}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] shadow-sm transition hover:bg-[#fbf5ea]"
            >
              <ArrowRight size={17} />
              חזרה לניהול אולם
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadFiles}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252]"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              רענון
            </button>

            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl bg-[#b98121] px-4 text-sm font-black text-white">
              {uploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              העלאת קובץ
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,image/*,application/pdf"
                className="hidden"
                disabled={uploading}
                onChange={handleUpload}
              />
            </label>
          </div>
        </div>

        <section className="rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-black">קבצי אולם</h1>
              <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                כל הקבצים שהועלו לאולם — הצעות, חוזים, מסמכים ותמונות.
              </p>
            </div>

            <select
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value)}
              className="h-11 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold"
            >
              <option value="all">כל הסוגים</option>
              <option value="proposal">הצעות מחיר</option>
              <option value="contract">חוזים</option>
              <option value="document">מסמכים</option>
              <option value="hall_image">תמונות אולם</option>
              <option value="other">אחר</option>
            </select>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-5 overflow-x-auto rounded-[24px] border border-[#eadfce]">
            <table className="w-full min-w-[760px] border-collapse text-right">
              <thead className="bg-[#fffdf8]">
                <tr className="border-b border-[#eadfce] text-xs font-black text-[#8a7b68]">
                  <th className="px-4 py-3">שם קובץ</th>
                  <th className="px-4 py-3">סוג</th>
                  <th className="px-4 py-3">גודל</th>
                  <th className="px-4 py-3">תאריך</th>
                  <th className="px-4 py-3">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <Loader2
                        className="mx-auto animate-spin text-[#b98121]"
                        size={28}
                      />
                    </td>
                  </tr>
                ) : files.length ? (
                  files.map((file) => (
                    <tr
                      key={file.id}
                      className="border-b border-[#eadfce] text-sm last:border-b-0"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 font-black">
                          <FileText size={16} className="text-[#b98121]" />
                          {file.originalName || "קובץ ללא שם"}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-bold text-[#6f6252]">
                        {KIND_LABELS[file.kind] || file.kind}
                      </td>
                      <td className="px-4 py-4 font-bold text-[#6f6252]">
                        {formatBytes(file.size)}
                      </td>
                      <td className="px-4 py-4 font-bold text-[#6f6252]">
                        {formatDate(file.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            download={file.originalName || undefined}
                            className="inline-flex h-9 items-center gap-1 rounded-2xl border border-[#eadfce] bg-white px-3 text-xs font-black text-[#6f6252]"
                          >
                            <Download size={14} />
                            הורדה
                          </a>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                file.id,
                                file.originalName || "קובץ"
                              )
                            }
                            disabled={deletingId === file.id}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-700 disabled:opacity-60"
                          >
                            {deletingId === file.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-sm font-bold text-[#8a7b68]"
                    >
                      אין קבצים עדיין. העלי קובץ חדש או העלי הצעה/חוזה דרך ה-CRM.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
