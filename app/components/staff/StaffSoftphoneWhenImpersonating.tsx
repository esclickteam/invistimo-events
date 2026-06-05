"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SoftphoneStatusPanel from "@/app/components/staff/SoftphoneStatusPanel";

const SUPPORT_COOKIE_NAME = "staffImpersonationActive";
const STAFF_ID_COOKIE_NAME = "staffOriginalUserId";

function getCookieValue(name: string) {
  if (typeof document === "undefined") return "";

  const cookies = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean);

  const found = cookies.find((cookie) => cookie.startsWith(`${name}=`));

  if (!found) return "";

  return decodeURIComponent(found.split("=").slice(1).join("="));
}

function hasCookie(name: string) {
  return Boolean(getCookieValue(name));
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;

  document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
}

export default function StaffSoftphoneWhenImpersonating() {
  const [isMounted, setIsMounted] = useState(false);
  const [showSoftphone, setShowSoftphone] = useState(false);
  const [staffOriginalUserId, setStaffOriginalUserId] = useState("");
  const [endingSupportMode, setEndingSupportMode] = useState(false);

  const refreshSupportModeState = useCallback(() => {
    const isActive = hasCookie(SUPPORT_COOKIE_NAME);

    setShowSoftphone(isActive);
    setStaffOriginalUserId(getCookieValue(STAFF_ID_COOKIE_NAME));
  }, []);

  useEffect(() => {
    setIsMounted(true);
    refreshSupportModeState();

    const handleFocus = () => refreshSupportModeState();
    const handleVisibilityChange = () => {
      if (!document.hidden) refreshSupportModeState();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = window.setInterval(refreshSupportModeState, 2500);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(interval);
    };
  }, [refreshSupportModeState]);

  const supportLabel = useMemo(() => {
    if (!staffOriginalUserId) return "מצב תמיכה פעיל";

    return `מצב תמיכה פעיל · עובד ${staffOriginalUserId.slice(-6)}`;
  }, [staffOriginalUserId]);

  async function endSupportMode() {
    if (endingSupportMode) return;

    try {
      setEndingSupportMode(true);

      await fetch("/api/staff/impersonate/end", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      }).catch(() => null);

      deleteCookie(SUPPORT_COOKIE_NAME);
      deleteCookie(STAFF_ID_COOKIE_NAME);

      setShowSoftphone(false);
      setStaffOriginalUserId("");

      window.location.href = "/staff/dashboard";
    } finally {
      setEndingSupportMode(false);
    }
  }

  if (!isMounted || !showSoftphone) return null;

  return (
    <>
      <SoftphoneStatusPanel />

      <div
        dir="rtl"
        className="fixed right-4 top-4 z-[90] hidden max-w-[calc(100vw-410px)] items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-amber-950 shadow-[0_18px_50px_rgba(120,53,15,0.14)] backdrop-blur-xl lg:flex"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-lg">
          🛟
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-black">{supportLabel}</p>
          <p className="text-xs font-bold text-amber-700">
            את/ה צופה בדשבורד לקוח כנציג/ת שירות. כל פעולה צריכה להירשם כלוג תמיכה.
          </p>
        </div>

        <button
          type="button"
          onClick={endSupportMode}
          disabled={endingSupportMode}
          className="mr-2 h-9 shrink-0 rounded-xl bg-slate-950 px-4 text-xs font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {endingSupportMode ? "יוצא..." : "יציאה"}
        </button>
      </div>

      <div
        dir="rtl"
        className="fixed left-4 right-4 top-4 z-[90] flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-amber-950 shadow-[0_18px_50px_rgba(120,53,15,0.14)] backdrop-blur-xl lg:hidden"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-black">מצב תמיכה פעיל</p>
          <p className="truncate text-xs font-bold text-amber-700">
            המסופון פעיל בתחתית המסך
          </p>
        </div>

        <button
          type="button"
          onClick={endSupportMode}
          disabled={endingSupportMode}
          className="h-9 shrink-0 rounded-xl bg-slate-950 px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {endingSupportMode ? "יוצא..." : "יציאה"}
        </button>
      </div>
    </>
  );
}
