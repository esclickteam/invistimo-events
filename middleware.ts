import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, decodeJwt } from "jose";

type JwtPayloadShape = {
  userId?: string;
  role?: string;
  hasPaid?: boolean;
  exp?: number;
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
  // אם אצלך העמוד הוא /packages פשוט תחליפי ל- "/packages"
  url.pathname = "/pricing";
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

async function readJwtPayload(token: string): Promise<JwtPayloadShape | null> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // fallback decode בלבד אם אין secret (לא אידיאלי לפרודקשן)
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
  if (isPublicPath(pathname)) {
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
     3) Read auth state
  ======================================================== */
  const token =
    cookies.get("authToken")?.value ||
    cookies.get("producerAuthToken")?.value ||
    cookies.get("adminAuthToken")?.value ||
    null;

  const isAuthed = Boolean(token);

  /* ========================================================
     4) Route guards (Auth)
  ======================================================== */
  if (isProtectedDashboardPath(pathname) && !isAuthed) {
    return redirectToLogin(req);
  }

  /* ========================================================
     5) Paid guard (Business rule)
     מי שיש לו hasPaid=false לא יכול דשבורד
  ======================================================== */
  if (isProtectedDashboardPath(pathname) && token) {
    const payload = await readJwtPayload(token);

    // טוקן לא תקין / לא קריא => login
    if (!payload) return redirectToLogin(req);

    // הכלל שלך:
    if (payload.hasPaid === false) {
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
    // אם יש לך עוד נתיבי דשבורד, תוסיפי כאן
  ],
};
