"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OpenRow = {
  clientId: string;
  clientName: string;
  producerId: string;
  producerName: string;
  eventName: string;
  eventDate?: string | null;
  balance: number;
  amountDue: number;
  note?: string;
  snoozeUntil?: string | null;
};

function money(value: number) {
  const amount = Math.round((Number(value) || 0) * 100) / 100;
  const [whole, fraction] = Math.abs(amount).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const text = fraction === "00" ? grouped : `${grouped}.${fraction}`;
  return `${text} ₪`;
}

function formatDate(value?: string | null) {
  if (!value) return "טרם נקבע";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "טרם נקבע";
  return date.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" });
}

export default function OpenCollectionPage() {
  const [rows, setRows] = useState<OpenRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/producers/collection", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data?.success) {
          setError("טעינת החובות הפתוחים נכשלה");
          return;
        }
        setRows(data.rows || []);
        setTotal(Number(data.total || 0));
      } catch {
        if (!cancelled) setError("טעינת החובות הפתוחים נכשלה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div dir="rtl" className="mx-auto w-full max-w-5xl px-4 py-6 text-right">
      <Link href="/admin/users" className="text-sm font-bold text-[var(--admin-brand)]">
        חזרה למשתמשים
      </Link>
      <h1 className="mt-2 text-3xl font-black text-[var(--admin-text)]">יתרות פתוחות</h1>
      <p className="mt-1 text-sm text-[var(--admin-muted)]">
        {loading ? "טוען…" : `${rows.length} אירועים · ${money(total)}`}
      </p>
      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>
      )}
      <div className="mt-6 grid gap-3">
        {rows.map((row) => (
          <Link
            key={row.clientId}
            href={`/admin/users/producers/${row.producerId}/billing?client=${encodeURIComponent(row.clientId)}`}
            className="block rounded-2xl border border-[var(--admin-border)] bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-lg font-black">{row.eventName}</div>
                <div className="mt-1 text-sm text-[var(--admin-muted)]">
                  {row.clientName} · {row.producerName} · {formatDate(row.eventDate)}
                </div>
                {row.note ? (
                  <p className="mt-2 text-sm font-semibold text-[var(--admin-text)]">{row.note}</p>
                ) : null}
              </div>
              <div className="text-xl font-black text-[var(--admin-brand)]">{money(row.balance)}</div>
            </div>
          </Link>
        ))}
        {!loading && rows.length === 0 && !error && (
          <p className="rounded-2xl border border-[var(--admin-border)] bg-white px-4 py-8 text-center text-sm text-[var(--admin-muted)]">
            אין אירועים עם יתרה פתוחה
          </p>
        )}
      </div>
    </div>
  );
}
