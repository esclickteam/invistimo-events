import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  // אופציונלי: לשמור לאן רצו להגיע
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;
  const hostname = nextUrl.hostname;

  /* ========================================================
     0) NEVER gate API here (API should return 401 JSON itself)
  ======================================================== */
  if (pathname.startsWith("/api")) return NextResponse.next();

  /* ========================================================
     1) Public pages (always allowed)
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
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap")
  ) {
    // continue, but still allow WWW enforcement below if needed
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
  const role = cookies.get("role")?.value || null;

  // אם את רוצה מקור אמת: מספיק "יש טוקן כלשהו"
  const token =
    cookies.get("producerAuthToken")?.value ||
    cookies.get("authToken")?.value ||
    null;

  const isAuthed = Boolean(token);

  /* ========================================================
     4) Route guards by role
  ======================================================== */

  // Client area
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthed) return redirectToLogin(req);
    // אם יש role — נוודא שזה client (או admin שמותר לו הכל)
    if (role && role !== "client" && role !== "admin") return redirectToLogin(req);
  }

  // Producer area
  if (pathname.startsWith("/producer")) {
    if (!isAuthed) return redirectToLogin(req);
    if (role && role !== "producer" && role !== "admin") return redirectToLogin(req);
  }

  // Admin area
  if (pathname.startsWith("/admin")) {
    if (!isAuthed) return redirectToLogin(req);
    if (role !== "admin") return redirectToLogin(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/producer/:path*",
    "/admin/:path*",
  ],
};
