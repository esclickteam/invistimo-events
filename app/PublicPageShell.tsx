"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import ClientShell from "./ClientShell";
import SupportBotButton from "./components/SupportBotButton";

type PublicPageShellProps = {
  children: ReactNode;
};

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

function isStaffSupportMode() {
  return hasCookie(SUPPORT_COOKIE_NAME) || hasCookie(STAFF_ID_COOKIE_NAME);
}

function isPrivateStaffRoute(pathname: string | null) {
  const path = String(pathname || "");

  return (
    path === "/staff" ||
    path.startsWith("/staff/") ||
    path === "/employee" ||
    path.startsWith("/employee/")
  );
}

function isPublicEventRoute(pathname: string | null) {
  const path = String(pathname || "");

  return path === "/e" || path.startsWith("/e/");
}

export default function PublicPageShell({ children }: PublicPageShellProps) {
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [supportModeActive, setSupportModeActive] = useState(false);

  const refreshSupportModeState = useCallback(() => {
    setSupportModeActive(isStaffSupportMode());
  }, []);

  useEffect(() => {
    setMounted(true);
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

  const shouldHidePublicShell = useMemo(() => {
    if (isPublicEventRoute(pathname)) return true;

    if (isPrivateStaffRoute(pathname)) return true;

    /*
      מצב התחזות / תמיכה:
      לדוגמה עובד מערכת נכנס לדשבורד של לקוח.
      במקרה כזה לא מציגים Header/Footer ציבוריים ולא כפתור WhatsApp.
    */
    if (mounted && supportModeActive) return true;

    return false;
  }, [pathname, mounted, supportModeActive]);

  if (shouldHidePublicShell) {
    return <>{children}</>;
  }

  return (
    <>
      <ClientShell>{children}</ClientShell>

      {/* כפתור וואטסאפ / תמיכה — מופיע רק באתר הציבורי */}
      <SupportBotButton />
    </>
  );
}