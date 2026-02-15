import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, decodeJwt } from "jose";

type JwtPayloadShape = {
  userId?: string;
  role?: string;
  hasPaid?: boolean;
  exp?: number;

  // ✅ עבור התחזות
  impersonated?: boolean;
  impersonationRole?: string; // "admin" | "producer" | ...
};

/* ========================================================
   Helpers
======================================================== */
function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

function redirectToPricing(req: NextRequest) {
  const url = req.nextUrl.clone();
  // אם אצלך זה /packages -> תשני כאן
  url.pathname = "/pricing";
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

function redirectToForbidden(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/"; // אפשר לשנות ל-"/403" אם יש עמוד כזה
  return NextResponse.redirect(url);
}

async function readJwtPayload(token: string): Promise<JwtPayloadShape | null> {
  try {
    const secret = process.env.JWT_SECRET;

    // fallback decode אם אין סוד (לא אידיאלי, אבל עדיף מלא להתרסק)
    if (!secret) {
      return decodeJwt(token) as JwtPayloadShape;
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload as JwtPayloadShape;
  } catch {
    return null;
  }
}

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
export async function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;
  const hostname = nextUrl.hostname;

  /* ========================================================
     0) NEVER gate API here
  ======================================================== */
  if (pathname.startsWith("/api")) return NextResponse.next();

  /* ========================================================
     1) Public pages
  ======================================================== */
  if (isPublicPath(pathname)) return NextResponse.next();

  /* ========================================================
     2) Force WWW in production
  ======================================================== */
  if (process.env.NODE_ENV === "production" && hostname === "invistimo.com") {
    const url = nextUrl.clone();
    url.hostname = "www.invistimo.com";
    return NextResponse.redirect(url);
  }

  /* ========================================================
     3) Read auth state
  ======================================================== */
  const token =
    cookies.get("authToken")?.value ||
    cookies.get("producerAuthToken")?.value ||
    cookies.get("adminAuthToken")?.value ||
    null;

  if (isProtectedDashboardPath(pathname) && !token) {
    return redirectToLogin(req);
  }

  // אם לא נתיב מוגן - להמשיך
  if (!isProtectedDashboardPath(pathname)) {
    return NextResponse.next();
  }

  const payload = await readJwtPayload(token!);
  if (!payload) return redirectToLogin(req);

  const role = String(payload.role || "").toLowerCase();

  // ✅ התחזות מאדמין: לא לחסום לפי hasPaid
  const isImpersonatedAdminSession =
    payload.impersonated === true &&
    String(payload.impersonationRole || "").toLowerCase() === "admin";

  const isAdmin = role === "admin";

  /* ========================================================
     4) Route-level role checks
  ======================================================== */
  const isAdminRoute = pathname.startsWith("/admin");
  const isProducerStaffRoute = pathname.startsWith("/producer-staff");
  const isProducerRoute = pathname.startsWith("/producer");
  const isClientRoute = pathname.startsWith("/dashboard");

  // admin routes: רק admin
  if (isAdminRoute && !isAdmin) {
    return redirectToForbidden(req);
  }

  // producer-staff route: staff/producer_staff/producer/admin/impersonated-admin
  if (isProducerStaffRoute) {
    const isProducerStaff =
      role === "staff" ||
      role === "producer_staff" ||
      role === "staff_producer";

    if (!isProducerStaff && !isAdmin && role !== "producer" && !isImpersonatedAdminSession) {
      return redirectToForbidden(req);
    }
  }

  // producer route: producer/admin/impersonated-admin
  if (isProducerRoute && !isProducerStaffRoute) {
    const allowed = role === "producer" || isAdmin || isImpersonatedAdminSession;
    if (!allowed) return redirectToForbidden(req);
  }

  // client dashboard route: user/client/staff/producer/admin (לפי המערכת שלך)
  if (isClientRoute) {
    // אין חסימת role קשיחה כאן כדי לא לשבור זרימות קיימות
  }

  /* ========================================================
     5) Paid guard
     רק מי שאינו admin ואינו התחזות-admin חייב hasPaid===true
  ======================================================== */
  const requiresPaid =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/producer") ||
    pathname.startsWith("/producer-staff");

  if (requiresPaid && !isAdmin && !isImpersonatedAdminSession) {
    if (payload.hasPaid !== true) {
      return redirectToPricing(req);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/producer/:path*",
    "/producer-staff/:path*",
    "/admin/:path*",
  ],
};
