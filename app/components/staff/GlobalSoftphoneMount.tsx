"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
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

function isSupportModeActive() {
  return hasCookie(SUPPORT_COOKIE_NAME) || hasCookie(STAFF_ID_COOKIE_NAME);
}

function isSystemEmployeeRole(value?: string | null) {
  const role = normalizeRole(value);

  return role === "staff" || role === "employee" || role === "worker";
}

function isProducerRole(value?: string | null) {
  const role = normalizeRole(value);

  return (
    role === "producer" ||
    role === "producer_staff" ||
    role === "producerstaff"
  );
}

/*
  עובד מערכת בלבד:
  כן: staff / employee / worker
  לא: producer / producer_staff / client / customer / business / admin
*/
function isSystemEmployeeUser(user: MeResponse["user"]) {
  if (!user) return false;

  const role = normalizeRole(user.role);
  const staffType = normalizeRole(user.staffType);
  const impersonationRole = normalizeRole(user.impersonationRole);

  if (isProducerRole(role)) return false;
  if (isProducerRole(staffType)) return false;
  if (isProducerRole(impersonationRole)) return false;

  /*
    בזמן התחזות:
    currentUser יכול להיות הלקוח,
    אבל impersonationRole אמור לסמן מי המשתמש המקורי.
  */
  if (user.impersonated === true || user.impersonatedByAdmin === true) {
    return isSystemEmployeeRole(impersonationRole);
  }

  if (impersonationRole) {
    return isSystemEmployeeRole(impersonationRole);
  }

  return isSystemEmployeeRole(role);
}

function isEmployeeOrStaffPath(pathname: string | null) {
  const path = String(pathname || "");

  return (
    path === "/staff" ||
    path.startsWith("/staff/") ||
    path === "/employee" ||
    path.startsWith("/employee/")
  );
}

export default function GlobalSoftphoneMount() {
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<MeResponse["user"]>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [supportModeActive, setSupportModeActive] = useState(false);

  const refreshSupportModeState = useCallback(() => {
    setSupportModeActive(isSupportModeActive());
  }, []);

  const loadCurrentUser = useCallback(async () => {
    try {
      setLoadingUser(true);

      const response = await fetch("/api/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as
        | MeResponse
        | null;

      if (!response.ok || !data?.success) {
        setCurrentUser(null);
        return;
      }

      setCurrentUser(data.user || null);
    } catch (error) {
      console.error("GLOBAL SOFTPHONE LOAD CURRENT USER FAILED:", error);
      setCurrentUser(null);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);

    refreshSupportModeState();
    void loadCurrentUser();

    function handleFocus() {
      refreshSupportModeState();
      void loadCurrentUser();
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        refreshSupportModeState();
        void loadCurrentUser();
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = window.setInterval(() => {
      refreshSupportModeState();
      void loadCurrentUser();
    }, 10000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(interval);
    };
  }, [refreshSupportModeState, loadCurrentUser]);

  const shouldShowSoftphone = useMemo(() => {
    if (!mounted) return false;
    if (loadingUser) return false;

    /*
      מצב התחזות / תמיכה:
      מציגים רק אם המשתמש המקורי הוא עובד מערכת,
      ולא עובד מפיק.
    */
    if (supportModeActive) {
      return isSystemEmployeeUser(currentUser);
    }

    /*
      בלי התחזות:
      מציגים רק באזורי staff / employee
      ורק לעובד מערכת.
    */
    if (!isEmployeeOrStaffPath(pathname)) return false;

    return isSystemEmployeeUser(currentUser);
  }, [mounted, loadingUser, supportModeActive, pathname, currentUser]);

  if (!shouldShowSoftphone) return null;

  return <SoftphoneStatusPanel />;
}