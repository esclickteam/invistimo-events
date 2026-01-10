"use client";

import { useEffect, useState } from "react";

/* =====================================================
   TYPES
===================================================== */
interface AdminStats {
  users: number;
  invitations: number;
  calls: number;
  revenue: number;
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

        if (!res.ok) throw new Error("Failed to fetch stats");

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
      <h1 className="text-xl md:text-3xl font-semibold">סקירת מערכת</h1>

      {/* ===== Stats ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminBox
          title="סה״כ משתמשים"
          value={loading ? "—" : String(stats?.users ?? 0)}
          color="text-green-600"
        />

        <AdminBox
          title="אירועים פעילים"
          value={loading ? "—" : String(stats?.invitations ?? 0)}
          color="text-blue-600"
        />

        <AdminBox
          title="שירותי שיחות"
          value={loading ? "—" : String(stats?.calls ?? 0)}
          color="text-orange-500"
        />

        <AdminBox
          title="סה״כ הכנסות"
          value={
            loading
              ? "—"
              : `${Number(stats?.revenue ?? 0).toLocaleString()} ₪`
          }
          color="text-amber-600"
          highlight
        />
      </div>
    </div>
  );
}

/* =====================================================
   CARD
===================================================== */
function AdminBox({
  title,
  value,
  color,
  highlight = false,
}: {
  title: string;
  value: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`
        rounded-2xl border bg-white px-4 py-5
        text-center shadow-sm
        ${highlight ? "border-amber-300 bg-amber-50" : ""}
      `}
    >
      <div className="text-xs md:text-sm text-gray-500 mb-1">
        {title}
      </div>

      <div
        className={`text-2xl md:text-3xl font-bold ${color}`}
      >
        {value}
      </div>
    </div>
  );
}
