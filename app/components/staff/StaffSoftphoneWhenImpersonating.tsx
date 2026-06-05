"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [showSupportBar, setShowSupportBar] = useState(false);
  const [staffOriginalUserId, setStaffOriginalUserId] = useState("");
  const [endingSupportMode, setEndingSupportMode] = useState(false);

  const refreshSupportModeState = useCallback(() => {
    const isActive = hasCookie(SUPPORT_COOKIE_NAME);

    setShowSupportBar(isActive);
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

      setShowSupportBar(false);
      setStaffOriginalUserId("");

      window.location.href = "/staff/dashboard";
    } finally {
      setEndingSupportMode(false);
    }
  }

  if (!isMounted || !showSupportBar) return null;

  return (
    <div
      dir="rtl"
      className="
        sticky
        top-0
        z-[70]
        mb-5
        rounded-[28px]
        border
        border-[#E7D4AE]
        bg-white/95
        px-4
        py-3
        shadow-[0_18px_55px_rgba(30,27,46,0.08)]
        backdrop-blur-xl
      "
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F7EEDB] text-xl">
            🎧
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#1E1B2E]">
              {supportLabel}
            </p>

            <p className="mt-0.5 truncate text-xs font-bold text-[#8B6A2E]">
              את/ה צופה בדשבורד לקוח כנציג/ת שירות. כל פעולה צריכה להירשם כלוג תמיכה.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <div className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-black text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            סופטפון פעיל
          </div>

          <button
            type="button"
            className="
              h-11
              rounded-2xl
              border
              border-[#E7D4AE]
              bg-[#F8F2E7]
              px-4
              text-xs
              font-black
              text-[#6F4726]
              transition
              hover:bg-[#F1E4CF]
            "
          >
            שיחה חדשה
          </button>

          <button
            type="button"
            className="
              h-11
              rounded-2xl
              border
              border-slate-200
              bg-white
              px-4
              text-xs
              font-black
              text-slate-700
              transition
              hover:bg-slate-50
            "
          >
            היסטוריית שיחות
          </button>

          <button
            type="button"
            onClick={endSupportMode}
            disabled={endingSupportMode}
            className="
              h-11
              rounded-2xl
              bg-slate-950
              px-5
              text-xs
              font-black
              text-white
              transition
              hover:bg-black
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {endingSupportMode ? "יוצא..." : "יציאה"}
          </button>
        </div>
      </div>
    </div>
  );
}