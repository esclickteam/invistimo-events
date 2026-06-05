"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import EmployeeDashboardPage from "@/app/components/staff/EmployeeDashboardPage";

export default function StaffDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState("");

  const isSystemStaff = useMemo(() => {
    return (
      user?.effectiveRole === "system_staff" ||
      user?.isSystemStaff === true ||
      (user?.role === "staff" &&
        user?.staffType === "general_staff" &&
        user?.employeeScope === "system")
    );
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setError("לא נמצאה התחברות פעילה");
      return;
    }

    if (!isSystemStaff && user.role !== "admin") {
      setError("אין הרשאה לצפייה בדשבורד עובדים");
      return;
    }

    setError("");
  }, [authLoading, user, isSystemStaff]);

  if (authLoading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen overflow-x-hidden bg-[#f7f8fb] px-4 py-4"
      >
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="rounded-3xl border border-slate-200 bg-white px-8 py-7 text-center shadow-sm">
            <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />

            <p className="text-sm font-black text-slate-800">
              טוען דשבורד עובדים...
            </p>

            <p className="mt-2 text-xs font-semibold text-slate-400">
              בודק הרשאות ומכין את סביבת העבודה
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main
        dir="rtl"
        className="min-h-screen overflow-x-hidden bg-[#f7f8fb] px-4 py-4"
      >
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-3xl">
              ⚠️
            </div>

            <h1 className="mt-5 text-2xl font-black text-slate-950">
              לא ניתן להציג את דשבורד העובדים
            </h1>

            <p className="mt-3 text-sm font-bold leading-7 text-red-700">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return <EmployeeDashboardPage />;
}