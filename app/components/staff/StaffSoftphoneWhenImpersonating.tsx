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
    מסופון לעובד רגיל בלבד כשאין התחזות.
    בזמן התחזות נציג את המסופון לפי cookie של מצב תמיכה.
  */
  if (user.impersonated === true) return false;
  if (user.impersonatedByAdmin === true) return false;
  if (impersonationRole) return false;

  if (role !== "worker" && role !== "staff" && role !== "employee") return false;
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

export default function StaffSoftphoneWhenImpersonating() {
  const [isMounted, setIsMounted] = useState(false);

  const [currentUser, setCurrentUser] = useState<MeResponse["user"]>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [supportModeActive, setSupportModeActive] = useState(false);

  const refreshSupportModeState = useCallback(() => {
    const active =
      hasCookie(SUPPORT_COOKIE_NAME) || hasCookie(STAFF_ID_COOKIE_NAME);

    setSupportModeActive(active);
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

    /*
      עובד רגיל בדשבורד עובדים:
      מציג סופטפון.

      עובד שנכנס ללקוח בהתחזות:
      currentUser הוא כבר הלקוח, לכן מציגים לפי cookie של מצב תמיכה.
    */
    if (supportModeActive) return true;

    if (loadingUser) return false;

    return isRegularWorker(currentUser);
  }, [isMounted, supportModeActive, loadingUser, currentUser]);

  if (!isMounted) return null;
  if (!shouldShowSoftphone) return null;

  return (
    <div
      dir="rtl"
      className="
        sticky top-0 z-[80]
        w-full
        bg-[#070B18]
        px-4 py-4
        shadow-[0_14px_38px_rgba(15,23,42,0.18)]
      "
    >
      <div className="mx-auto w-full max-w-[1480px]">
        <SoftphoneStatusPanel />
      </div>
    </div>
  );
}