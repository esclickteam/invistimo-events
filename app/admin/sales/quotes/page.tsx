"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

type QuoteRow = {
  _id: string;
  token: string;
  quoteNumber?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  eventName?: string;
  packageTitle?: string;
  status?: string;
  total?: number;
  convertedUserId?: string | null;
  createdAt?: string | null;
  expiresAt?: string | null;
};

function formatMoney(value?: number) {
  return `₪${Number(value || 0).toLocaleString("he-IL")}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("he-IL");
}

function statusLabel(status?: string) {
  const map: Record<string, string> = {
    draft: "טיוטה",
    sent: "נשלחה",
    viewed: "נצפתה",
    accepted: "אושרה",
    converted: "הומרה למשתמש",
    expired: "פגה",
  };
  return map[String(status || "").toLowerCase()] || status || "—";
}

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/sales/quotes?limit=150", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "טעינת הצעות נכשלה");
      }
      setQuotes(Array.isArray(data.quotes) ? data.quotes : []);
    } catch (err: any) {
      setError(err?.message || "טעינת הצעות נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createUserFromQuote(token: string) {
    const confirmed = confirm(
      "לפתוח משתמש מההצעה? הפרטים, החבילה, השירותים והמחירים יועברו אוטומטית. לא יבוצע חיוב אוטומטי."
    );
    if (!confirmed) return;

    try {
      setCreatingFor(token);
      const res = await fetch(
        `/api/employee/sales/documents/${encodeURIComponent(token)}/create-user`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        alert(data?.message || data?.error || "יצירת משתמש נכשלה");
        return;
      }
      alert(data.message || "המשתמש נוצר בהצלחה");
      window.location.href = data.redirectTo || "/admin/users";
    } catch {
      alert("יצירת משתמש נכשלה");
    } finally {
      setCreatingFor(null);
    }
  }

  return (
    <div dir="rtl" className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#352618] md:text-4xl">
            הצעות מחיר
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-[#7B6754]">
            לכל הצעה יש עריכה ופתיחת משתמש מההצעה — בלי למלא הכול פעמיים.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#E7D8C6] bg-white px-4 text-sm font-black text-[#3A2A1C]"
          >
            <RefreshCw size={16} />
            רענון
          </button>
          <Link
            href="/admin/sales/new"
            className="inline-flex h-11 items-center rounded-2xl bg-[#24190F] px-5 text-sm font-black text-white"
          >
            הצעה חדשה
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-[#6B5A48]">
          <Loader2 className="ml-2 animate-spin" size={22} />
          טוען הצעות…
        </div>
      ) : quotes.length === 0 ? (
        <div className="rounded-[28px] border border-[#E7D8C6] bg-white p-8 text-center text-sm font-bold text-[#7B6754]">
          אין הצעות מחיר עדיין.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-[#E7D8C6] bg-white shadow-[0_14px_40px_rgba(60,43,25,0.06)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-right">
              <thead className="bg-[#FFF9EF] text-xs font-black text-[#7B6754]">
                <tr>
                  <th className="p-4">מספר</th>
                  <th className="p-4">לקוח</th>
                  <th className="p-4">אירוע</th>
                  <th className="p-4">חבילה</th>
                  <th className="p-4">סכום</th>
                  <th className="p-4">סטטוס</th>
                  <th className="p-4">נוצר</th>
                  <th className="p-4">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE2D1]">
                {quotes.map((quote) => (
                  <tr key={quote._id} className="text-sm hover:bg-[#FFFDF8]">
                    <td className="p-4 font-black text-[#3A2A1C]">
                      {quote.quoteNumber || quote._id.slice(-6)}
                    </td>
                    <td className="p-4">
                      <div className="font-black text-[#3A2A1C]">
                        {quote.fullName || "—"}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-[#7B6754]">
                        {quote.email || quote.phone || ""}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-[#5B4638]">
                      {quote.eventName || "—"}
                    </td>
                    <td className="p-4 font-bold text-[#5B4638]">
                      {quote.packageTitle || "—"}
                    </td>
                    <td className="p-4 font-black text-[#B87920]">
                      {formatMoney(quote.total)}
                    </td>
                    <td className="p-4 font-bold text-[#5B4638]">
                      {statusLabel(quote.status)}
                    </td>
                    <td className="p-4 font-bold text-[#5B4638]">
                      {formatDate(quote.createdAt)}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {quote.token ? (
                          <>
                            <Link
                              href={`/sales-documents/${encodeURIComponent(quote.token)}?preview=1`}
                              target="_blank"
                              className="rounded-xl border border-[#D9C3A8] bg-white px-3 py-2 text-xs font-black text-[#3A271D] hover:bg-[#FFF7EC]"
                            >
                              צפייה
                            </Link>
                            <Link
                              href={`/admin/sales/quotes/${encodeURIComponent(quote.token)}/edit`}
                              className="rounded-xl border border-[#D9C3A8] bg-white px-3 py-2 text-xs font-black text-[#3A271D] hover:bg-[#FFF7EC]"
                            >
                              עריכת הצעה
                            </Link>
                            {quote.convertedUserId ? (
                              <Link
                                href={`/admin/users?q=${encodeURIComponent(quote.convertedUserId)}`}
                                className="rounded-xl bg-[#24190F] px-3 py-2 text-xs font-black text-white"
                              >
                                מעבר למשתמש
                              </Link>
                            ) : (
                              <button
                                type="button"
                                disabled={creatingFor === quote.token}
                                onClick={() =>
                                  createUserFromQuote(quote.token)
                                }
                                className="rounded-xl bg-[#B87920] px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                              >
                                {creatingFor === quote.token
                                  ? "יוצר..."
                                  : "פתיחת משתמש מההצעה"}
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs font-black text-[#B9A28A]">
                            אין קישור
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
