import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* ========================================================
   HELPERS
======================================================== */
function clearAuthCookies(res: NextResponse) {
  const baseCookie = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  res.cookies.set("authToken", "", {
    ...baseCookie,
    httpOnly: true,
    maxAge: 0,
  });

  // תאימות לאחור אם קיים
  res.cookies.set("token", "", {
    ...baseCookie,
    httpOnly: true,
    maxAge: 0,
  });
}

/* ========================================================
   MIDDLEWARE
======================================================== */
export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;
  const hostname = nextUrl.hostname;

  /* ========================================================
     0️⃣ חריגות מוחלטות
  ======================================================== */
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  ) {
    return NextResponse.next();
  }

  /* ========================================================
     1️⃣ Stripe Webhook
  ======================================================== */
  if (
    pathname.startsWith("/api/stripe/webhook") ||
    hostname.includes("stripe")
  ) {
    return NextResponse.next();
  }

  /* ========================================================
     2️⃣ כפיית WWW
  ======================================================== */
  if (hostname === "invistimo.com") {
    const url = nextUrl.clone();
    url.hostname = "www.invistimo.com";
    return NextResponse.redirect(url);
  }

  /* ========================================================
     3️⃣ Auth – בדיקה בסיסית בלבד
  ======================================================== */
  const token =
    cookies.get("authToken")?.value ||
    cookies.get("token")?.value ||
    null;

  const hasStripeSession = nextUrl.searchParams.has("session_id");

  /* ========================================================
     🔐 חסימת אזורים מוגנים ללא token
  ======================================================== */
  if (
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/producers")) &&
    !token &&
    !hasStripeSession
  ) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    clearAuthCookies(res);
    return res;
  }

  /*
    ⚠️ שים לב:
    אין כאן יותר ניתוב לפי role.
    כל ניתוב role-based נעשה:
    - בשרת (guards)
    - ב-AuthContext (/api/me)
  */

  return NextResponse.next();
}

/* ========================================================
   MATCHER
======================================================== */
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/producers/:path*"],
};
