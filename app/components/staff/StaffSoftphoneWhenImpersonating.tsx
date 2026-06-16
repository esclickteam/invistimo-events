"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
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

function isEmployeeArea(pathname: string | null) {
  const path = String(pathname || "");

  return path === "/employee" || path.startsWith("/employee/");
}

/*
  חשוב:
  הקומפוננטה הזו מיועדת רק לסופטפון בזמן התחזות / מצב תמיכה.

  לעובד רגיל הסופטפון כבר נטען קבוע מתוך:
  app/employee/layout.tsx

  לכן אסור להציג כאן סופטפון לעובד רגיל,
  אחרת יהיו שני מופעים של הסופטפון והוא יכול להתנתק / להופיע כפול.
*/
export default function StaffSoftphoneWhenImpersonating() {
  const pathname = usePathname();

  const [isMounted, setIsMounted] = useState(false);
  const [supportModeActive, setSupportModeActive] = useState(false);

  const refreshSupportModeState = useCallback(() => {
    const active =
      hasCookie(SUPPORT_COOKIE_NAME) || hasCookie(STAFF_ID_COOKIE_NAME);

    setSupportModeActive(active);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    refreshSupportModeState();

    function handleFocus() {
      refreshSupportModeState();
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        refreshSupportModeState();
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = window.setInterval(() => {
      refreshSupportModeState();
    }, 2500);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(interval);
    };
  }, [refreshSupportModeState]);

  const shouldShowSoftphone = useMemo(() => {
    if (!isMounted) return false;

    /*
      אם אנחנו בתוך אזור עובד — לא מציגים כאן.
      שם הסופטפון מגיע מ־app/employee/layout.tsx
    */
    if (isEmployeeArea(pathname)) return false;

    /*
      מציגים רק בזמן התחזות / תמיכה.
      לדוגמה: עובד נכנס לדשבורד לקוח והמערכת שומרת cookie.
    */
    return supportModeActive;
  }, [isMounted, pathname, supportModeActive]);

  if (!shouldShowSoftphone) return null;

  return (
    <div
      dir="rtl"
      className="
        sticky top-0 z-[80]
        w-full
        bg-white
        px-4 py-3
        shadow-[0_14px_38px_rgba(15,23,42,0.12)]
        print:hidden
      "
    >
      <div className="mx-auto w-full max-w-[1480px]">
        <SoftphoneStatusPanel />
      </div>
    </div>
  );
}