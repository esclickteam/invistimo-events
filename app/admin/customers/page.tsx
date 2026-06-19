"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type CustomerFile = {
  _id: string;
  userId?: string;
  invitationId?: string;

  fullName?: string;
  email?: string;
  phone?: string;

  eventDate?: string | Date;
  venueName?: string;
  city?: string;

  packageName?: string;
  packageBasePrice?: number;
  packageTargetPriceWithCalls?: number;

  hasCallRounds?: boolean;
  allowedCallRounds?: number;

  totalPrice?: number;
  paidAmount?: number;
  balance?: number;

  status?: string;
  notes?: string;

  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type CustomersResponse = {
  success?: boolean;
  customers?: CustomerFile[];
  error?: string;
};

function formatDate(value?: string | Date) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatMoney(value?: number) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "lead":
      return "ליד";
    case "quote_sent":
      return "נשלחה הצעה";
    case "paid":
      return "שולם";
    case "active":
      return "פעיל";
    case "completed":
      return "הסתיים";
    case "cancelled":
      return "בוטל";
    default:
      return "לא הוגדר";
  }
}

function getStatusClass(status?: string) {
  switch (status) {
    case "active":
    case "paid":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "quote_sent":
      return "bg-blue-50 text-blue-700 ring-blue-100";
    case "lead":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    case "completed":
      return "bg-slate-50 text-slate-700 ring-slate-100";
    case "cancelled":
      return "bg-red-50 text-red-700 ring-red-100";
    default:
      return "bg-stone-50 text-stone-700 ring-stone-100";
  }
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerFile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("q", search.trim());
      }

      const url = params.toString()
        ? `/api/admin/customers?${params.toString()}`
        : "/api/admin/customers";

      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      const data = (await res.json()) as CustomersResponse;

      if (!res.ok || !data.success) {
        throw new Error(data.error || "שגיאה בטעינת לקוחות");
      }

      setCustomers(Array.isArray(data.customers) ? data.customers : []);
    } catch (err) {
      console.error("LOAD CUSTOMERS ERROR:", err);
      setError(err instanceof Error ? err.message : "שגיאה בטעינת לקוחות");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCustomers();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((customer) => customer.status === "active").length;
    const paid = customers.filter((customer) => customer.status === "paid").length;
    const withCalls = customers.filter((customer) => customer.hasCallRounds).length;

    const totalRevenue = customers.reduce((sum, customer) => {
      return sum + Number(customer.totalPrice || 0);
    }, 0);

    return {
      total,
      active,
      paid,
      withCalls,
      totalRevenue,
    };
  }, [customers]);

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#F7F1EA] px-4 py-6 text-[#3A271D] sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-[#E8D8C4] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black text-[#B87920]">ניהול לקוחות</p>

              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                לקוחות ותיקי לקוח
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#8A6A43]">
                כאן רואים את כל הלקוחות, פרטי קשר, חבילה, סטטוס, סבבי שיחות
                וכניסה מלאה לתיק הלקוח.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="חיפוש לפי שם, מייל או טלפון..."
                className="h-12 w-full rounded-2xl border border-[#E8D8C4] bg-[#FFFCF7] px-4 text-sm font-bold outline-none transition placeholder:text-[#B9A28A] focus:border-[#C58B2B] sm:w-80"
              />

              <button
                type="button"
                onClick={loadCustomers}
                className="h-12 rounded-2xl bg-[#3A271D] px-5 text-sm font-black text-white transition hover:bg-[#24170f]"
              >
                רענון
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[1.5rem] border border-[#E8D8C4] bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-[#8A6A43]">סה״כ לקוחות</p>
            <p className="mt-3 text-3xl font-black">{stats.total}</p>
          </div>

          <div className="rounded-[1.5rem] border border-[#E8D8C4] bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-[#8A6A43]">לקוחות פעילים</p>
            <p className="mt-3 text-3xl font-black text-emerald-700">
              {stats.active}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[#E8D8C4] bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-[#8A6A43]">לקוחות ששילמו</p>
            <p className="mt-3 text-3xl font-black text-blue-700">
              {stats.paid}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[#E8D8C4] bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-[#8A6A43]">עם סבבי שיחות</p>
            <p className="mt-3 text-3xl font-black text-orange-700">
              {stats.withCalls}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[#E8D8C4] bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-[#8A6A43]">שווי עסקאות</p>
            <p className="mt-3 text-3xl font-black text-[#B87920]">
              {formatMoney(stats.totalRevenue)}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-[#E8D8C4] bg-white shadow-sm">
          <div className="border-b border-[#EFE3D4] px-5 py-5 sm:px-6">
            <h2 className="text-xl font-black">כל הלקוחות</h2>
            <p className="mt-1 text-sm font-semibold text-[#8A6A43]">
              כל לקוח בשורה אחת, עם כניסה לתיק לקוח ולדשבורד הלקוח.
            </p>
          </div>

          {error ? (
            <div className="m-5 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-black text-red-700 sm:m-6">
              {error}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] border-collapse text-right">
              <thead>
                <tr className="border-b border-[#EFE3D4] bg-[#FFFBF5] text-xs font-black text-[#8A6A43]">
                  <th className="px-5 py-4">לקוח</th>
                  <th className="px-5 py-4">מייל</th>
                  <th className="px-5 py-4">טלפון</th>
                  <th className="px-5 py-4">תאריך אירוע</th>
                  <th className="px-5 py-4">חבילה</th>
                  <th className="px-5 py-4">סכום</th>
                  <th className="px-5 py-4">יתרה</th>
                  <th className="px-5 py-4">סטטוס</th>
                  <th className="px-5 py-4">סבבי שיחות</th>
                  <th className="px-5 py-4">פעולות</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-5 py-12 text-center text-sm font-black text-[#8A6A43]"
                    >
                      טוען לקוחות...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-5 py-12 text-center text-sm font-black text-[#8A6A43]"
                    >
                      לא נמצאו לקוחות.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => {
                    const customerId = String(customer._id);
                    const userId = String(customer.userId || "");

                    return (
                      <tr
                        key={customerId}
                        className="border-b border-[#F1E7DA] text-sm transition hover:bg-[#FFFCF7]"
                      >
                        <td className="px-5 py-4">
                          <div className="font-black text-[#3A271D]">
                            {customer.fullName || "לקוח ללא שם"}
                          </div>

                          <div className="mt-1 text-xs font-bold text-[#9A7A55]">
                            תיק לקוח: {customerId.slice(-6)}
                          </div>
                        </td>

                        <td className="px-5 py-4 font-bold text-[#5B4638]">
                          {customer.email || "-"}
                        </td>

                        <td className="px-5 py-4 font-bold text-[#5B4638]">
                          {customer.phone || "-"}
                        </td>

                        <td className="px-5 py-4 font-bold text-[#5B4638]">
                          {formatDate(customer.eventDate)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-black text-[#3A271D]">
                            {customer.packageName || "-"}
                          </div>

                          {customer.venueName || customer.city ? (
                            <div className="mt-1 text-xs font-bold text-[#9A7A55]">
                              {[customer.venueName, customer.city]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          ) : null}
                        </td>

                        <td className="px-5 py-4 font-black text-[#B87920]">
                          {formatMoney(customer.totalPrice)}
                        </td>

                        <td className="px-5 py-4 font-black text-[#5B4638]">
                          {formatMoney(customer.balance)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${getStatusClass(
                              customer.status
                            )}`}
                          >
                            {getStatusLabel(customer.status)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {customer.hasCallRounds ? (
                            <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700 ring-1 ring-orange-100">
                              פעיל · {customer.allowedCallRounds || 3} סבבים
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-stone-50 px-3 py-1 text-xs font-black text-stone-600 ring-1 ring-stone-100">
                              לא פעיל
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/admin/customers/${customerId}`}
                              className="rounded-xl bg-[#3A271D] px-4 py-2 text-xs font-black text-white transition hover:bg-[#24170f]"
                            >
                              תיק לקוח
                            </Link>

                            {userId ? (
                              <Link
                                href={`/admin/users?impersonate=${userId}`}
                                className="rounded-xl border border-[#D9C3A8] bg-white px-4 py-2 text-xs font-black text-[#3A271D] transition hover:bg-[#FFF7EC]"
                              >
                                כניסה ללקוח
                              </Link>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="cursor-not-allowed rounded-xl border border-[#E8D8C4] bg-[#F7F1EA] px-4 py-2 text-xs font-black text-[#B9A28A]"
                              >
                                אין משתמש
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}