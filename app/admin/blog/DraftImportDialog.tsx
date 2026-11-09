"use client";

import { useState } from "react";
import { AdminButton } from "@/app/components/admin/ui/AdminUI";
import { formatReadingTime } from "@/lib/blog/reading";

type DraftRow = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  coverImage: string;
  readingMinutes: number;
  faqCount: number;
  seoTitle: string;
  existing: boolean;
};

export default function DraftImportDialog({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  async function openDialog() {
    setOpen(true);
    setError("");
    setResult("");
    setBusy(true);
    try {
      const response = await fetch("/api/admin/blog/import-drafts");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "אין הרשאה לייבוא");
      const rows = (data.drafts || []) as DraftRow[];
      setDrafts(rows);
      setSelected(rows.filter((row) => !row.existing).map((row) => row.slug));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "לא ניתן לטעון את הטיוטות");
    } finally {
      setBusy(false);
    }
  }

  function toggle(slug: string) {
    setSelected((current) => (current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]));
  }

  const available = drafts.filter((row) => !row.existing).map((row) => row.slug);
  const allSelected = available.length > 0 && available.every((slug) => selected.includes(slug));

  async function confirmImport() {
    setBusy(true);
    setError("");
    setResult("");
    try {
      const response = await fetch("/api/admin/blog/import-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: selected }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "הייבוא נכשל");
      const created = Array.isArray(data.created) ? data.created.length : 0;
      const skipped = Array.isArray(data.skipped) ? data.skipped.length : 0;
      setResult(`יובאו ${created} טיוטות. ${skipped} כבר היו במערכת ולא שונו.`);
      setDrafts((current) =>
        current.map((row) => (data.created?.includes(row.slug) || data.skipped?.includes(row.slug) ? { ...row, existing: true } : row))
      );
      setSelected([]);
      onImported();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "הייבוא נכשל");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AdminButton variant="secondary" onClick={openDialog}>
        ייבוא טיוטות
      </AdminButton>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="draft-import-title"
            className="grid max-h-[85vh] w-full max-w-2xl gap-4 overflow-y-auto bg-white p-5 text-right shadow-xl"
            dir="rtl"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="draft-import-title" className="text-xl font-black">
                ייבוא טיוטות
              </h2>
              <button type="button" className="text-sm font-bold" onClick={() => setOpen(false)}>
                סגירה
              </button>
            </div>
            <p className="text-sm leading-6 text-[var(--admin-muted)]">
              המאמרים יישמרו כטיוטות. מאמר שכבר קיים נשאר כמו שהוא, ולא מתפרסם שום תוכן.
            </p>
            {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
            {result ? <p className="text-sm font-bold text-emerald-800">{result}</p> : null}
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? [] : available)}
                disabled={!available.length || busy}
              />
              בחירת כל המאמרים הזמינים
            </label>
            <ul className="grid gap-3">
              {drafts.map((row) => (
                <li key={row.slug} className="grid grid-cols-[auto_5.5rem_minmax(0,1fr)] items-center gap-3 border p-3">
                  <input
                    type="checkbox"
                    aria-label={row.title}
                    checked={selected.includes(row.slug)}
                    disabled={row.existing || busy}
                    onChange={() => toggle(row.slug)}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.coverImage} alt="" className="aspect-[16/9] w-full object-cover" />
                  <span>
                    <span className="block font-bold">{row.title}</span>
                    <span className="mt-1 block text-xs text-[var(--admin-muted)]">
                      {row.category} · {formatReadingTime(row.readingMinutes)} · {row.faqCount} שאלות
                      {row.existing ? " · כבר במערכת" : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <AdminButton variant="ghost" onClick={() => setOpen(false)}>
                ביטול
              </AdminButton>
              <AdminButton onClick={confirmImport} disabled={busy || selected.length === 0}>
                אישור ייבוא
              </AdminButton>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
