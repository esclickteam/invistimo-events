import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwt } from "jose";

import { getDashboardPathFromAuthCookies } from "@/lib/auth/getDashboardRedirectPath";

/* ========================================================
   Types
======================================================== */
type JwtPayloadShape = {
  userId?: string;
  id?: string;
  _id?: string;
  role?: string;
  exp?: number;

  // התחזות
  impersonated?: boolean;
  impersonationRole?: string;

  // 💰 תשלום (מגיע מהטוקן בלבד)
  hasPaid?: boolean;
  includeWeddingChallenges?: boolean;
};

/* ========================================================
   Helpers – redirects
======================================================== */
function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

function redirectToPricing(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/pricing";
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

function redirectToForbidden(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/";
  return NextResponse.redirect(url);
}

/* ========================================================
   JWT (Edge-safe)
======================================================== */
function readJwtPayload(token: string): JwtPayloadShape | null {
  try {
    return decodeJwt(token) as JwtPayloadShape;
  } catch {
    return null;
  }
}

/* ========================================================
   Path helpers
======================================================== */
function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/packages") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/rsvp") ||
    pathname.startsWith("/seating-explained") ||
    pathname.startsWith("/event-management") ||
    pathname.startsWith("/set-password") ||
    pathname.startsWith("/payment/success") ||
    pathname.startsWith("/payment/cancel") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap")
  );
}

function isProtectedDashboardPath(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/producer") ||
    pathname.startsWith("/producer-staff") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/employee") ||
    // Venue Owner Suite (exclude public client registration)
    (pathname.startsWith("/venues") &&
      !pathname.startsWith("/venue-client") &&
      !pathname.startsWith("/venues/public"))
  );
}

function isAuthEntryPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/login" || pathname.startsWith("/login/");
}

function isTrueProductionHost(hostname: string) {
  // Never force-www for staging / preview hosts
  if (
    hostname === "staging.invistimo.com" ||
    hostname.endsWith(".vercel.app") ||
    hostname.includes("localhost")
  ) {
    return false;
  }
  const appEnv = String(process.env.APP_ENV || "").toLowerCase();
  if (appEnv === "staging" || appEnv === "preview" || appEnv === "development") {
    return false;
  }
  return (
    process.env.NODE_ENV === "production" &&
    (appEnv === "production" || !appEnv) &&
    hostname === "invistimo.com"
  );
}

function redirectLoggedInUserFromAuthEntry(req: NextRequest, dashboardPath: string) {
  const url = req.nextUrl.clone();

  if (isTrueProductionHost(url.hostname)) {
    url.hostname = "www.invistimo.com";
  }

  url.pathname = dashboardPath;
  url.search = "";
  return NextResponse.redirect(url);
}

/* ========================================================
   Middleware
======================================================== */
export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;
  const hostname = nextUrl.hostname;

  /* 0) NEVER gate API */
  if (pathname.startsWith("/api")) return NextResponse.next();

  /* 1) Read token */
  const token =
    cookies.get("authToken")?.value ||
    cookies.get("producerAuthToken")?.value ||
    cookies.get("adminAuthToken")?.value ||
    null;

  const roleCookie = cookies.get("role")?.value || null;

  /*
    משתמש מחובר שנכנס לדף הבית או ל-login —
    ננתב אותו ישר לדשבורד המתאים לפי role.
    גם מוסיפים www בקפיצה אחת כדי שלא יישאר על invistimo.com בלי redirect.
  */
  if (isAuthEntryPath(pathname)) {
    const isExplicitLogout = nextUrl.searchParams.get("loggedOut") === "1";

    if (!isExplicitLogout) {
      const dashboardPath = getDashboardPathFromAuthCookies({
        authToken: token,
        role: roleCookie,
        impersonationRole: cookies.get("impersonationRole")?.value,
        originalTargetRole: cookies.get("originalTargetRole")?.value,
      });

      if (dashboardPath) {
        return redirectLoggedInUserFromAuthEntry(req, dashboardPath);
      }
    }
  }

  /* 2) Force www (true Production only — never staging/preview) */
  if (isTrueProductionHost(hostname)) {
    const url = nextUrl.clone();
    url.hostname = "www.invistimo.com";
    return NextResponse.redirect(url);
  }

  /* 3) Public pages */
  if (isPublicPath(pathname)) return NextResponse.next();

  if (isProtectedDashboardPath(pathname) && !token) {
    return redirectToLogin(req);
  }

  if (!isProtectedDashboardPath(pathname)) {
    return NextResponse.next();
  }

  const payload = readJwtPayload(token!);
  if (!payload) return redirectToLogin(req);

  const role = String(payload.role || "").toLowerCase().trim();

  const isStaffLike =
    role === "staff" ||
    role === "producer_staff" ||
    role === "staff_producer";

  const isUserLike = role === "user" || role === "client";

  /* 4) Impersonation */
  const impersonationRole = String(payload.impersonationRole || "")
    .toLowerCase()
    .trim();

  const isImpersonatedAdminSession =
    payload.impersonated === true && impersonationRole === "admin";

  const isImpersonatedProducerSession =
    payload.impersonated === true && impersonationRole === "producer";

  const isAdmin = role === "admin";

  /* 5) Route-level role guards */
  const isAdminRoute = pathname.startsWith("/admin");
  const isProducerStaffRoute = pathname.startsWith("/producer-staff");
  const isProducerRoute =
    pathname.startsWith("/producer") && !isProducerStaffRoute;
  const isClientRoute = pathname.startsWith("/dashboard");

  if (isAdminRoute && !isAdmin) {
    return redirectToForbidden(req);
  }

  if (isProducerStaffRoute) {
    if (
      !isStaffLike &&
      !isAdmin &&
      role !== "producer" &&
      !isImpersonatedAdminSession
    ) {
      return redirectToForbidden(req);
    }
  }

  if (isProducerRoute) {
    const allowed =
      role === "producer" || isAdmin || isImpersonatedAdminSession;
    if (!allowed) return redirectToForbidden(req);
  }

  if (isClientRoute) {
    // intentionally open by role
  }

  /* 6) Paid guard – רק user/client תלויים ב-hasPaid
     אבל לא כאשר זו התחזות של מפיק */
  const requiresPaidForUser =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/producer") ||
    pathname.startsWith("/producer-staff");

  if (
    requiresPaidForUser &&
    isUserLike &&
    !isAdmin &&
    !isImpersonatedAdminSession &&
    !isImpersonatedProducerSession
  ) {
    if (payload.hasPaid !== true && payload.includeWeddingChallenges !== true) {
      return redirectToPricing(req);
    }
  }

  return NextResponse.next();
}

/* ========================================================
   Matcher
======================================================== */
export const config = {
  matcher: [
    "/",
    "/login",
    "/login/:path*",
    "/dashboard/:path*",
    "/producer/:path*",
    "/producer-staff/:path*",
    "/admin/:path*",
    "/staff/:path*",
    "/employee/:path*",
    "/venues/:path*",
  ],
};