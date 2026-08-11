"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Phone, RefreshCw, Search, UsersRound } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  eventCount: number;
  sources: string[];
  notes: string;
  lastActivity: string;
  lastActivityAt: string | null;
  leadId?: string | null;
  linkedEventId?: string | null;
  crmHref?: string | null;
  eventHref?: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("he-IL");
  } catch {
    return value;
  }
}

export default function VenueCustomersPage() {
  const params = useParams<{ hallId: string }>();
  const hallId = params?.hallId || "";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/customers`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "טעינה נכשלה");
      }
      setCustomers(data.customers || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "טעינה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hallId) load();
  }, [hallId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [customers, search]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-7">
      <header className="mb-5 rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black text-[#9b8a73]">ניהול אולם › לקוחות</div>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black">
              <UsersRound className="text-[#b98121]" />
              לקוחות
            </h1>
            <p className="mt-2 text-sm font-bold text-[#7f705d]">
              אגרגציה מלידים ואירועים — כל הלקוחות של האולם במקום אחד.
            </p>
            <p className="mt-2 text-xs font-bold text-[#9b8a73]">
              טיפ: לקוחות נוצרים אוטומטית מלידים ואירועים — אין צורך להזין אותם ידנית.
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

      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 py-2">
        <Search size={18} className="text-[#9b8a73]" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם, טלפון או אימייל..."
          className="flex-1 bg-transparent text-sm font-bold outline-none"
        />
      </div>

      <div className="rounded-[28px] border border-[#eadfce] bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-bold text-[#8a7b68]">
            <Loader2 size={20} className="animate-spin text-[#b98121]" />
            טוען לקוחות...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <UsersRound size={40} className="mx-auto text-[#d5b36d]" />
            <p className="mt-3 text-sm font-black text-[#2b241c]">אין לקוחות עדיין</p>
            <p className="mt-1 text-xs font-bold text-[#8a7b68]">
              לקוחות יופיעו כאן אחרי הוספת לידים או אירועים.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-right text-sm">
              <thead>
                <tr className="border-b border-[#eadfce] bg-[#fffdf8] text-xs font-black text-[#8a7b68]">
                  <th className="px-4 py-3">שם</th>
                  <th className="px-4 py-3">טלפון</th>
                  <th className="px-4 py-3">אימייל</th>
                  <th className="px-4 py-3">סטטוס</th>
                  <th className="px-4 py-3">אירועים</th>
                  <th className="px-4 py-3">מקור</th>
                  <th className="px-4 py-3">פעילות אחרונה</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-[#f4ead9] transition hover:bg-[#fffdf8]"
                  >
                    <td className="px-4 py-3 font-black text-[#2b241c]">
                      {customer.eventHref || customer.crmHref ? (
                        <Link
                          href={customer.eventHref || customer.crmHref || "#"}
                          className="text-[#b98121] underline-offset-2 hover:underline"
                        >
                          {customer.name}
                        </Link>
                      ) : (
                        customer.name
                      )}
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-bold">
                        {customer.crmHref ? (
                          <Link
                            href={customer.crmHref}
                            className="text-[#8a7b68] hover:text-[#b98121]"
                          >
                            CRM
                          </Link>
                        ) : null}
                        {customer.eventHref ? (
                          <Link
                            href={customer.eventHref}
                            className="text-[#8a7b68] hover:text-[#b98121]"
                          >
                            אירוע
                          </Link>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#6f6252]">
                      {customer.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={14} />
                          {customer.phone}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#6f6252]">
                      {customer.email || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[#f4ead9] px-2.5 py-1 text-xs font-black text-[#b98121]">
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-black">{customer.eventCount}</td>
                    <td className="px-4 py-3 text-xs font-bold text-[#8a7b68]">
                      {customer.sources.join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-[#2b241c]">
                        {customer.lastActivity}
                      </div>
                      <div className="text-[11px] font-bold text-[#9b8a73]">
                        {formatDate(customer.lastActivityAt)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
