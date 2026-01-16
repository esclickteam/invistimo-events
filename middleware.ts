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

  // 🔐 auth token – מקור אמת יחיד
  res.cookies.set("authToken", "", {
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
     3️⃣ Auth – בדיקה בסיסית
  ======================================================== */
  const token = cookies.get("authToken")?.value ?? null;
  const hasStripeSession = nextUrl.searchParams.has("session_id");

  /* ========================================================
     🔐 חסימת אזורים מוגנים ללא התחברות
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
    ℹ️ אין כאן ניתוב לפי role
    כל Role Guard נעשה:
    - ב־API
    - ב־AuthContext (/api/me)
  */

  return NextResponse.next();
}

/* ========================================================
   MATCHER
======================================================== */
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/producers/:path*"],
};
