"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ExternalLink, FolderOpen, Loader2, RefreshCw, Trash2 } from "lucide-react";
import VenueConfirmDialog from "@/components/venues/VenueConfirmDialog";

type FileRow = {
  id: string;
  name: string;
  url: string;
  type: string;
  category: string;
  sourceId: string;
  sourceName: string;
  uploadedAt: string | null;
  size: number;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("he-IL");
  } catch {
    return value;
  }
}

function formatSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VenueFilesPage() {
  const params = useParams<{ hallId: string }>();
  const hallId = params?.hallId || "";

  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FileRow | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/files`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "טעינה נכשלה");
      }
      setFiles(data.files || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "טעינה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hallId) load();
  }, [hallId]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setError("");
    try {
      const qs = new URLSearchParams({
        fileId: pendingDelete.id,
        sourceId: pendingDelete.sourceId,
        category: pendingDelete.category,
      });
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/files?${qs}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "מחיקה נכשלה");
      }
      setPendingDelete(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "מחיקה נכשלה");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-6 md:px-7">
      <header className="mb-5 rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black text-[#9b8a73]">ניהול אולם › קבצים</div>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black">
              <FolderOpen className="text-[#b98121]" />
              קבצים
            </h1>
            <p className="mt-2 text-sm font-bold text-[#7f705d]">
              הצעות מחיר וחוזים מלידים באולם. קבצים מועלים דרך CRM — מחיקה מסירה את הקישור מהליד.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            רענון
          </button>
        </div>
      </header>

      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mb-4 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-4 py-3 text-xs font-bold leading-5 text-[#8a7b68]">
        טיפ: העלי קבצים ישירות מכרטיס ליד ב-CRM. כאן תראי את כל הקבצים של האולם במקום אחד.
      </div>

      <div className="rounded-[28px] border border-[#eadfce] bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-bold text-[#8a7b68]">
            <Loader2 size={20} className="animate-spin text-[#b98121]" />
            טוען קבצים...
          </div>
        ) : files.length === 0 ? (
          <div className="py-16 text-center">
            <FolderOpen size={40} className="mx-auto text-[#d5b36d]" />
            <p className="mt-3 text-sm font-black text-[#2b241c]">אין קבצים עדיין</p>
            <p className="mt-1 text-xs font-bold text-[#8a7b68]">
              העלי הצעת מחיר או חוזה בליד — הקובץ יופיע כאן אוטומטית.
            </p>
            <Link
              href={`/venues/dashboard/halls/${encodeURIComponent(hallId)}/crm`}
              className="mt-4 inline-flex text-sm font-black text-[#b98121]"
            >
              מעבר ללידים
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[#f4ead9]">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-sm font-black text-[#2b241c]">{file.name}</div>
                  <div className="mt-1 text-xs font-bold text-[#8a7b68]">
                    {file.category} · {file.sourceName} · {formatSize(file.size)}
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-[#9b8a73]">
                    {formatDate(file.uploadedAt)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-4 text-sm font-black text-[#b98121]"
                  >
                    <ExternalLink size={16} />
                    פתיחה
                  </a>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(file)}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-black text-rose-700"
                  >
                    <Trash2 size={16} />
                    מחיקה
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <VenueConfirmDialog
        open={Boolean(pendingDelete)}
        title="מחיקת קובץ"
        message={
          pendingDelete
            ? `להסיר את "${pendingDelete.name}" מהליד של ${pendingDelete.sourceName}? הקובץ יוסר מהמערכת — לא ניתן לבטל.`
            : ""
        }
        confirmLabel="מחק"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
