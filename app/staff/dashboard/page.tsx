"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import SoftphoneStatusPanel from "@/app/components/staff/SoftphoneStatusPanel";

export default function StaffDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState("");

  const isSystemStaff =
    user?.effectiveRole === "system_staff" ||
    user?.isSystemStaff === true ||
    (user?.role === "staff" &&
      user?.staffType === "general_staff" &&
      user?.employeeScope === "system");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setError("לא נמצאה התחברות פעילה");
      return;
    }

    if (!isSystemStaff && user.role !== "admin") {
      setError("אין הרשאה לצפייה בעמדת הסופטפון");
    }
  }, [authLoading, user, isSystemStaff]);

  if (authLoading) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f7f8fb] px-4 py-4">
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="rounded-2xl border border-slate-200 bg-white px-7 py-6 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

            <p className="text-sm font-bold text-slate-700">
              טוען סופטפון...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f7f8fb] px-4 py-4">
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="max-w-md rounded-2xl border border-red-200 bg-white p-7 text-center shadow-sm">
            <p className="text-3xl">⚠️</p>

            <h1 className="mt-4 text-xl font-black text-slate-950">
              לא ניתן להציג את הסופטפון
            </h1>

            <p className="mt-3 text-sm leading-7 text-red-700">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f8fb] px-4 py-4">
      <div className="w-full">
        <SoftphoneStatusPanel />
      </div>
    </main>
  );
}