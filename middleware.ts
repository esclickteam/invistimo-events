import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

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
     2) Force WWW in production
  ======================================================== */
  if (process.env.NODE_ENV === "production" && hostname === "invistimo.com") {
    const url = nextUrl.clone();
    url.hostname = "www.invistimo.com";
    return NextResponse.redirect(url);
  }

  /* ========================================================
     3) Read auth cookies
  ======================================================== */
  const authToken = cookies.get("authToken")?.value || null;
  const producerToken = cookies.get("producerAuthToken")?.value || null;
  const adminToken = cookies.get("adminAuthToken")?.value || null;

  const isClientAuthed = Boolean(authToken);
  const isProducerAuthed = Boolean(producerToken);
  const isAdminAuthed = Boolean(adminToken);

  /* ========================================================
     4) Route guards
  ======================================================== */

  // Client dashboard
  if (pathname.startsWith("/dashboard")) {
    if (!isClientAuthed && !isProducerAuthed) {
      return redirectToLogin(req);
    }
  }

  // Producer routes
  if (pathname.startsWith("/producer")) {
    if (!isProducerAuthed) {
      return redirectToLogin(req);
    }
  }

  // Producer staff
  if (pathname.startsWith("/producer-staff")) {
    if (!isProducerAuthed) {
      return redirectToLogin(req);
    }
  }

  // Admin
  if (pathname.startsWith("/admin")) {
    if (!isAdminAuthed) {
      return redirectToLogin(req);
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
