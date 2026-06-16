"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type EmployeeSale = {
  id?: string;
  _id?: string;

  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;

  eventName?: string;
  eventDate?: string | null;

  packageName?: string;
  plan?: string;
  guests?: number;

  grossAmount?: number;
  vatRate?: number;
  netAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;

  status?: "pending" | "paid" | "cancelled" | "refunded" | string;
  notes?: string;

  createdAt?: string | null;
};

type SalesSummary = {
  totalSales: number;
  paidSales: number;
  pendingSales: number;
  grossTotal: number;
  netTotal: number;
  commissionTotal: number;
  vatRate: number;
  commissionRate: number;
};

type SalesResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  summary?: Partial<SalesSummary>;
  sales?: EmployeeSale[];
};

const EMPTY_SUMMARY: SalesSummary = {
  totalSales: 0,
  paidSales: 0,
  pendingSales: 0,
  grossTotal: 0,
  netTotal: 0,
  commissionTotal: 0,
  vatRate: 0.18,
  commissionRate: 0.05,
};

function asNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  const amount = asNumber(value);

  return amount.toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function statusLabel(status?: string) {
  switch (String(status || "").toLowerCase()) {
    case "paid":
      return "שולם";
    case "pending":
      return "ממתין לתשלום";
    case "cancelled":
      return "בוטל";
    case "refunded":
      return "זוכה";
    default:
      return status || "—";
  }
}

function statusClass(status?: string) {
  switch (String(status || "").toLowerCase()) {
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "cancelled":
    case "refunded":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: "arrow" | "plus" | "refresh" | "sales" | "user" | "money";
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

  if (name === "plus") {
    return (
      <svg {...common}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
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

  if (name === "sales" || name === "money") {
    return (
      <svg {...common}>
        <path d="M3 6h18" />
        <path d="M7 6V4h10v2" />
        <rect x="5" y="6" width="14" height="14" rx="3" />
        <path d="M9 13h6" />
        <path d="M12 10v6" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-black text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs font-bold text-slate-400">{subtitle}</p>
    </div>
  );
}

export default function EmployeeSalesPage() {
  const router = useRouter();

  const [sales, setSales] = useState<EmployeeSale[]>([]);
  const [summary, setSummary] = useState<SalesSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadSales = useCallback(async () => {
    try {
      setError("");
      setRefreshing(true);

      const response = await fetch("/api/employee/sales", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as
        | SalesResponse
        | null;

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message || data?.error || "שגיאה בטעינת המכירות",
        );
      }

      setSales(Array.isArray(data?.sales) ? data.sales : []);
      setSummary({
        ...EMPTY_SUMMARY,
        ...(data?.summary || {}),
      });
    } catch (loadError) {
      console.error("LOAD EMPLOYEE SALES FAILED:", loadError);
      setSales([]);
      setSummary(EMPTY_SUMMARY);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "שגיאה בטעינת המכירות",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  const sortedSales = useMemo(() => {
    return [...sales].sort((a, b) => {
      const dateA = new Date(String(a.createdAt || "")).getTime();
      const dateB = new Date(String(b.createdAt || "")).getTime();

      return (Number.isFinite(dateB) ? dateB : 0) - (Number.isFinite(dateA) ? dateA : 0);
    });
  }, [sales]);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] text-slate-950"
    >
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-orange-100 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-emerald-100 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <button
                type="button"
                onClick={() => router.push("/employee/dashboard")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                <Icon name="arrow" className="h-4 w-4" />
                חזרה לדשבורד
              </button>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-black text-orange-700">
                <Icon name="sales" className="h-4 w-4" />
                אזור מכירות עובד
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                המכירות שלי
              </h1>

              <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-600">
                כאן יופיעו כל העסקאות שביצעת. העמלה מחושבת אוטומטית לפי 5%
                מהסכום לפני מע״מ.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadSales()}
                disabled={refreshing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon
                  name="refresh"
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                רענון
              </button>

              <button
                type="button"
                onClick={() => router.push("/employee/sales/new")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-sm transition hover:bg-orange-600"
              >
                <Icon name="plus" className="h-4 w-4" />
                יצירת לקוח חדש
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="כמות מכירות"
            value={loading ? "..." : summary.totalSales}
            subtitle={`שולמו: ${summary.paidSales} · ממתינות: ${summary.pendingSales}`}
          />

          <StatCard
            title="סה״כ עסקאות כולל מע״מ"
            value={loading ? "..." : money(summary.grossTotal)}
            subtitle="הסכום שהלקוח שילם"
          />

          <StatCard
            title="סה״כ לפני מע״מ"
            value={loading ? "..." : money(summary.netTotal)}
            subtitle={`מע״מ מחושב לפי ${Math.round(summary.vatRate * 100)}%`}
          />

          <StatCard
            title="עמלה צפויה"
            value={loading ? "..." : money(summary.commissionTotal)}
            subtitle={`עמלה ${Math.round(summary.commissionRate * 100)}% לפני מע״מ`}
          />
        </section>

        {error && (
          <div className="mt-6 rounded-[28px] border border-rose-200 bg-rose-50 p-5 text-sm font-black text-rose-700">
            {error}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <h2 className="text-2xl font-black text-slate-950">
              רשימת המכירות
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              כל המכירות שנקלטו דרך יצירת לקוח חדש אצל העובד.
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
              <p className="mt-4 text-sm font-black text-slate-700">
                טוען מכירות...
              </p>
            </div>
          ) : sortedSales.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-600">
                <Icon name="sales" className="h-6 w-6" />
              </div>
              <p className="mt-4 text-lg font-black text-slate-800">
                אין עדיין מכירות
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                לחצי על יצירת לקוח חדש כדי לבצע עסקה ראשונה.
              </p>
              <button
                type="button"
                onClick={() => router.push("/employee/sales/new")}
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white transition hover:bg-orange-600"
              >
                <Icon name="plus" className="h-4 w-4" />
                יצירת לקוח חדש
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-right">
                <thead>
                  <tr className="bg-slate-50 text-xs font-black text-slate-500">
                    <th className="px-5 py-4">לקוח</th>
                    <th className="px-5 py-4">טלפון</th>
                    <th className="px-5 py-4">אירוע</th>
                    <th className="px-5 py-4">חבילה</th>
                    <th className="px-5 py-4">כולל מע״מ</th>
                    <th className="px-5 py-4">לפני מע״מ</th>
                    <th className="px-5 py-4">עמלה</th>
                    <th className="px-5 py-4">סטטוס</th>
                    <th className="px-5 py-4">נוצר</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedSales.map((sale) => (
                    <tr
                      key={sale.id || sale._id}
                      className="border-t border-slate-100 text-sm font-bold text-slate-700"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-black text-slate-950">
                            {sale.clientName || "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {sale.clientEmail || "—"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4" dir="ltr">
                        {sale.clientPhone || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <p>{sale.eventName || "—"}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(sale.eventDate)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p>{sale.packageName || sale.plan || "—"}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {asNumber(sale.guests)} מוזמנים
                        </p>
                      </td>

                      <td className="px-5 py-4 font-black text-slate-950">
                        {money(sale.grossAmount)}
                      </td>

                      <td className="px-5 py-4">
                        {money(sale.netAmount)}
                      </td>

                      <td className="px-5 py-4 font-black text-emerald-700">
                        {money(sale.commissionAmount)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                            sale.status,
                          )}`}
                        >
                          {statusLabel(sale.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {formatDate(sale.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}