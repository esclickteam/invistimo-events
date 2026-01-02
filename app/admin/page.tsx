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
    <div>
      <h1 className="text-3xl font-semibold mb-6">סקירת מערכת</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
        bg-white rounded-xl border p-6 shadow-sm text-center
        ${highlight ? "border-amber-300 bg-amber-50" : ""}
      `}
    >
      <div className="text-gray-500 mb-2">{title}</div>
      <div
        className={`text-3xl font-bold ${
          highlight ? "text-amber-700" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
