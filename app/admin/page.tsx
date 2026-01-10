"use client";

import { useEffect, useState } from "react";

/* =====================================================
   TYPES
===================================================== */
interface AdminStats {
  users: number;
  invitations: number;
  calls: number;
  revenue: number; // 💰 סה"כ הכנסות
}

/* =====================================================
   PAGE
===================================================== */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch admin stats");
        }

        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("❌ Failed to load admin stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-semibold">
          סקירת מערכת
        </h1>
        <p className="text-sm md:text-base text-gray-500">
          נתונים כלליים על פעילות המערכת
        </p>
      </div>

      {/* ===== Stats Grid ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <AdminBox
          title="משתמשים"
          value={loading ? "—" : String(stats?.users ?? 0)}
        />

        <AdminBox
          title="אירועים פעילים"
          value={loading ? "—" : String(stats?.invitations ?? 0)}
        />

        <AdminBox
          title="שירותי שיחות פעילים"
          value={loading ? "—" : String(stats?.calls ?? 0)}
        />

        {/* 💰 סה"כ הכנסות */}
        <AdminBox
          title="סה״כ הכנסות"
          value={
            loading
              ? "—"
              : `${Number(stats?.revenue ?? 0).toLocaleString()} ₪`
          }
          highlight
        />
      </div>
    </div>
  );
}

/* =====================================================
   COMPONENT
===================================================== */
function AdminBox({
  title,
  value,
  highlight = false,
}: {
  title: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`
        rounded-xl border bg-white p-5 md:p-6
        shadow-sm transition
        hover:shadow-md
        ${highlight ? "border-amber-300 bg-amber-50" : ""}
      `}
    >
      <div className="text-sm md:text-base text-gray-500 mb-2">
        {title}
      </div>

      <div
        className={`
          text-2xl md:text-3xl font-bold
          ${highlight ? "text-amber-700" : "text-gray-900"}
        `}
      >
        {value}
      </div>
    </div>
  );
}
