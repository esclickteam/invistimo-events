import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwt } from "jose";

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

function isTokenExpired(payload: JwtPayloadShape): boolean {
  if (!payload.exp) return false;
  return payload.exp * 1000 <= Date.now();
}

function getDashboardPathFromRole(role: string): string {
  const normalized = String(role || "").toLowerCase().trim();

  if (normalized === "admin") return "/admin";
  if (normalized === "venue_owner") return "/venues/dashboard";
  if (normalized === "producer") return "/producer/dashboard";
  if (normalized === "producer_staff" || normalized === "staff_producer") {
    return "/producer-staff/dashboard";
  }
  if (normalized === "system_staff" || normalized === "staff") {
    return "/staff/dashboard";
  }

  return "/dashboard";
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
    pathname.startsWith("/admin")
  );
}

function isAuthEntryPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/login" || pathname.startsWith("/login/");
}

function getDashboardPathFromJwt(payload: JwtPayloadShape): string {
  return getDashboardPathFromRole(
    String(payload.impersonationRole || payload.role || "")
  );
}

function redirectLoggedInUserFromAuthEntry(req: NextRequest, dashboardPath: string) {
  const url = req.nextUrl.clone();

  if (
    process.env.NODE_ENV === "production" &&
    url.hostname === "invistimo.com"
  ) {
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
    if (token) {
      const payload = readJwtPayload(token);

      if (payload && !isTokenExpired(payload)) {
        return redirectLoggedInUserFromAuthEntry(
          req,
          getDashboardPathFromJwt(payload)
        );
      }
    }

    if (roleCookie) {
      return redirectLoggedInUserFromAuthEntry(
        req,
        getDashboardPathFromRole(roleCookie)
      );
    }
  }

  /* 2) Force www (production) */
  if (process.env.NODE_ENV === "production" && hostname === "invistimo.com") {
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
    if (payload.hasPaid !== true) {
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
  ],
};