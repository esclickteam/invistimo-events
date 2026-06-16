"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import SoftphoneStatusPanel from "@/app/components/staff/SoftphoneStatusPanel";

const SUPPORT_COOKIE_NAME = "staffImpersonationActive";
const STAFF_ID_COOKIE_NAME = "staffOriginalUserId";
const AUTH_CHANGED_EVENT = "invistimo:auth-changed";

type GlobalSoftphoneUser = {
  role?: string;
  effectiveRole?: string;
  staffType?: string | null;
  employeeScope?: string | null;
  isSystemStaff?: boolean;
  isProducerStaff?: boolean;
  impersonated?: boolean;
  impersonatedByAdmin?: boolean;
  impersonationRole?: string | null;
} | null;

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

function getCachedUserFromSession(): GlobalSoftphoneUser {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem("auth_user");
    if (!raw) return null;

    return JSON.parse(raw) as GlobalSoftphoneUser;
  } catch (error) {
    console.error("GLOBAL SOFTPHONE READ auth_user FAILED:", error);
    return null;
  }
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

function isProducerRole(value?: string | null) {
  const role = normalizeRole(value);

  return (
    role === "producer" ||
    role === "producer_staff" ||
    role === "producerstaff" ||
    role === "staff_producer"
  );
}

function isSystemEmployeeRole(value?: string | null) {
  const role = normalizeRole(value);

  return (
    role === "staff" ||
    role === "employee" ||
    role === "worker" ||
    role === "system_staff" ||
    role === "general_staff"
  );
}

/*
  עובד מערכת בלבד:
  כן:
  - role: staff / employee / worker
  - effectiveRole: system_staff
  - isSystemStaff: true
  - staffType: general_staff + employeeScope: system

  לא:
  - producer
  - producer_staff
  - staff_producer
  - user/client/admin/venue_owner
*/
function isSystemEmployeeUser(user: GlobalSoftphoneUser) {
  if (!user) return false;

  const role = normalizeRole(user.role);
  const effectiveRole = normalizeRole(user.effectiveRole);
  const staffType = normalizeRole(user.staffType);
  const employeeScope = normalizeRole(user.employeeScope);
  const impersonationRole = normalizeRole(user.impersonationRole);

  if (isProducerRole(role)) return false;
  if (isProducerRole(effectiveRole)) return false;
  if (isProducerRole(staffType)) return false;
  if (isProducerRole(impersonationRole)) return false;

  /*
    בזמן התחזות:
    לפעמים user הוא הלקוח,
    לכן בודקים את impersonationRole.
  */
  if (user.impersonated === true || user.impersonatedByAdmin === true) {
    return isSystemEmployeeRole(impersonationRole);
  }

  if (impersonationRole) {
    return isSystemEmployeeRole(impersonationRole);
  }

  if (user.isSystemStaff === true) return true;
  if (effectiveRole === "system_staff") return true;

  if (
    role === "staff" &&
    staffType === "general_staff" &&
    employeeScope === "system"
  ) {
    return true;
  }

  return isSystemEmployeeRole(role);
}

export default function GlobalSoftphoneMount() {
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] =
    useState<GlobalSoftphoneUser>(null);
  const [supportModeActive, setSupportModeActive] = useState(false);

  const refreshState = useCallback(() => {
    setCurrentUser(getCachedUserFromSession());
    setSupportModeActive(isSupportModeActive());
  }, []);

  useEffect(() => {
    setMounted(true);
    refreshState();

    function handleFocus() {
      refreshState();
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        refreshState();
      }
    }

    function handleAuthChanged() {
      refreshState();
    }

    function handleStorage(event: StorageEvent) {
      if (
        event.key === "auth_user" ||
        event.key === "staffImpersonationActive" ||
        event.key === "staffOriginalUserId"
      ) {
        refreshState();
      }
    }

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    /*
      אין setInterval.
      אין /api/me.
      הסופטפון מתעדכן רק כשה־AuthProvider מעדכן sessionStorage
      ומשדר invistimo:auth-changed.
    */

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshState]);

  useEffect(() => {
    refreshState();
  }, [pathname, refreshState]);

  const shouldShowSoftphone = useMemo(() => {
    if (!mounted) return false;

    /*
      אין משתמש מחובר בכלל.
    */
    if (!currentUser) return false;

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
  }, [mounted, currentUser, supportModeActive, pathname]);

  if (!shouldShowSoftphone) return null;

  return <SoftphoneStatusPanel />;
}