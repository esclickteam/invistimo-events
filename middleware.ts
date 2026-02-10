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
     0) NEVER gate API here
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
  pathname.startsWith("/set-password") || // ✅ זה הקריטי
  pathname.startsWith("/_next") ||
  pathname.startsWith("/favicon") ||
  pathname.startsWith("/robots") ||
  pathname.startsWith("/sitemap")
) {
  return NextResponse.next(); // ⬅️ חשוב
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
     3) Read auth state
  ======================================================== */
  const token =
    cookies.get("authToken")?.value ||
    cookies.get("producerAuthToken")?.value ||
    cookies.get("adminAuthToken")?.value ||
    null;

  const isAuthed = Boolean(token);

  /* ========================================================
     4) Route guards
  ======================================================== */

  // Client
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthed) return redirectToLogin(req);
  }

  // Producer
  if (pathname.startsWith("/producer")) {
    if (!isAuthed) return redirectToLogin(req);
  }

  // 🆕 Producer Staff
  if (pathname.startsWith("/producer-staff")) {
    if (!isAuthed) return redirectToLogin(req);
  }

  // Admin
  if (pathname.startsWith("/admin")) {
    if (!isAuthed) return redirectToLogin(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/producer/:path*",
    "/producer-staff/:path*", // 🆕
    "/admin/:path*",
  ],
};
