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

/* ========================================================
   Middleware
======================================================== */
export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;
  const hostname = nextUrl.hostname;

  /* 0) NEVER gate API */
  if (pathname.startsWith("/api")) return NextResponse.next();

  /* 1) Public pages */
  if (isPublicPath(pathname)) return NextResponse.next();

  /* 2) Force www (production) */
  if (process.env.NODE_ENV === "production" && hostname === "invistimo.com") {
    const url = nextUrl.clone();
    url.hostname = "www.invistimo.com";
    return NextResponse.redirect(url);
  }

  /* 3) Read token */
  const token =
    cookies.get("authToken")?.value ||
    cookies.get("producerAuthToken")?.value ||
    cookies.get("adminAuthToken")?.value ||
    null;

  if (isProtectedDashboardPath(pathname) && !token) {
    return redirectToLogin(req);
  }

  if (!isProtectedDashboardPath(pathname)) {
    return NextResponse.next();
  }

  const payload = readJwtPayload(token!);
  if (!payload) return redirectToLogin(req);

  const role = String(payload.role || "").toLowerCase();

  /* 4) Impersonation */
  const isImpersonatedAdminSession =
    payload.impersonated === true &&
    String(payload.impersonationRole || "").toLowerCase() === "admin";

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
    const isProducerStaff =
      role === "staff" ||
      role === "producer_staff" ||
      role === "staff_producer";

    if (
      !isProducerStaff &&
      !isAdmin &&
      role !== "producer" &&
      !isImpersonatedAdminSession
    ) {
      return redirectToForbidden(req);
    }
  }

  if (isProducerRoute) {
    const allowed = role === "producer" || isAdmin || isImpersonatedAdminSession;
    if (!allowed) return redirectToForbidden(req);
  }

  if (isClientRoute) {
    // intentionally open by role (לפי הלוגיקה שלך)
  }

  /* 6) Paid guard – ❗ רק מהטוקן ❗ */
  const requiresPaid =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/producer") ||
    pathname.startsWith("/producer-staff");

  if (
  requiresPaid &&
  role === "user" &&   // 👈 רק משתמש רגיל
  !isAdmin &&
  !isImpersonatedAdminSession
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
    "/dashboard/:path*",
    "/producer/:path*",
    "/producer-staff/:path*",
    "/admin/:path*",
  ],
};
