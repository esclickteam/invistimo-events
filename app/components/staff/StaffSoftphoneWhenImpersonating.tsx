"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SoftphoneStatusPanel from "@/app/components/staff/SoftphoneStatusPanel";

const SUPPORT_COOKIE_NAME = "staffImpersonationActive";
const STAFF_ID_COOKIE_NAME = "staffOriginalUserId";

type MeResponse = {
  success?: boolean;
  user?: {
    role?: string;
    staffType?: string;
    impersonated?: boolean;
    impersonatedByAdmin?: boolean;
    impersonationRole?: string;
  } | null;
};

function normalizeRole(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function isRegularWorker(user: MeResponse["user"]) {
  if (!user) return false;

  const role = normalizeRole(user.role);
  const staffType = normalizeRole(user.staffType);
  const impersonationRole = normalizeRole(user.impersonationRole);

  /*
    מסופון רק לעובד רגיל.
    לא לקוח, לא אדמין, לא מפיק, לא עובד מפיק, לא בזמן התחזות.
  */
  if (user.impersonated === true) return false;
  if (user.impersonatedByAdmin === true) return false;
  if (impersonationRole) return false;

  if (role !== "worker") return false;
  if (staffType === "producer_staff") return false;
  if (staffType === "producer") return false;

  return true;
}

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

  const [currentUser, setCurrentUser] = useState<MeResponse["user"]>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [supportModeActive, setSupportModeActive] = useState(false);
  const [staffOriginalUserId, setStaffOriginalUserId] = useState("");
  const [endingSupportMode, setEndingSupportMode] = useState(false);

  const refreshSupportModeState = useCallback(() => {
    const isActive = hasCookie(SUPPORT_COOKIE_NAME);

    setSupportModeActive(isActive);
    setStaffOriginalUserId(getCookieValue(STAFF_ID_COOKIE_NAME));
  }, []);

  const loadCurrentUser = useCallback(async () => {
    try {
      setLoadingUser(true);

      const res = await fetch("/api/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = (await res.json().catch(() => null)) as MeResponse | null;

      if (!res.ok || !data?.success) {
        setCurrentUser(null);
        return;
      }

      setCurrentUser(data.user || null);
    } catch (error) {
      console.error("LOAD CURRENT USER FOR SOFTPHONE FAILED:", error);
      setCurrentUser(null);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);

    refreshSupportModeState();
    void loadCurrentUser();

    const handleFocus = () => {
      refreshSupportModeState();
      void loadCurrentUser();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshSupportModeState();
        void loadCurrentUser();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = window.setInterval(() => {
      refreshSupportModeState();
      void loadCurrentUser();
    }, 2500);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(interval);
    };
  }, [refreshSupportModeState, loadCurrentUser]);

  const shouldShowSoftphone = useMemo(() => {
    if (!isMounted) return false;
    if (loadingUser) return false;

    return isRegularWorker(currentUser);
  }, [isMounted, loadingUser, currentUser]);

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

      setSupportModeActive(false);
      setStaffOriginalUserId("");

      window.location.href = "/staff/dashboard";
    } finally {
      setEndingSupportMode(false);
    }
  }

  if (!isMounted) return null;

  return (
    <>
      {shouldShowSoftphone && <SoftphoneStatusPanel />}

      {supportModeActive && (
        <>
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
                צפייה בדשבורד לקוח כנציג/ת שירות
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
      )}
    </>
  );
}