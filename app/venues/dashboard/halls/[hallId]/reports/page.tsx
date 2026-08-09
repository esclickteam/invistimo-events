"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, PieChart, RefreshCw, TrendingUp } from "lucide-react";

type ReportsData = {
  leadsByPeriod: { period: string; count: number }[];
  conversionRate: number;
  totalLeads: number;
  convertedLeads: number;
  eventsByStatus: { status: string; count: number }[];
  upcomingCount: number;
  completedCount: number;
  totalEvents: number;
  periodFrom: string;
  periodMonths: number;
};

export default function VenueReportsPage() {
  const params = useParams<{ hallId: string }>();
  const hallId = params?.hallId || "";

  const [reports, setReports] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/reports?months=6`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "טעינה נכשלה");
      }
      setReports(data.reports);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "טעינה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hallId) load();
  }, [hallId]);

  const maxLeads = Math.max(
    ...(reports?.leadsByPeriod?.map((p) => p.count) || [1]),
    1
  );

  const maxStatusCount = Math.max(
    ...(reports?.eventsByStatus?.map((p) => p.count) || [1]),
    1
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-7">
      <header className="mb-5 rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black text-[#9b8a73]">ניהול אולם › דוחות</div>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black">
              <PieChart className="text-[#b98121]" />
              דוחות
            </h1>
            <p className="mt-2 text-sm font-bold text-[#7f705d]">
              לידים, המרות ואירועים — מסוננים לאולם זה.
            </p>
            <p className="mt-2 text-xs font-bold text-[#9b8a73]">
              טיפ: עקבי אחרי שיעור ההמרה מדי חודש כדי לזהות מגמות ב-CRM.
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

      {loading && !reports ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-bold text-[#8a7b68]">
          <Loader2 size={20} className="animate-spin text-[#b98121]" />
          טוען דוחות...
        </div>
      ) : reports ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#2b241c]">לידים לפי תקופה</h2>
            <p className="mt-1 text-xs font-bold text-[#8a7b68]">
              {reports.periodMonths} חודשים אחרונים
            </p>
            {reports.leadsByPeriod.length === 0 ? (
              <p className="mt-6 text-sm font-bold text-[#8a7b68]">אין לידים בתקופה.</p>
            ) : (
              <div className="mt-6 flex h-48 items-end gap-3">
                {reports.leadsByPeriod.map((item) => (
                  <div
                    key={item.period}
                    className="flex flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-[#9f6f1a] to-[#f7e8bd]"
                      style={{
                        height: `${Math.max(8, (item.count / maxLeads) * 100)}%`,
                        minHeight: 8,
                      }}
                    />
                    <span className="text-[10px] font-black text-[#8a7b68]">
                      {item.period}
                    </span>
                    <span className="text-xs font-black">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#2b241c]">שיעור המרה</h2>
            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-700">
                <TrendingUp size={32} />
              </div>
              <div className="flex-1">
                <div className="text-4xl font-black text-[#2b241c]">
                  {reports.conversionRate}%
                </div>
                <div className="text-sm font-bold text-[#8a7b68]">
                  {reports.convertedLeads} מתוך {reports.totalLeads} לידים
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#eee6d9]">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-emerald-600 to-emerald-400"
                    style={{ width: `${Math.min(100, reports.conversionRate)}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#2b241c]">אירועים לפי סטטוס</h2>
            <div className="mt-4 space-y-3">
              {reports.eventsByStatus.length === 0 ? (
                <p className="text-sm font-bold text-[#8a7b68]">אין אירועים.</p>
              ) : (
                reports.eventsByStatus.map((item) => {
                  const pct = Math.round((item.count / maxStatusCount) * 100);
                  return (
                    <div key={item.status}>
                      <div className="mb-1 flex items-center justify-between text-sm font-black text-[#2b241c]">
                        <span>{item.status}</span>
                        <span className="rounded-full bg-[#f4ead9] px-3 py-1 text-xs text-[#b98121]">
                          {item.count}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[#eee6d9]">
                        <div
                          className="h-full rounded-full bg-gradient-to-l from-[#9f6f1a] to-[#f7e8bd]"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#2b241c]">סיכום אירועים</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <StatBox label="סה״כ" value={reports.totalEvents} />
              <StatBox label="עתידיים" value={reports.upcomingCount} tone="amber" />
              <StatBox label="הושלמו" value={reports.completedCount} tone="green" />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "amber" | "green";
}) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4 text-center">
      <div className="text-xs font-black text-[#8a7b68]">{label}</div>
      <div
        className={[
          "mt-2 text-2xl font-black",
          tone === "amber" ? "text-amber-700" : tone === "green" ? "text-emerald-700" : "text-[#2b241c]",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}
