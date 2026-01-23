import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* ========================================================
   HELPERS
======================================================== */
function clearAuthCookies(res: NextResponse) {
  const cookieDomain =
    process.env.NODE_ENV === "production" ? ".invistimo.com" : undefined;

  const baseCookie = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    domain: cookieDomain,
  };

  const delHttpOnly = {
    ...baseCookie,
    httpOnly: true,
    maxAge: 0,
  };

  const delClient = {
    ...baseCookie,
    httpOnly: false,
    maxAge: 0,
  };

  // 🔐 TOKENS – חובה למחוק את כולם
  res.cookies.set("authToken", "", delHttpOnly);
  res.cookies.set("producerAuthToken", "", delHttpOnly);

  // 👤 STATE
  res.cookies.set("role", "", delClient);
  res.cookies.set("isTrial", "", delClient);
  res.cookies.set("trialExpiresAt", "", delClient);
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
     1️⃣ Stripe Webhook (חייב להיות לפני הכל)
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
  if (
    process.env.NODE_ENV === "production" &&
    hostname === "invistimo.com"
  ) {
    const url = nextUrl.clone();
    url.hostname = "www.invistimo.com";
    return NextResponse.redirect(url);
  }

  /* ========================================================
     3️⃣ Auth – מקור אמת יחיד
  ======================================================== */
  const authToken = cookies.get("authToken")?.value ?? null;
  const producerToken = cookies.get("producerAuthToken")?.value ?? null;

  // producer גובר אם קיים
  const token = producerToken ?? authToken;

  const hasStripeSession = nextUrl.searchParams.has("session_id");

  /* ========================================================
     🚨 מצב לא חוקי – שני טוקנים יחד
  ======================================================== */
  if (authToken && producerToken) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    clearAuthCookies(res);
    return res;
  }

  /* ========================================================
     🔐 חסימת אזורים מוגנים
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

  return NextResponse.next();
}

/* ========================================================
   MATCHER
======================================================== */
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/producers/:path*"],
};
