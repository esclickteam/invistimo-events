import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

/* ========================================================
   Helper – redirect
======================================================== */
function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

function redirectToPricing(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/pricing";
  return NextResponse.redirect(url);
}

/* ========================================================
   Middleware
======================================================== */
export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;
  const hostname = nextUrl.hostname;

  /* ========================================================
     0) NEVER gate API
  ======================================================== */
  if (pathname.startsWith("/api")) return NextResponse.next();

  /* ========================================================
     1) Public pages
  ======================================================== */
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/rsvp") ||
    pathname.startsWith("/seating-explained") ||
    pathname.startsWith("/event-management") ||
    pathname.startsWith("/set-password") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap")
  ) {
    return NextResponse.next();
  }

  /* ========================================================
     2) Force WWW (production only)
  ======================================================== */
  if (process.env.NODE_ENV === "production" && hostname === "invistimo.com") {
    const url = nextUrl.clone();
    url.hostname = "www.invistimo.com";
    return NextResponse.redirect(url);
  }

  /* ========================================================
     3) Read & VERIFY JWT
  ======================================================== */
  const token =
    cookies.get("authToken")?.value ||
    cookies.get("producerAuthToken")?.value ||
    cookies.get("adminAuthToken")?.value ||
    null;

  if (!token) return redirectToLogin(req);

  let decoded: any;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return redirectToLogin(req);
  }

  const role = decoded?.impersonationRole || decoded?.role || null;
  const staffType = decoded?.staffType || null;
  const hasDashboardAccess = decoded?.hasDashboardAccess ?? false;

  if (!role) return redirectToLogin(req);

  /* ========================================================
     🔐 Block dashboard if no access
  ======================================================== */

  if (pathname.startsWith("/dashboard")) {
    if (role !== "user") {
      return redirectToLogin(req);
    }

    // 👇 החסימה הקריטית
    if (!hasDashboardAccess) {
      return redirectToPricing(req);
    }
  }

  /* ========================================================
     4) Role-based route guards
  ======================================================== */

  // ================= PRODUCER =================
  if (
    pathname.startsWith("/producer") &&
    !pathname.startsWith("/producer-staff")
  ) {
    if (role !== "producer") {
      return redirectToLogin(req);
    }
  }

  // ================= PRODUCER STAFF =================
  if (pathname.startsWith("/producer-staff")) {
    if (
      role !== "producer_staff" &&
      !(role === "staff" && staffType === "producer_staff")
    ) {
      return redirectToLogin(req);
    }
  }

  // ================= ADMIN =================
  if (pathname.startsWith("/admin")) {
    if (role !== "admin") {
      return redirectToLogin(req);
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
