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
      setError("אין הרשאה לצפייה בדשבורד העובד");
    }
  }, [authLoading, user, isSystemStaff]);

  if (authLoading) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f7f1e8] p-6">
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center">
          <div className="rounded-[28px] border border-[#eadfce] bg-white px-8 py-7 text-center shadow-sm">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#eadfce] border-t-[#9b7a3c]" />
            <p className="text-sm font-bold text-[#6b5a45]">
              טוען עמדת סופטפון...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f7f1e8] p-6">
        <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center">
          <div className="rounded-[28px] border border-red-200 bg-white p-8 text-center shadow-sm">
            <p className="text-3xl">⚠️</p>

            <h1 className="mt-4 text-2xl font-black text-[#2f251d]">
              לא ניתן להציג את עמדת הסופטפון
            </h1>

            <p className="mt-3 text-sm leading-7 text-red-700">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f1e8] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="overflow-hidden rounded-[30px] border border-[#eadfce] bg-white shadow-sm">
          <div className="relative p-5 md:p-6">
            <div className="absolute left-0 top-0 h-32 w-32 rounded-full bg-[#d8a85f]/10 blur-3xl" />
            <div className="absolute bottom-0 right-10 h-28 w-28 rounded-full bg-[#9b7a3c]/10 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black tracking-[0.2em] text-[#9b7a3c]">
                  INVISTIMO SOFTPHONE
                </p>

                <h1 className="mt-2 text-2xl font-black text-[#2f251d] md:text-3xl">
                  עמדת סופטפון אישית
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-7 text-[#7a6a58]">
                  חיוג, שיחה נכנסת, סטטוס עובד, פנוי / לא פנוי, טיפול אחרי
                  שיחה, הפסקה וטיימר חי — הכל בשורה אחת.
                </p>
              </div>

              <div className="rounded-2xl border border-[#eadfce] bg-[#fff8ed] px-5 py-3">
                <p className="text-xs font-bold text-[#8b7b68]">עובד מחובר</p>
                <p className="mt-1 text-sm font-black text-[#2f251d]">
                  {user?.name || user?.email || "עובד מערכת"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <SoftphoneStatusPanel />
      </div>
    </main>
  );
}