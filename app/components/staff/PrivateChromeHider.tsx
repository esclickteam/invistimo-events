"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

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

function isPrivateStaffRoute(pathname: string | null) {
  const path = String(pathname || "");

  return (
    path === "/staff" ||
    path.startsWith("/staff/") ||
    path === "/employee" ||
    path.startsWith("/employee/")
  );
}

function isStaffSupportMode() {
  return hasCookie(SUPPORT_COOKIE_NAME) || hasCookie(STAFF_ID_COOKIE_NAME);
}

export default function PrivateChromeHider() {
  const pathname = usePathname();

  useEffect(() => {
    const shouldHideChrome =
      isPrivateStaffRoute(pathname) || isStaffSupportMode();

    if (shouldHideChrome) {
      document.body.setAttribute("data-hide-public-chrome", "1");
    } else {
      document.body.removeAttribute("data-hide-public-chrome");
    }

    return () => {
      document.body.removeAttribute("data-hide-public-chrome");
    };
  }, [pathname]);

  return null;
}