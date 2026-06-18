"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

export const dynamic = "force-dynamic";

type EmployeeSaleRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  saleTitle: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  eventName: string;
  eventDate: string;
  eventCity: string;
  venueName: string;
  dealAmountBeforeVat: number;
  dealAmountAfterVat: number;
  commissionRate: number;
  commissionAmount: number;
  paymentMode: string;
  paymentProvider: string;
  status: string;
  saleDate: string;
  paidAt: string;
  createdAt: string;
  notes: string;
};

type EmployeeSalesTotals = {
  salesCount: number;
  totalBeforeVat: number;
  totalAfterVat: number;
  totalCommission: number;
  paidSalesCount: number;
  paidBeforeVat: number;
  paidAfterVat: number;
  paidCommission: number;
};

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;

  return new Date(year, month - 1, 1).toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
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

function formatMoney(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
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

function paymentModeLabel(value?: string) {
  switch (String(value || "").toLowerCase()) {
    case "full":
      return "תשלום מלא";
    case "split":
      return "שני תשלומים";
    default:
      return "—";
  }
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || data?.message || "שגיאה בטעינת נתונים");
  }

  return data;
}

function csvSafe(value: unknown) {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csvContent = rows.map((row) => row.map(csvSafe).join(",")).join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: "arrow" | "refresh" | "download" | "sales" | "warning";
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

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
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

  if (name === "download") {
    return (
      <svg {...common}>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    );
  }

  if (name === "sales") {
    return (
      <svg {...common}>
        <path d="M3 3v18h18" />
        <path d="m7 15 4-4 3 3 6-7" />
        <path d="M18 7h2v2" />
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

export default function AdminEmployeeSalesPage() {
  const params = useParams();
  const employeeId = decodeURIComponent(getParamValue(params?.employeeId as any));

  const [month, setMonth] = useState(getCurrentMonthKey());
  const [status, setStatus] = useState("all");
  const [salesRows, setSalesRows] = useState<EmployeeSaleRow[]>([]);
  const [totals, setTotals] = useState<EmployeeSalesTotals>({
    salesCount: 0,
    totalBeforeVat: 0,
    totalAfterVat: 0,
    totalCommission: 0,
    paidSalesCount: 0,
    paidBeforeVat: 0,
    paidAfterVat: 0,
    paidCommission: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const employeeName = useMemo(() => {
    return salesRows[0]?.employeeName || "עובד";
  }, [salesRows]);

  const loadSales = useCallback(async () => {
    if (!employeeId) return;

    try {
      setError("");
      setRefreshing(true);

      const data = await fetchJson(
        `/api/admin/employees/${encodeURIComponent(
          employeeId
        )}/sales?month=${encodeURIComponent(month)}&status=${encodeURIComponent(
          status
        )}`
      );

      const rows = Array.isArray(data.sales) ? data.sales : [];

      setSalesRows(
        rows.map((sale: any) => ({
          id: cleanStr(sale.id),
          employeeId: cleanStr(sale.employeeId),
          employeeName: cleanStr(sale.employeeName),
          employeeEmail: cleanStr(sale.employeeEmail),
          saleTitle: cleanStr(sale.saleTitle) || "מכירה",
          clientName: cleanStr(sale.clientName),
          clientEmail: cleanStr(sale.clientEmail),
          clientPhone: cleanStr(sale.clientPhone),
          eventName: cleanStr(sale.eventName),
          eventDate: cleanStr(sale.eventDate),
          eventCity: cleanStr(sale.eventCity),
          venueName: cleanStr(sale.venueName),
          dealAmountBeforeVat: Number(sale.dealAmountBeforeVat || 0),
          dealAmountAfterVat: Number(sale.dealAmountAfterVat || 0),
          commissionRate: Number(sale.commissionRate || 5),
          commissionAmount: Number(sale.commissionAmount || 0),
          paymentMode: cleanStr(sale.paymentMode),
          paymentProvider: cleanStr(sale.paymentProvider),
          status: cleanStr(sale.status) || "pending",
          saleDate: cleanStr(sale.saleDate),
          paidAt: cleanStr(sale.paidAt),
          createdAt: cleanStr(sale.createdAt),
          notes: cleanStr(sale.notes),
        }))
      );

      const nextTotals = data.totals || {};

      setTotals({
        salesCount: Number(nextTotals.salesCount || 0),
        totalBeforeVat: Number(nextTotals.totalBeforeVat || 0),
        totalAfterVat: Number(nextTotals.totalAfterVat || 0),
        totalCommission: Number(nextTotals.totalCommission || 0),
        paidSalesCount: Number(nextTotals.paidSalesCount || 0),
        paidBeforeVat: Number(nextTotals.paidBeforeVat || 0),
        paidAfterVat: Number(nextTotals.paidAfterVat || 0),
        paidCommission: Number(nextTotals.paidCommission || 0),
      });
    } catch (loadError) {
      console.error("LOAD EMPLOYEE SALES PAGE FAILED:", loadError);
      setError(
        loadError instanceof Error ? loadError.message : "שגיאה בטעינת מכירות"
      );
      setSalesRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employeeId, month, status]);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  function exportSalesCsv() {
    const rows: unknown[][] = [
      ["דוח מכירות עובד"],
      ["עובד", employeeName],
      ["חודש", monthLabel(month)],
      [],
      ["סיכום"],
      ["סה״כ מכירות", totals.salesCount],
      ["סכום לפני מע״מ", totals.totalBeforeVat.toFixed(2)],
      ["סכום אחרי מע״מ", totals.totalAfterVat.toFixed(2)],
      ["סה״כ עמלות 5%", totals.totalCommission.toFixed(2)],
      ["מכירות ששולמו", totals.paidSalesCount],
      ["עמלות לתשלום בפועל", totals.paidCommission.toFixed(2)],
      [],
      [
        "תאריך",
        "איזה מכירה",
        "לקוח",
        "טלפון",
        "מייל",
        "סכום לפני מע״מ",
        "סכום אחרי מע״מ",
        "עמלה 5%",
        "תשלום",
        "סטטוס",
        "הערות",
      ],
      ...salesRows.map((sale) => [
        formatDate(sale.paidAt || sale.saleDate || sale.createdAt),
        sale.saleTitle,
        sale.clientName,
        sale.clientPhone,
        sale.clientEmail,
        sale.dealAmountBeforeVat.toFixed(2),
        sale.dealAmountAfterVat.toFixed(2),
        sale.commissionAmount.toFixed(2),
        paymentModeLabel(sale.paymentMode),
        statusLabel(sale.status),
        sale.notes,
      ]),
    ];

    downloadCsv(`דוח-מכירות-${employeeName}-${month}.csv`, rows);
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 text-slate-950"
    >
      <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-6">
        <section className="rounded-[34px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_60px_rgba(79,70,229,0.10)] backdrop-blur md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link
                href={`/admin/employees/${encodeURIComponent(employeeId)}`}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700 transition hover:bg-indigo-100"
              >
                <Icon name="arrow" className="h-4 w-4" />
                חזרה לתיק עובד
              </Link>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700">
                <Icon name="sales" className="h-4 w-4" />
                עמוד מכירות שלי
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
                מכירות העובד
              </h1>

              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-500 md:text-base">
                כאן רואים את כל המכירות של העובד: תאריך, סוג מכירה, סכום לפני
                מע״מ, סכום אחרי מע״מ, עמלה 5% וסך כל העמלות.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={exportSalesCsv}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-fuchsia-500 to-purple-500 px-5 text-sm font-black text-white shadow-lg shadow-fuchsia-100 transition hover:scale-[1.01]"
              >
                <Icon name="download" className="h-4 w-4" />
                ייצוא מכירות לרו״ח
              </button>

              <button
                type="button"
                onClick={() => void loadSales()}
                disabled={refreshing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
              >
                <Icon
                  name="refresh"
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                רענון
              </button>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[26px] border border-indigo-100 bg-indigo-50 p-5">
              <p className="text-xs font-black text-indigo-600">סה״כ מכירות</p>
              <p className="mt-2 text-3xl font-black text-indigo-950">
                {totals.salesCount}
              </p>
              <p className="mt-1 text-xs font-bold text-indigo-700">
                שולם: {totals.paidSalesCount}
              </p>
            </div>

            <div className="rounded-[26px] border border-sky-100 bg-sky-50 p-5">
              <p className="text-xs font-black text-sky-600">לפני מע״מ</p>
              <p className="mt-2 text-2xl font-black text-sky-950">
                {formatMoney(totals.totalBeforeVat)}
              </p>
              <p className="mt-1 text-xs font-bold text-sky-700">
                שולם: {formatMoney(totals.paidBeforeVat)}
              </p>
            </div>

            <div className="rounded-[26px] border border-violet-100 bg-violet-50 p-5">
              <p className="text-xs font-black text-violet-600">אחרי מע״מ</p>
              <p className="mt-2 text-2xl font-black text-violet-950">
                {formatMoney(totals.totalAfterVat)}
              </p>
              <p className="mt-1 text-xs font-bold text-violet-700">
                שולם: {formatMoney(totals.paidAfterVat)}
              </p>
            </div>

            <div className="rounded-[26px] border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-xs font-black text-emerald-600">
                סך הכול עמלות
              </p>
              <p className="mt-2 text-2xl font-black text-emerald-950">
                {formatMoney(totals.totalCommission)}
              </p>
              <p className="mt-1 text-xs font-bold text-emerald-700">
                לתשלום: {formatMoney(totals.paidCommission)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-white/80 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="grid gap-3 xl:grid-cols-[220px_220px_auto]">
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="paid">שולם</option>
              <option value="pending">ממתין לתשלום</option>
              <option value="cancelled">בוטל</option>
              <option value="refunded">זוכה</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setMonth(getCurrentMonthKey());
                setStatus("all");
              }}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50"
            >
              ניקוי
            </button>
          </div>
        </section>

        {loading ? (
          <section className="rounded-[34px] border border-white/80 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-500" />
            <p className="mt-4 text-sm font-black text-slate-600">
              טוען מכירות...
            </p>
          </section>
        ) : error ? (
          <section className="rounded-[34px] border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
            <Icon name="warning" className="mx-auto h-10 w-10 text-rose-600" />
            <h2 className="mt-4 text-xl font-black text-rose-700">
              לא הצלחנו לטעון מכירות
            </h2>
            <p className="mt-2 text-sm font-bold text-rose-600">{error}</p>
          </section>
        ) : salesRows.length === 0 ? (
          <section className="rounded-[34px] border border-dashed border-indigo-200 bg-white/90 p-10 text-center shadow-sm">
            <Icon name="sales" className="mx-auto h-12 w-12 text-indigo-300" />
            <h2 className="mt-4 text-xl font-black text-slate-800">
              אין מכירות להצגה
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              לא נמצאו מכירות לעובד בחודש/סטטוס הזה.
            </p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[34px] border border-white/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            <table className="w-full border-collapse text-right">
              <thead className="bg-slate-50/80">
                <tr className="text-sm text-slate-500">
                  <th className="px-5 py-4 font-black">תאריך</th>
                  <th className="px-5 py-4 font-black">איזה מכירה</th>
                  <th className="px-5 py-4 font-black">לקוח</th>
                  <th className="px-5 py-4 font-black">סכום לפני מע״מ</th>
                  <th className="px-5 py-4 font-black">סכום אחרי מע״מ</th>
                  <th className="px-5 py-4 font-black">עמלה 5%</th>
                  <th className="px-5 py-4 font-black">תשלום</th>
                  <th className="px-5 py-4 font-black">סטטוס</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {salesRows.map((sale) => (
                  <tr key={sale.id} className="transition hover:bg-indigo-50/40">
                    <td className="px-5 py-4 text-sm font-black text-slate-700">
                      {formatDate(sale.paidAt || sale.saleDate || sale.createdAt)}
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-black text-slate-900">
                        {sale.saleTitle || "מכירה"}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {sale.eventName || sale.venueName || ""}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-black text-slate-800">
                        {sale.clientName || "—"}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {sale.clientPhone || sale.clientEmail || ""}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm font-black text-slate-700">
                      {formatMoney(sale.dealAmountBeforeVat)}
                    </td>

                    <td className="px-5 py-4 text-sm font-black text-slate-700">
                      {formatMoney(sale.dealAmountAfterVat)}
                    </td>

                    <td className="px-5 py-4 text-sm font-black text-emerald-700">
                      {formatMoney(sale.commissionAmount)}
                    </td>

                    <td className="px-5 py-4 text-sm font-bold text-slate-600">
                      {paymentModeLabel(sale.paymentMode)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                          sale.status
                        )}`}
                      >
                        {statusLabel(sale.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}
