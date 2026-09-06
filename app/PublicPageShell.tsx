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

function isLiveRoute(pathname: string | null) {
  const path = String(pathname || "");
  return path === "/live" || path.startsWith("/live/");
}

function isWeddingWebsiteRoute(pathname: string | null) {
  const path = String(pathname || "");
  return (
    path === "/wedding-website" ||
    path.startsWith("/wedding-website/") ||
    path === "/w" ||
    path.startsWith("/w/")
  );
}

function isSalesDocumentRoute(pathname: string | null) {
  const path = String(pathname || "");

  return (
    path.startsWith("/sales-documents") ||
    path.startsWith("/client-contracts/sign")
  );
}

function isSetPasswordRoute(pathname: string | null) {
  const path = String(pathname || "");
  return path === "/set-password" || path.startsWith("/set-password/");
}

function isPublicEventRoute(pathname: string | null) {
  const path = String(pathname || "");
  return path.startsWith("/public/events/") || path.startsWith("/e/");
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
    if (isSalesDocumentRoute(pathname)) return true;

    if (isSetPasswordRoute(pathname)) return true;

    if (isWeddingWebsiteRoute(pathname)) return true;

    if (isPublicEventRoute(pathname)) return true;

    if (isLiveRoute(pathname)) return true;

    if (isPrivateStaffRoute(pathname)) return true;

    /*
      מצב התחזות / תמיכה:
      לדוגמה עובד מערכת נכנס לדשבורד של לקוח.
      במקרה כזה לא מציגים Header/Footer ציבוריים ולא כפתור WhatsApp.
    */
    if (mounted && supportModeActive) return true;

    return false;
  }, [pathname, mounted, supportModeActive]);

  const shouldShowSupportBot = useMemo(() => {
    if (isSalesDocumentRoute(pathname)) return false;

    if (isSetPasswordRoute(pathname)) return false;

    if (isWeddingWebsiteRoute(pathname)) return false;

    if (isPublicEventRoute(pathname)) return false;

    if (isLiveRoute(pathname)) return false;

    if (isPrivateStaffRoute(pathname)) return false;

    if (mounted && supportModeActive) return false;

    return true;
  }, [pathname, mounted, supportModeActive]);

  if (shouldHidePublicShell) {
    return (
      <>
        <style>{`
          a[href*="wa.me"],
          a[href*="whatsapp"],
          a[href*="api.whatsapp.com"],
          button[aria-label*="WhatsApp"],
          button[aria-label*="וואטסאפ"],
          [title*="WhatsApp"],
          [title*="וואטסאפ"],
          [class*="whatsapp"],
          [class*="WhatsApp"],
          [class*="support"],
          [class*="Support"],
          [id*="whatsapp"],
          [id*="WhatsApp"],
          [id*="support"],
          [id*="Support"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }

          #userwayAccessibilityIcon,
          #userwayAccessibilityIconRoot,
          #userwayAccessibilityIconWrapper,
          .userway_accessibility_icon,
          .userway_p1,
          .uwy,
          .uwy-user-way,
          iframe[src*="userway"],
          iframe[title*="Accessibility"],
          iframe[title*="נגישות"],
          [aria-label*="Accessibility"],
          [aria-label*="נגישות"],
          [class*="accessibility"],
          [class*="Accessibility"],
          [id*="accessibility"],
          [id*="Accessibility"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `}</style>

        {children}
      </>
    );
  }

  return (
    <>
      <ClientShell>{children}</ClientShell>

      {/* כפתור וואטסאפ / תמיכה — מופיע רק באתר הציבורי */}
      {shouldShowSupportBot ? <SupportBotButton /> : null}
    </>
  );
}