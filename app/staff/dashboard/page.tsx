"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import EmployeeDashboardPage from "@/app/components/staff/EmployeeDashboardPage";

export default function StaffDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

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
      window.location.replace("/api/logout");
      return;
    }

    if (!isSystemStaff && user.role !== "admin") {
      router.replace("/");
    }
  }, [authLoading, user, isSystemStaff, router]);

  if (authLoading || !user || (!isSystemStaff && user.role !== "admin")) {
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

  return <EmployeeDashboardPage />;
}