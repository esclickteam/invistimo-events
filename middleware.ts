import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, decodeJwt } from "jose";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

type JwtPayloadShape = {
  userId?: string;
  id?: string;
  _id?: string;
  role?: string;
  exp?: number;

  // התחזות
  impersonated?: boolean;
  impersonationRole?: string; // "admin" | ...
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
  url.pathname = "/pricing";
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

function redirectToForbidden(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/";
  return NextResponse.redirect(url);
}

async function readJwtPayload(token: string): Promise<JwtPayloadShape | null> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return decodeJwt(token) as JwtPayloadShape;

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
export async function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;
  const hostname = nextUrl.hostname;

  // 0) לא לחסום API
  if (pathname.startsWith("/api")) return NextResponse.next();

  // 1) public
  if (isPublicPath(pathname)) return NextResponse.next();

  // 2) force www
  if (process.env.NODE_ENV === "production" && hostname === "invistimo.com") {
    const url = nextUrl.clone();
    url.hostname = "www.invistimo.com";
    return NextResponse.redirect(url);
  }

  // 3) token
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

  const payload = await readJwtPayload(token!);
  if (!payload) return redirectToLogin(req);

  const role = String(payload.role || "").toLowerCase();

  // התחזות admin
  const isImpersonatedAdminSession =
    payload.impersonated === true &&
    String(payload.impersonationRole || "").toLowerCase() === "admin";

  const isAdmin = role === "admin";

  // 4) route-level role checks
  const isAdminRoute = pathname.startsWith("/admin");
  const isProducerStaffRoute = pathname.startsWith("/producer-staff");
  const isProducerRoute = pathname.startsWith("/producer");
  const isClientRoute = pathname.startsWith("/dashboard");

  if (isAdminRoute && !isAdmin) return redirectToForbidden(req);

  if (isProducerStaffRoute) {
    const isProducerStaff =
      role === "staff" || role === "producer_staff" || role === "staff_producer";
    if (!isProducerStaff && !isAdmin && role !== "producer" && !isImpersonatedAdminSession) {
      return redirectToForbidden(req);
    }
  }

  if (isProducerRoute && !isProducerStaffRoute) {
    const allowed = role === "producer" || isAdmin || isImpersonatedAdminSession;
    if (!allowed) return redirectToForbidden(req);
  }

  if (isClientRoute) {
    // intentionally open by role in your current logic
  }

  // 5) paid guard — לפי DB בלבד
  const requiresPaid =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/producer") ||
    pathname.startsWith("/producer-staff");

  if (requiresPaid && !isAdmin && !isImpersonatedAdminSession) {
    const userId = payload.userId || payload.id || payload._id;
    if (!userId) return redirectToLogin(req);

    await connectDB();
    const dbUser = await User.findById(userId).select("hasPaid").lean();

    if (!dbUser) return redirectToLogin(req);
    if (dbUser.hasPaid !== true) return redirectToPricing(req);
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
